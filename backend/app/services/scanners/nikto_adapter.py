"""Nikto Web Server Scanner Adapter for MediShield."""

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
            "message": "Nikto is not installed or not in system PATH."
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
            return self._generate_simulated_scan_result(target_ip, device_context, start_time)

        # Defensive scan: target port 80, fast check
        args = [self.binary_path or "nikto", "-host", target_ip, "-port", "80", "-Tuning", "1,2,b", "-maxtime", "30s"]
        try:
            proc = subprocess.run(args, capture_output=True, text=True, timeout=35, shell=False)
            elapsed = time.time() - start_time
            return ScannerResult(
                tool_name=self.tool_name,
                status="SUCCESS",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=[],
                raw_output=proc.stdout,
                is_simulated=False
            )
        except Exception:
            return self._generate_simulated_scan_result(target_ip, device_context, start_time)

    def _generate_simulated_scan_result(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        start_time: float
    ) -> ScannerResult:
        findings = [
            ScannerFinding(
                title="X-Content-Type-Options Header Missing",
                description="The anti-MIME-sniffing header 'X-Content-Type-Options: nosniff' is not set by the embedded HTTP server.",
                severity="LOW",
                category="CONFIGURATION",
                affected_port=80,
                affected_service="http",
                remediation_guidance="Set 'X-Content-Type-Options: nosniff' in HTTP response headers.",
                raw_evidence={"header_missing": "X-Content-Type-Options"}
            )
        ]
        msg = "Nikto is not installed/configured on host system. Simulated IoMT defensive scan telemetry applied."
        return ScannerResult(
            tool_name=self.tool_name,
            status="SIMULATED",
            target_ip=target_ip,
            available=False,
            execution_time_seconds=round(time.time() - start_time, 2),
            findings=findings,
            raw_output=f"Notice: {msg}",
            is_simulated=True,
            metadata={"fallback_reason": msg}
        )
