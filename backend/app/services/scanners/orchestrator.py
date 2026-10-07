"""Assessment Orchestrator Engine for MediShield.

Coordinates multi-tool defensive scanning, finding normalization,
security posture score computation, and audit tracking.
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
    AuditLogModel,
    UserModel
)
from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding
from app.services.scanners.nmap_adapter import NmapAdapter
from app.services.scanners.nuclei_adapter import NucleiAdapter
from app.services.scanners.zap_adapter import ZapAdapter
from app.services.scanners.nikto_adapter import NiktoAdapter
from app.services.scanners.openvas_adapter import OpenVasAdapter
from app.services.scope_validator import scope_validator
from app.services.vuln_intel import vuln_intel_service
from app.services.risk_engine import risk_engine


class AssessmentOrchestrator:
    """Coordinates defensive tool execution and normalizes findings."""

    def __init__(self):
        self.adapters: Dict[str, BaseScannerAdapter] = {
            "nmap": NmapAdapter(),
            "nuclei": NucleiAdapter(),
            "zap": ZapAdapter(),
            "nikto": NiktoAdapter(),
            "openvas": OpenVasAdapter()
        }

    def get_tool_inventory(self) -> List[Dict[str, Any]]:
        """Returns the operational status and installation availability of all defensive tools."""
        inventory = []
        for name, adapter in self.adapters.items():
            info = adapter.check_availability()
            inventory.append({
                "name": name,
                "version": adapter.version,
                "status": info.get("status", "NOT_CONFIGURED"),
                "available": info.get("available", False),
                "path": info.get("path"),
                "message": info.get("message", "")
            })
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
        # 1. Validate Scope & Authorization
        scope, device = scope_validator.validate_execution_authorization(
            db=db,
            scope_id=scope_id,
            device_id=device_id,
            tools=tools,
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
            tools_executed=tools,
            started_at=now,
            created_at=now
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # 3. Execute tools
        all_findings: List[ScannerFinding] = []
        raw_results: Dict[str, Any] = {}

        device_context = {
            "id": device.id,
            "name": device.name,
            "device_type": device.device_type,
            "manufacturer": getattr(device, "manufacturer", "Generic"),
            "model": getattr(device, "model", "Model-1"),
            "ip_address": device.ip_address,
            "network_segment": device.network_segment
        }

        for tool_name in tools:
            tool_clean = tool_name.lower().strip()
            adapter = self.adapters.get(tool_clean)
            if not adapter:
                continue

            result: ScannerResult = adapter.execute(
                target_ip=device.ip_address,
                device_context=device_context
            )
            raw_results[tool_clean] = {
                "status": result.status,
                "execution_time_seconds": result.execution_time_seconds,
                "is_simulated": result.is_simulated,
                "findings_count": len(result.findings),
                "metadata": result.metadata
            }
            all_findings.extend(result.findings)

        # 4. Normalize, Enrich and Store Findings
        crit_count = 0
        high_count = 0
        med_count = 0
        low_count = 0
        finding_dicts: List[Dict[str, Any]] = []

        for sf in all_findings:
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
            else:
                low_count += 1

            finding_id = f"FND-{str(uuid.uuid4())[:8].upper()}"
            evidence = dict(sf.raw_evidence)
            if enriched.get("clinical_impact"):
                evidence["clinical_impact"] = enriched["clinical_impact"]

            fnd = FindingModel(
                id=finding_id,
                assessment_id=assessment.id,
                device_id=device.id,
                title=enriched["title"],
                description=enriched["description"],
                severity=sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else "INFO",
                category=enriched["category"],
                cve_id=enriched.get("cve_id"),
                cvss_score=enriched.get("cvss_score"),
                affected_port=sf.affected_port,
                affected_service=sf.affected_service,
                source_tool=sf.raw_evidence.get("source_tool", tools[0] if tools else "scanner"),
                remediation_guidance=enriched.get("remediation_guidance"),
                raw_evidence=evidence,
                created_at=datetime.now(timezone.utc)
            )
            db.add(fnd)

        # 5. Compute Security Posture Score using RiskEngine
        dept_val = getattr(device, "department", "General Ward") or "General Ward"
        risk_eval = risk_engine.evaluate_posture(
            device_id=device.id,
            device_type=device.device_type,
            department=dept_val,
            findings=finding_dicts
        )
        final_score = risk_eval.overall_score

        raw_results["risk_evaluation"] = {
            "subscores": risk_eval.subscores,
            "criticality_multiplier": risk_eval.criticality_multiplier,
            "department_multiplier": risk_eval.department_multiplier,
            "deductions": risk_eval.deductions,
            "recommendations": risk_eval.recommendations
        }

        # 6. Update Assessment & Device
        assessment.status = "COMPLETED"
        assessment.completed_at = datetime.now(timezone.utc)
        assessment.total_findings = len(all_findings)
        assessment.critical_findings = crit_count
        assessment.high_findings = high_count
        assessment.medium_findings = med_count
        assessment.low_findings = low_count
        assessment.security_score = final_score
        assessment.raw_results = raw_results
        assessment.summary = (
            f"Assessment completed across {len(tools)} tools on {device.name} ({device.ip_address}). "
            f"Identified {len(all_findings)} findings ({crit_count} Critical, {high_count} High, "
            f"{med_count} Medium, {low_count} Low). Resulting posture score: {final_score}/100 "
            f"(Network: {risk_eval.subscores['network_posture']}, Config: {risk_eval.subscores['configuration_posture']}, "
            f"Vuln: {risk_eval.subscores['vulnerability_posture']})."
        )

        device.security_score = final_score
        device.last_assessment = assessment.completed_at
        device.risk_level = risk_eval.risk_level.lower()
        if crit_count > 0 or high_count > 0:
            device.assessment_status = "REMEDIATION_REQUIRED"
        else:
            device.assessment_status = "ASSESSED"

        # 7. Audit Log
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
                "tools": tools,
                "security_score": final_score,
                "total_findings": len(all_findings)
            })
        )
        db.add(audit)

        db.commit()
        db.refresh(assessment)
        return assessment


orchestrator = AssessmentOrchestrator()
