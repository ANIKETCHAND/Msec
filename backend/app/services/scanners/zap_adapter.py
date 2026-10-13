"""OWASP ZAP Defensive Web Scanner Adapter for MediShield.

Interacts with OWASP ZAP API daemon if available. If not configured, returns
honest NOT_EVALUATED status without generating fake results.
"""

import os
import time
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class ZapAdapter(BaseScannerAdapter):
    """Adapter for OWASP ZAP API daemon."""

    tool_name = "zap"
    version = "2.14.x"

    def __init__(self, zap_url: Optional[str] = None, api_key: Optional[str] = None):
        self.zap_url = zap_url or os.getenv("ZAP_URL", "http://127.0.0.1:8080")
        self.api_key = api_key or os.getenv("ZAP_API_KEY", "")

    def check_availability(self) -> Dict[str, Any]:
        try:
            req = urllib.request.Request(f"{self.zap_url}/JSON/core/view/version/")
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    v = data.get("version", "unknown")
                    return {
                        "tool": self.tool_name,
                        "available": True,
                        "status": "AVAILABLE",
                        "path": self.zap_url,
                        "message": f"OWASP ZAP API service available (version {v})"
                    }
        except Exception:
            pass
        return {
            "tool": self.tool_name,
            "available": False,
            "status": "NOT_CONFIGURED",
            "path": self.zap_url,
            "message": "OWASP ZAP API daemon is not reachable on local port 8080."
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
                error_message="OWASP ZAP daemon is not configured or reachable. Web application checks were not evaluated.",
                is_simulated=False,
                metadata={"reason": "DAEMON_NOT_REACHABLE", "limitations": "ZAP daemon offline."}
            )

        try:
            target_url = f"http://{target_ip}"
            query = urllib.parse.urlencode({"url": target_url, "apikey": self.api_key})
            req = urllib.request.Request(f"{self.zap_url}/JSON/alert/view/alertsByRisk/?{query}")
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = time.time() - start_time
                findings: List[ScannerFinding] = []
                alerts_data = []
                if resp.status == 200:
                    raw_text = resp.read().decode("utf-8")
                    alerts_data = json.loads(raw_text).get("alertsByRisk", [])

                for risk_bucket in alerts_data:
                    for alert in risk_bucket.get("alerts", []):
                        findings.append(ScannerFinding(
                            title=alert.get("alert", "Web Alert"),
                            description=alert.get("description", "ZAP passive alert"),
                            severity=alert.get("risk", "Low").upper(),
                            category="SSL/TLS" if "ssl" in alert.get("alert", "").lower() else "CONFIGURATION",
                            affected_port=80,
                            affected_service="HTTP",
                            remediation_guidance=alert.get("solution", "Review web application configuration."),
                            raw_evidence={
                                "source_tool": "zap",
                                "verification_status": "Observation",
                                "raw_alert": alert
                            }
                        ))

                return ScannerResult(
                    tool_name=self.tool_name,
                    status="COMPLETED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=findings,
                    raw_output=f"ZAP queried successfully. {len(findings)} alerts found.",
                    is_simulated=False,
                    metadata={"target": target_ip, "alerts_count": len(findings)}
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
                error_message=f"OWASP ZAP API query error: {str(e)}",
                is_simulated=False,
                metadata={"reason": "API_ERROR"}
            )
