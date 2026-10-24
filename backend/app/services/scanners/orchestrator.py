"""Assessment Orchestrator Engine for MediShield.

Coordinates multi-tool defensive scanning, native network probing, finding normalization,
security posture score computation, and audit tracking without fabricating scan results.
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.db_models import (
    DeviceModel,
    AssessmentScopeModel,
    AssessmentModel,
    FindingModel,
    SecurityEventModel,
    AuditLogModel,
    UserModel
)
from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory
from app.services.scanners.native_probe import NativeProbeAdapter
from app.services.scanners.nmap_adapter import NmapAdapter
from app.services.scanners.openvas_adapter import OpenVasAdapter
from app.services.scanners.nuclei_adapter import NucleiAdapter
from app.services.scanners.zap_adapter import ZapAdapter
from app.services.scanners.nikto_adapter import NiktoAdapter
from app.services.scanners.suricata_adapter import SuricataAdapter
from app.services.scanners.zeek_adapter import ZeekAdapter
from app.services.scanners.tshark_adapter import TSharkAdapter
from app.services.scanners.nvd_adapter import NvdAdapter
from app.services.scanners.trivy_adapter import TrivyAdapter
from app.services.scanners.lynis_adapter import LynisAdapter
from app.services.scanners.openscap_adapter import OpenSCAPAdapter
from app.services.scanners.syft_adapter import SyftAdapter
from app.services.scope_validator import scope_validator
from app.services.vuln_intel import vuln_intel_service
from app.services.risk_engine import risk_engine


class AssessmentOrchestrator:
    """Coordinates defensive tool execution and normalizes findings."""

    def __init__(self):
        self.adapters: Dict[str, BaseScannerAdapter] = {
            "native_probe": NativeProbeAdapter(),
            "nmap": NmapAdapter(),
            "openvas": OpenVasAdapter(),
            "nuclei": NucleiAdapter(),
            "zap": ZapAdapter(),
            "nikto": NiktoAdapter(),
            "suricata": SuricataAdapter(),
            "zeek": ZeekAdapter(),
            "tshark": TSharkAdapter(),
            "nvd_intel": NvdAdapter(),
            "trivy": TrivyAdapter(),
            "lynis": LynisAdapter(),
            "openscap": OpenSCAPAdapter(),
            "syft": SyftAdapter()
        }

    def get_tool_inventory(self) -> List[Dict[str, Any]]:
        """Returns the operational status and installation availability of all defensive tools."""
        inventory = []
        repo_mapping = {
            "nmap": "nmap_repo",
            "nuclei": "nuclei",
            "trivy": "trivy",
            "syft": "syft",
            "zap": "zap",
            "tshark": "wireshark",
            "suricata": "suricata",
            "zeek": "zeek",
            "lynis": "lynis",
            "openscap": "openscap",
            "openvas": "openvas",
            "nikto": "nikto"
        }

        for name, adapter in self.adapters.items():
            info = adapter.check_availability()
            repo_name = repo_mapping.get(name)
            repo_info = BaseScannerAdapter.get_repo_git_info(repo_name) if repo_name else None

            item = {
                "name": name,
                "display_name": getattr(adapter, "display_name", name),
                "category": getattr(adapter, "category", ToolCategory.CORE_DISCOVERY),
                "version": info.get("version", getattr(adapter, "version", "unknown")),
                "status": info.get("status", ToolStatus.NOT_CONFIGURED),
                "available": info.get("available", False),
                "is_remote": getattr(adapter, "is_remote", False),
                "configuration_status": info.get("configuration_status", ""),
                "supported_capabilities": getattr(adapter, "supported_capabilities", []),
                "last_health_check": info.get("last_health_check", datetime.now(timezone.utc).isoformat()),
                "path": info.get("path"),
                "message": info.get("message", "")
            }

            if repo_info and repo_info.get("cloned"):
                item["repository_integrated"] = True
                item["repository_path"] = repo_info.get("repo_path")
                item["git_commit"] = repo_info.get("commit")
                item["git_branch"] = repo_info.get("branch")
                item["git_origin"] = repo_info.get("origin")
                if repo_info.get("commit"):
                    extra = f" [Git Repo: {repo_info.get('commit')} ({repo_info.get('branch')})]"
                    if extra not in item["configuration_status"]:
                        item["configuration_status"] = (item["configuration_status"] + extra).strip()

            inventory.append(item)
        return inventory

    def execute_assessment(
        self,
        db: Session,
        scope_id: str,
        device_id: str,
        profile: str,
        tools: List[str],
        user: UserModel
    ) -> AssessmentModel:
        """Executes authorized defensive assessment and records normalized findings."""
        # Ensure at least native_probe is included for reliable, non-destructive network auditing
        effective_tools = list(tools)
        if "native_probe" not in [t.lower() for t in effective_tools]:
            effective_tools.insert(0, "native_probe")

        # 1. Validate Scope & Authorization
        scope, device = scope_validator.validate_execution_authorization(
            db=db,
            scope_id=scope_id,
            device_id=device_id,
            tools=effective_tools,
            user=user
        )

        now = datetime.now(timezone.utc)
        asm_id = f"ASM-{str(uuid.uuid4())[:8].upper()}"

        # 2. Create Assessment Record
        assessment = AssessmentModel(
            id=asm_id,
            scope_id=scope.id,
            device_id=device.id,
            target_ip=device.ip_address,
            status="RUNNING",
            profile=profile,
            tools_executed=effective_tools,
            started_at=now,
            created_at=now
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # 3. Execute tools
        all_findings: List[ScannerFinding] = []
        raw_results: Dict[str, Any] = {
            "tools_status": {},
            "execution_timeline": [
                {"event": "Assessment Initialized", "timestamp": now.isoformat(), "source": "MediShield Orchestrator"},
                {"event": "Scope Certificate Verified", "timestamp": now.isoformat(), "source": f"Scope {scope.id}"}
            ]
        }

        device_context = {
            "id": device.id,
            "name": device.name,
            "device_type": device.device_type,
            "manufacturer": getattr(device, "manufacturer", "Generic Medical"),
            "model": getattr(device, "model", "Standard Series"),
            "ip_address": device.ip_address,
            "network_segment": device.network_segment
        }

        completed_count = 0
        failed_count = 0
        not_evaluated_count = 0

        for tool_name in effective_tools:
            tool_clean = tool_name.lower().strip()
            adapter = self.adapters.get(tool_clean)
            if not adapter:
                raw_results["tools_status"][tool_clean] = {
                    "status": "NOT_EVALUATED",
                    "available": False,
                    "version": "unknown",
                    "execution_time_seconds": 0.0,
                    "findings_count": 0,
                    "error_message": f"Adapter '{tool_clean}' is not registered."
                }
                not_evaluated_count += 1
                continue

            tool_start = datetime.now(timezone.utc)
            raw_results["execution_timeline"].append({
                "event": f"Tool Execution Started: {tool_clean}",
                "timestamp": tool_start.isoformat(),
                "source": tool_clean
            })

            result: ScannerResult = adapter.execute(
                target_ip=device.ip_address,
                device_context=device_context
            )

            tool_end = datetime.now(timezone.utc)
            raw_results["execution_timeline"].append({
                "event": f"Tool Execution {result.status}: {tool_clean} ({len(result.findings)} findings)",
                "timestamp": tool_end.isoformat(),
                "source": tool_clean
            })

            raw_results["tools_status"][tool_clean] = {
                "status": result.status,
                "available": result.available,
                "version": adapter.version,
                "execution_time_seconds": result.execution_time_seconds,
                "findings_count": len(result.findings),
                "error_message": result.error_message,
                "raw_output_snippet": result.raw_output[:500] if result.raw_output else "",
                "metadata": result.metadata
            }

            if result.status == "COMPLETED":
                completed_count += 1
            elif result.status == "NOT_EVALUATED":
                not_evaluated_count += 1
            else:
                failed_count += 1

            all_findings.extend(result.findings)

        # 4. Determine Overall Assessment Status
        if completed_count > 0 and (failed_count == 0 and not_evaluated_count == 0):
            overall_status = "COMPLETED"
        elif completed_count > 0:
            overall_status = "PARTIALLY_COMPLETED"
        else:
            overall_status = "FAILED"

        # 5. Normalize, Enrich and Store Findings
        crit_count = 0
        high_count = 0
        med_count = 0
        low_count = 0
        info_count = 0
        finding_dicts: List[Dict[str, Any]] = []

        for idx, sf in enumerate(all_findings):
            raw_dict = {
                "title": sf.title,
                "description": sf.description,
                "severity": sf.severity,
                "category": sf.category,
                "cve_id": sf.cve_id,
                "cvss_score": sf.cvss_score,
                "remediation_guidance": sf.remediation_guidance
            }
            enriched = vuln_intel_service.enrich_finding(raw_dict)
            finding_dicts.append(enriched)

            sev = enriched["severity"].upper()
            if sev == "CRITICAL":
                crit_count += 1
            elif sev == "HIGH":
                high_count += 1
            elif sev == "MEDIUM":
                med_count += 1
            elif sev == "LOW":
                low_count += 1
            else:
                info_count += 1

            finding_id = f"FND-{str(uuid.uuid4())[:8].upper()}"
            evidence = dict(sf.raw_evidence)
            if enriched.get("clinical_impact"):
                evidence["clinical_impact"] = enriched["clinical_impact"]

            # Explicit verification & source distinction
            verification_status = evidence.get("verification_status")
            if not verification_status:
                if sev in ["CRITICAL", "HIGH"] and sf.cve_id:
                    verification_status = "Confirmed Vulnerability"
                elif sev == "INFO":
                    verification_status = "Observation"
                else:
                    verification_status = "Observation"
            evidence["verification_status"] = verification_status

            source_type = evidence.get("source_type", "Scanner finding")
            evidence["source_type"] = source_type
            evidence["finding_status"] = evidence.get("finding_status", "Open")
            evidence["impact"] = enriched.get("clinical_impact") or "Configuration observation; review clinical risk posture."

            fnd = FindingModel(
                id=finding_id,
                assessment_id=assessment.id,
                device_id=device.id,
                title=enriched["title"],
                description=enriched["description"],
                severity=sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] else "INFO",
                category=enriched["category"],
                cve_id=enriched.get("cve_id"),
                cvss_score=enriched.get("cvss_score"),
                affected_port=sf.affected_port,
                affected_service=sf.affected_service or "HTTP",
                source_tool=evidence.get("source_tool", effective_tools[0]),
                remediation_guidance=enriched.get("remediation_guidance"),
                raw_evidence=evidence,
                created_at=datetime.now(timezone.utc)
            )
            db.add(fnd)

            # Automatically persist Security Event for High and Critical verified findings
            if sev in ["CRITICAL", "HIGH"] and verification_status == "Confirmed Vulnerability":
                existing_evt = db.query(SecurityEventModel).filter(
                    SecurityEventModel.device_id == device.id,
                    SecurityEventModel.rule_name == enriched["title"],
                    SecurityEventModel.status.in_(["open", "investigating"])
                ).first()
                if not existing_evt:
                    evt_id = f"EVT-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
                    sec_evt = SecurityEventModel(
                        id=evt_id,
                        timestamp=datetime.now(timezone.utc),
                        device_id=device.id,
                        event_type="ASSESSMENT_FINDING",
                        severity=sev.lower(),
                        rule_id=enriched.get("cve_id") or f"RULE-{sf.category.upper()}",
                        rule_name=enriched["title"],
                        evidence={
                            "assessment_id": assessment.id,
                            "finding_id": finding_id,
                            "cvss_score": enriched.get("cvss_score"),
                            "affected_port": sf.affected_port,
                            "affected_service": sf.affected_service,
                            "description": enriched["description"]
                        },
                        suggested_action=enriched.get("remediation_guidance") or "Investigate and apply vendor patch.",
                        status="open",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(sec_evt)

        # 6. Compute Security Posture Score using RiskEngine (Honest evaluation)
        if overall_status == "FAILED":
            final_score = 0.0
            summary_text = (
                f"Assessment FAILED. All selected external tools failed or were not installed on host. "
                f"No defensive checks could be validated against {device.name} ({device.ip_address}). "
                f"Never display an empty or failed scan as proof that a device is secure."
            )
            device.assessment_status = "FAILED"
            device.security_score = 0.0
        else:
            dept_val = getattr(device, "department", "General Ward") or "General Ward"
            risk_eval = risk_engine.evaluate_posture(
                device_id=device.id,
                device_type=device.device_type,
                department=dept_val,
                findings=finding_dicts
            )
            final_score = risk_eval.overall_score
            summary_text = (
                f"Assessment {overall_status.lower()} across {len(effective_tools)} defensive tools on {device.name} ({device.ip_address}). "
                f"Recorded {len(all_findings)} observations ({crit_count} Critical, {high_count} High, "
                f"{med_count} Medium, {low_count} Low, {info_count} Informational). Posture score: {final_score:.1f}/100. "
                f"{completed_count} tools completed, {not_evaluated_count} not evaluated, {failed_count} failed."
            )
            device.security_score = final_score
            device.last_assessment = datetime.now(timezone.utc)
            device.risk_level = risk_eval.risk_level.lower()
            if crit_count > 0 or high_count > 0:
                device.assessment_status = "REMEDIATION_REQUIRED"
            else:
                device.assessment_status = "ASSESSED"

            raw_results["risk_evaluation"] = {
                "subscores": risk_eval.subscores,
                "criticality_multiplier": risk_eval.criticality_multiplier,
                "department_multiplier": risk_eval.department_multiplier,
                "deductions": risk_eval.deductions,
                "recommendations": risk_eval.recommendations
            }

        # 7. Update Assessment Record
        assessment.status = overall_status
        assessment.completed_at = datetime.now(timezone.utc)
        assessment.total_findings = len(all_findings)
        assessment.critical_findings = crit_count
        assessment.high_findings = high_count
        assessment.medium_findings = med_count
        assessment.low_findings = low_count
        assessment.security_score = final_score
        assessment.raw_results = raw_results
        assessment.summary = summary_text

        raw_results["execution_timeline"].append({
            "event": f"Assessment Finished ({overall_status})",
            "timestamp": assessment.completed_at.isoformat(),
            "source": "MediShield Orchestrator"
        })

        # 8. Audit Log
        audit = AuditLogModel(
            id=str(uuid.uuid4()),
            actor=user.email,
            role=user.role,
            action="ASSESSMENT_EXECUTED",
            entity_type="Assessment",
            entity_id=assessment.id,
            ip_address="127.0.0.1",
            details=json.dumps({
                "device_id": device.id,
                "scope_id": scope.id,
                "tools": effective_tools,
                "status": overall_status,
                "security_score": final_score,
                "total_findings": len(all_findings)
            })
        )
        db.add(audit)

        db.commit()
        db.refresh(assessment)
        return assessment


orchestrator = AssessmentOrchestrator()
