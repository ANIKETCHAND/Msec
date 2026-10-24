"""OWASP ZAP Defensive Web Scanner Adapter for MediShield.

Interacts with configured OWASP ZAP API daemon (local or remote).
Supports strictly scoped passive web and API inspections.
Clearly distinguishes passive assessment from intrusive active scanning.
If not configured or unreachable, returns honest status without fabricating results.
"""

import os
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory


class ZapAdapter(BaseScannerAdapter):
    """Adapter for OWASP ZAP API daemon."""

    tool_name = "zap"
    display_name = "OWASP ZAP Web Scanner"
    category = ToolCategory.WEB_ASSESSMENT
    version = "2.14.x"
    is_remote = True
    supported_capabilities = [
        "PASSIVE_WEB_AUDIT",
        "ACTIVE_WEB_SCAN",
        "HEADER_SECURITY_CHECK",
        "API_SECURITY_ASSESSMENT"
    ]

    def __init__(self, zap_url: Optional[str] = None, api_key: Optional[str] = None):
        self.zap_url = zap_url or os.getenv("ZAP_URL", "http://127.0.0.1:8080")
        self.api_key = api_key or os.getenv("ZAP_API_KEY", "")
        self._detected_version = None

    def check_availability(self) -> Dict[str, Any]:
        """Probes the configured OWASP ZAP daemon REST API."""
        try:
            req_url = f"{self.zap_url}/JSON/core/view/version/"
            if self.api_key:
                req_url += f"?apikey={urllib.parse.quote(self.api_key)}"
            req = urllib.request.Request(req_url)
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    v = data.get("version", self.version)
                    self._detected_version = v
                    return {
                        "name": self.tool_name,
                        "display_name": self.display_name,
                        "category": self.category,
                        "version": v,
                        "status": ToolStatus.AVAILABLE,
                        "available": True,
                        "is_remote": True,
                        "configuration_status": f"ZAP API daemon reachable at {self.zap_url}",
                        "supported_capabilities": self.supported_capabilities,
                        "last_health_check": datetime.now(timezone.utc).isoformat(),
                        "path": self.zap_url,
                        "message": f"OWASP ZAP daemon is operational (version {v})."
                    }
        except urllib.error.HTTPError as e:
            if e.code in [401, 403]:
                return {
                    "name": self.tool_name,
                    "display_name": self.display_name,
                    "category": self.category,
                    "version": self.version,
                    "status": ToolStatus.NOT_AUTHENTICATED,
                    "available": False,
                    "is_remote": True,
                    "configuration_status": f"Authentication required (HTTP {e.code}). Invalid or missing ZAP_API_KEY.",
                    "supported_capabilities": self.supported_capabilities,
                    "last_health_check": datetime.now(timezone.utc).isoformat(),
                    "path": self.zap_url,
                    "message": f"OWASP ZAP responded with HTTP {e.code}. Check ZAP_API_KEY."
                }
        except Exception as e:
            pass

        repo_info = self.get_repo_git_info("zap")
        if repo_info.get("cloned"):
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": self.version,
                "status": ToolStatus.NOT_CONFIGURED,
                "available": False,
                "is_remote": True,
                "configuration_status": f"OWASP ZAP repository integrated at {repo_info['repo_path']} (commit {repo_info['commit']}). Daemon not running on {self.zap_url}.",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": repo_info["repo_path"],
                "message": f"OWASP ZAP git repository integrated (commit {repo_info['commit']}). Start daemon with zap.bat -daemon to enable live API assessment."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.UNREACHABLE if "127.0.0.1" not in self.zap_url else ToolStatus.NOT_CONFIGURED,
            "available": False,
            "is_remote": True,
            "configuration_status": f"Daemon not reachable at {self.zap_url}",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": self.zap_url,
            "message": f"OWASP ZAP API daemon is not reachable on {self.zap_url}. Start ZAP in daemon mode (`zap.sh -daemon -port 8080`)."
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
                error_message=avail["message"],
                coverage_limitations=[
                    f"OWASP ZAP integration status is {avail['status']}. Web application security auditing was not evaluated.",
                    "Unevaluated status must never be interpreted as proof that target web interfaces are secure."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"], "endpoint": self.zap_url}
            )

        try:
            target_url = f"http://{target_ip}"
            query_params = {"url": target_url}
            if self.api_key:
                query_params["apikey"] = self.api_key
            query = urllib.parse.urlencode(query_params)

            # Defensive mode: Retrieve passive alerts recorded by ZAP proxy / baseline spider
            req = urllib.request.Request(f"{self.zap_url}/JSON/alert/view/alertsByRisk/?{query}")
            with urllib.request.urlopen(req, timeout=12) as resp:
                elapsed = time.time() - start_time
                findings: List[ScannerFinding] = []
                alerts_data = []

                if resp.status == 200:
                    raw_text = resp.read().decode("utf-8")
                    alerts_data = json.loads(raw_text).get("alertsByRisk", [])

                for risk_bucket in alerts_data:
                    for alert in risk_bucket.get("alerts", []):
                        raw_risk = alert.get("risk", "Low").upper()
                        sev = raw_risk if raw_risk in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] else "INFO"
                        cwe_id = alert.get("cweid")
                        cwe_str = f"CWE-{cwe_id}" if cwe_id else None

                        findings.append(ScannerFinding(
                            title=alert.get("alert", "Web Application Security Alert"),
                            description=alert.get("description", "ZAP passive web observation recorded."),
                            severity=sev,
                            category="SSL/TLS" if "ssl" in alert.get("alert", "").lower() else "CONFIGURATION",
                            affected_port=80,
                            affected_service="HTTP",
                            affected_url=alert.get("url"),
                            remediation_guidance=alert.get("solution", "Review web server configuration and apply security headers."),
                            verification_status="Observation" if sev in ["LOW", "INFO"] else "Unverified Candidate",
                            raw_evidence={
                                "source_tool": "zap",
                                "confidence": alert.get("confidence", "Medium"),
                                "evidence": alert.get("evidence", ""),
                                "cwe": cwe_str,
                                "plugin_id": alert.get("pluginId"),
                                "alert_ref": alert.get("alertRef"),
                                "verification_status": "Observation" if sev in ["LOW", "INFO"] else "Unverified Candidate"
                            }
                        ))

                return ScannerResult(
                    tool_name=self.tool_name,
                    status="COMPLETED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=findings,
                    raw_output=f"Retrieved {len(findings)} passive web alerts from ZAP daemon for {target_url}.",
                    coverage_limitations=[
                        "ZAP executed in passive inspection mode. Active attacks and SQLi/XSS fuzzing were not executed to safeguard medical device stability."
                    ],
                    is_simulated=False,
                    metadata={"target_url": target_url, "alerts_count": len(findings)}
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
                error_message=f"OWASP ZAP execution failed: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXECUTION_EXCEPTION"}
            )
