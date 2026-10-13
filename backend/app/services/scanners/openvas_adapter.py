"""OpenVAS / Greenbone Vulnerability Management (GVM) Adapter for MediShield.

Integrates with OpenVAS / Greenbone GMP daemon if available.
If not configured, returns honest NOT_EVALUATED status without generating fake results.
"""

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
        return ScannerResult(
            tool_name=self.tool_name,
            status="NOT_EVALUATED",
            target_ip=target_ip,
            available=False,
            execution_time_seconds=0.0,
            findings=[],
            raw_output="",
            error_message="OpenVAS / Greenbone daemon is not configured. Enterprise NVT vulnerability tests were not evaluated.",
            is_simulated=False,
            metadata={"reason": "DAEMON_NOT_CONFIGURED", "limitations": "OpenVAS not deployed."}
        )
