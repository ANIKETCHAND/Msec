"""Nuclei Defensive Vulnerability Scanner Adapter for MediShield.

Executes scoped template-based vulnerability checks.
If Nuclei is not installed on the system, returns honest NOT_EVALUATED status
without fabricating results.
"""

import os
import shutil
import subprocess
import time
import json
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory


class NucleiAdapter(BaseScannerAdapter):
    """Adapter for Nuclei vulnerability scanner."""

    tool_name = "nuclei"
    display_name = "Nuclei CVE and Template Scanner"
    category = ToolCategory.VULNERABILITY_ASSESSMENT
    version = "v3.x"
    is_remote = False
    supported_capabilities = [
        "CVE_DETECTION",
        "TEMPLATE_AUDITING",
        "MISCONFIGURATION_CHECKS",
        "JSONL_PARSING"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path
        self._detected_version = None

    def _resolve_binary(self) -> Optional[str]:
        candidate = self.binary_path or os.getenv("NUCLEI_PATH")
        if candidate:
            if os.path.isfile(candidate) or shutil.which(candidate):
                return candidate
            return None
        return self.resolve_project_binary("nuclei")

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self._resolve_binary()
        if path:
            try:
                proc = subprocess.run([path, "-version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"Nuclei Engine Version:\s*v?([0-9\.]+)", output, re.IGNORECASE) or re.search(r"v([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        path = self._resolve_binary()
        if path:
            v = self.get_version()
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": v,
                "status": ToolStatus.AVAILABLE,
                "available": True,
                "is_remote": False,
                "configuration_status": f"Binary detected at {path}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": path,
                "message": f"Nuclei CVE and Template Scanner is operational (version {v})."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.NOT_INSTALLED,
            "available": False,
            "is_remote": False,
            "configuration_status": "Executable not found in system PATH or NUCLEI_PATH",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": None,
            "message": "Nuclei is not installed or not configured in system PATH."
        }

    def execute(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> ScannerResult:
        start_time = time.time()
        avail = self.check_availability()

        if not avail["available"]:
            return ScannerResult(
                tool_name=self.tool_name,
                status="NOT_EVALUATED",
                target_ip=target_ip,
                available=False,
                execution_time_seconds=0.0,
                findings=[],
                raw_output="",
                error_message="Nuclei binary is not installed in system PATH. Template-based vulnerability checks were not evaluated.",
                coverage_limitations=[
                    "Nuclei binary missing from host environment. Template-based CVE and configuration checks were not evaluated.",
                    "Unevaluated status must never be interpreted as proof that target device is secure."
                ],
                is_simulated=False,
                metadata={"reason": "TOOL_NOT_INSTALLED", "limitations": "Binary not found on host."}
            )

        # Defensive scan: safe informational templates, rate limited (-rl 10)
        target_url = f"http://{target_ip}"
        binary_exec = avail.get("path") or "nuclei"
        args = [
            binary_exec,
            "-target", target_url,
            "-tags", "cve,misconfiguration,ssl",
            "-rate-limit", "10",
            "-timeout", "10",
            "-json-export", "-",
            "-silent"
        ]

        try:
            proc = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=45,
                shell=False
            )
            elapsed = time.time() - start_time
            findings: List[ScannerFinding] = []

            if proc.returncode == 0 and proc.stdout:
                for line in proc.stdout.strip().split("\n"):
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                        info = item.get("info", {})
                        sev = info.get("severity", "info").upper()
                        classification = info.get("classification", {})
                        cve_id = classification.get("cve-id")
                        if isinstance(cve_id, list) and cve_id:
                            cve_id = cve_id[0]

                        cvss_score = classification.get("cvss-score")
                        if cvss_score is not None:
                            try:
                                cvss_score = float(cvss_score)
                            except (ValueError, TypeError):
                                cvss_score = None

                        # Do not interpret a template match as proof of exploitability unless evidence supports it
                        if sev in ["CRITICAL", "HIGH"] and cve_id:
                            verification = "Unverified Candidate"
                        elif sev == "INFO":
                            verification = "Observation"
                        else:
                            verification = "Observation"

                        findings.append(ScannerFinding(
                            title=info.get("name", "Vulnerability Detected"),
                            description=info.get("description", "Nuclei template match observed."),
                            severity=sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] else "INFO",
                            category="VULNERABILITY",
                            cve_id=cve_id,
                            cvss_score=cvss_score,
                            affected_port=80,
                            affected_service="HTTP",
                            remediation_guidance=info.get("remediation", "Review vendor advisory and update software."),
                            verification_status=verification,
                            raw_evidence={
                                "template_id": item.get("template-id"),
                                "matched_at": item.get("matched-at"),
                                "type": item.get("type"),
                                "source_tool": "nuclei",
                                "verification_status": verification
                            }
                        ))
                    except json.JSONDecodeError:
                        continue

                return ScannerResult(
                    tool_name=self.tool_name,
                    status="COMPLETED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=findings,
                    raw_output=proc.stdout[:4000],
                    exit_code=proc.returncode,
                    coverage_limitations=[
                        "Execution restricted to non-intrusive cve, misconfiguration, and ssl template tags with safe rate-limiting."
                    ],
                    is_simulated=False,
                    metadata={"target_url": target_url, "findings_count": len(findings)}
                )
            else:
                return ScannerResult(
                    tool_name=self.tool_name,
                    status="FAILED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=[],
                    raw_output=proc.stderr or proc.stdout or "",
                    exit_code=proc.returncode,
                    error_message=f"Nuclei execution failed (code {proc.returncode}): {proc.stderr.strip() or 'Target unreachable or probe rejected'}",
                    is_simulated=False,
                    metadata={"reason": "SCAN_FAILED"}
                )

        except subprocess.TimeoutExpired:
            elapsed = time.time() - start_time
            return ScannerResult(
                tool_name=self.tool_name,
                status="FAILED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=[],
                raw_output="",
                error_message="Nuclei probe timed out after 45 seconds.",
                is_simulated=False,
                metadata={"reason": "TIMEOUT"}
            )
        except Exception as e:
            elapsed = time.time() - start_time
            return ScannerResult(
                tool_name=self.tool_name,
                status="FAILED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=[],
                raw_output="",
                error_message=f"Nuclei execution exception: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXCEPTION"}
            )
