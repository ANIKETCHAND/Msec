"""OpenVAS / Greenbone Vulnerability Management (GVM) Adapter for MediShield."""

import os
import time
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class OpenVasAdapter(BaseScannerAdapter):
    """Adapter for OpenVAS / Greenbone GMP socket or API."""

    tool_name = "openvas"
    version = "22.4"

    def __init__(self, gmp_host: Optional[str] = None):
        self.gmp_host = gmp_host or os.getenv("OPENVAS_HOST", "127.0.0.1")

    def check_availability(self) -> Dict[str, Any]:
        # OpenVAS daemon is typically a Unix daemon socket or GMP protocol
        return {
            "tool": self.tool_name,
            "available": False,
            "status": "NOT_CONFIGURED",
            "path": self.gmp_host,
            "message": "OpenVAS / Greenbone GMP daemon is not configured on this host."
        }

    def execute(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> ScannerResult:
        start_time = time.time()
        findings = [
            ScannerFinding(
                title="NVT: Medical Device Telnet / Plaintext Console Access",
                description="Network Vulnerability Test detected an unencrypted remote maintenance daemon on administrative port.",
                severity="HIGH",
                category="NETWORK",
                affected_port=23,
                affected_service="telnet",
                remediation_guidance="Disable Telnet; mandate SSHv2 with certificate authentication.",
                raw_evidence={"nvt_oid": "1.3.6.1.4.1.25623.1.0.100001"}
            )
        ]
        msg = "OpenVAS is not configured on host system. Simulated IoMT defensive scan telemetry applied."
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
