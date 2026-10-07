"""OWASP ZAP Defensive Web Scanner Adapter for MediShield.

Interacts with OWASP ZAP API daemon or provides structured defensive IoMT web posture simulation.
"""

import os
import time
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class ZapAdapter(BaseScannerAdapter):
    """Adapter for OWASP ZAP API or local scanner daemon."""

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
            "message": "OWASP ZAP API service is not reachable on local port 8080."
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

        # In production with live ZAP daemon, invoke passive scan view
        try:
            target_url = f"http://{target_ip}"
            query = urllib.parse.urlencode({"url": target_url, "apikey": self.api_key})
            req = urllib.request.Request(f"{self.zap_url}/JSON/alert/view/alertsByRisk/?{query}")
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = time.time() - start_time
                findings: List[ScannerFinding] = []
                if resp.status == 200:
                    alerts_data = json.loads(resp.read().decode("utf-8")).get("alertsByRisk", [])
                for risk_bucket in alerts_data:
                    for alert in risk_bucket.get("alerts", []):
                        findings.append(ScannerFinding(
                            title=alert.get("alert", "Web Alert"),
                            description=alert.get("description", "ZAP passive alert"),
                            severity=alert.get("risk", "Low").upper(),
                            category="SSL/TLS" if "ssl" in alert.get("alert", "").lower() else "CONFIGURATION",
                            affected_port=80,
                            affected_service="http",
                            remediation_guidance=alert.get("solution", "Review web headers."),
                            raw_evidence=alert
                        ))

            return ScannerResult(
                tool_name=self.tool_name,
                status="SUCCESS" if findings else "SIMULATED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=findings or self._generate_simulated_scan_result(target_ip, device_context, start_time).findings,
                raw_output=alerts_resp.text,
                is_simulated=False if findings else True,
                metadata={"target": target_ip}
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
                title="Missing Anti-Clickjacking Header (X-Frame-Options)",
                description="The medical device embedded portal does not declare X-Frame-Options, making clinical controls vulnerable to framing.",
                severity="MEDIUM",
                category="CONFIGURATION",
                affected_port=80,
                affected_service="http",
                remediation_guidance="Add 'X-Frame-Options: DENY' or 'Content-Security-Policy: frame-ancestors 'none'' response header.",
                raw_evidence={"header_missing": "X-Frame-Options"}
            ),
            ScannerFinding(
                title="Strict-Transport-Security (HSTS) Header Not Enforced",
                description="HTTP Strict Transport Security is absent, permitting protocol downgrade from HTTPS to unencrypted HTTP.",
                severity="MEDIUM",
                category="SSL/TLS",
                affected_port=443,
                affected_service="https",
                remediation_guidance="Configure HSTS with max-age=31536000 and includeSubDomains.",
                raw_evidence={"header_missing": "Strict-Transport-Security"}
            )
        ]

        msg = "OWASP ZAP is not connected/configured on host system. Simulated IoMT defensive scan telemetry applied."

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
