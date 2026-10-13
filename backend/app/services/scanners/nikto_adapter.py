"""Nikto Web Server Scanner Adapter for MediShield.

Executes non-destructive web server and configuration reconnaissance.
If Nikto is not installed on the system, returns honest NOT_EVALUATED status
without fabricating results.
"""

import shutil
import subprocess
import time
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class NiktoAdapter(BaseScannerAdapter):
    """Adapter for Nikto web server scanner."""

    tool_name = "nikto"
    version = "2.1.6"

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or shutil.which("nikto") or shutil.which("nikto.pl")

    def check_availability(self) -> Dict[str, Any]:
        path = shutil.which("nikto") or shutil.which("nikto.pl")
        if path:
            return {
                "tool": self.tool_name,
                "available": True,
                "status": "AVAILABLE",
                "path": path,
                "message": f"Nikto scanner detected at {path}"
            }
        return {
            "tool": self.tool_name,
            "available": False,
            "status": "NOT_INSTALLED",
            "path": None,
            "message": "Nikto is not installed or not configured in system PATH."
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
                error_message="Nikto binary is not installed in system PATH. Web server checks were not evaluated.",
                is_simulated=False,
                metadata={"reason": "TOOL_NOT_INSTALLED", "limitations": "Binary not found on host."}
            )

        # Defensive scan: target port 80/443, fast check
        port = str(options.get("port", 80)) if options else "80"
        args = [
            self.binary_path or "nikto",
            "-host", target_ip,
            "-port", port,
            "-Tuning", "1,2,b",
            "-maxtime", "30s"
        ]

        try:
            proc = subprocess.run(args, capture_output=True, text=True, timeout=35, shell=False)
            elapsed = time.time() - start_time

            findings: List[ScannerFinding] = []
            output = proc.stdout or ""

            # Real output parsing
            if "+ Server:" in output:
                server_line = [l for l in output.splitlines() if "+ Server:" in l][0]
                findings.append(ScannerFinding(
                    title=f"Server Platform Header Disclosed: {server_line.split('+ Server:')[1].strip()}",
                    description=f"Nikto observed: {server_line.strip()}",
                    severity="LOW",
                    category="CONFIGURATION",
                    affected_port=int(port),
                    affected_service="HTTP",
                    remediation_guidance="Minimize identifying server header banners in responses.",
                    raw_evidence={"raw_line": server_line, "source_tool": "nikto", "verification_status": "Observation"}
                ))

            if "+ The anti-clickjacking X-Frame-Options header is not present" in output:
                findings.append(ScannerFinding(
                    title="X-Frame-Options Header Not Present",
                    description="The anti-clickjacking X-Frame-Options header is not present on the web server response.",
                    severity="LOW",
                    category="CONFIGURATION",
                    affected_port=int(port),
                    affected_service="HTTP",
                    remediation_guidance="Configure 'X-Frame-Options: SAMEORIGIN' to defend against clickjacking.",
                    raw_evidence={"source_tool": "nikto", "verification_status": "Observation"}
                ))

            status_str = "COMPLETED" if proc.returncode == 0 else "PARTIALLY_COMPLETED"
            return ScannerResult(
                tool_name=self.tool_name,
                status=status_str,
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=findings,
                raw_output=output,
                is_simulated=False,
                metadata={"port": port}
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
                error_message="Nikto scan timed out after 35 seconds.",
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
                error_message=f"Nikto execution error: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXCEPTION"}
            )
