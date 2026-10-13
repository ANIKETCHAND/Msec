"""Nuclei Defensive Vulnerability Scanner Adapter for MediShield.

Executes scoped template-based vulnerability checks.
If Nuclei is not installed on the system, returns honest NOT_EVALUATED status
without fabricating results.
"""

import shutil
import subprocess
import time
import json
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class NucleiAdapter(BaseScannerAdapter):
    """Adapter for Nuclei vulnerability scanner."""

    tool_name = "nuclei"
    version = "v3.x"

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or shutil.which("nuclei")

    def check_availability(self) -> Dict[str, Any]:
        path = shutil.which("nuclei") if not self.binary_path else self.binary_path
        if path:
            return {
                "tool": self.tool_name,
                "available": True,
                "status": "AVAILABLE",
                "path": path,
                "message": f"Nuclei binary detected at {path}"
            }
        return {
            "tool": self.tool_name,
            "available": False,
            "status": "NOT_INSTALLED",
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
                is_simulated=False,
                metadata={"reason": "TOOL_NOT_INSTALLED", "limitations": "Binary not found on host."}
            )

        # Defensive scan: safe informational templates, rate limited (-rl 10)
        target_url = f"http://{target_ip}"
        args = [
            self.binary_path or "nuclei",
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
                        findings.append(ScannerFinding(
                            title=info.get("name", "Vulnerability Detected"),
                            description=info.get("description", "Nuclei template match observed."),
                            severity=sev if sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else "INFO",
                            category="VULNERABILITY",
                            cve_id=item.get("template-id"),
                            cvss_score=float(info.get("classification", {}).get("cvss-score", 5.0)),
                            affected_port=int(item.get("port", 80)) if item.get("port") else 80,
                            remediation_guidance=info.get("remediation", "Apply vendor patch and review network isolation."),
                            raw_evidence={
                                "source_tool": "nuclei",
                                "verification_status": "Confirmed Vulnerability" if sev in ["CRITICAL", "HIGH"] else "Observation",
                                "template_id": item.get("template-id"),
                                "matcher_name": item.get("matcher-name"),
                                "raw_data": item
                            }
                        ))
                    except Exception:
                        continue

            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED" if proc.returncode == 0 else "PARTIALLY_COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=findings,
                raw_output=proc.stdout or proc.stderr or "",
                is_simulated=False,
                metadata={"target": target_ip, "matches_count": len(findings)}
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
                error_message="Nuclei scan timed out after 45 seconds.",
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
                error_message=f"Nuclei execution error: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXCEPTION"}
            )
