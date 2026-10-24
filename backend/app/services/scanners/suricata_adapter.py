"""Suricata IDS Network Monitoring Adapter for MediShield.

Integrates with Suricata Network Threat Detection engine.
Supports authentic ingestion of EVE JSON alert records and event normalization.
If Suricata or its EVE JSON stream is not configured, returns honest status.
"""

import os
import shutil
import subprocess
import json
import re
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory


class SuricataAdapter(BaseScannerAdapter):
    """Adapter for Suricata Intrusion Detection System."""

    tool_name = "suricata"
    display_name = "Suricata IDS"
    category = ToolCategory.NETWORK_MONITORING
    version = "7.0.x"
    is_remote = False
    supported_capabilities = [
        "EVE_JSON_INGESTION",
        "SIGNATURE_MATCHING",
        "NETWORK_INTRUSION_DETECTION",
        "SECURITY_EVENT_NORMALIZATION"
    ]

    def __init__(self, eve_path: Optional[str] = None, binary_path: Optional[str] = None):
        self.binary_path = binary_path or os.getenv("SURICATA_PATH") or shutil.which("suricata")
        self.eve_path = eve_path or os.getenv("SURICATA_EVE_PATH", "/var/log/suricata/eve.json")
        self._detected_version = None

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self.binary_path or shutil.which("suricata")
        if path:
            try:
                proc = subprocess.run([path, "-V"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"Suricata\s+version\s+([0-9\.]+)", output, re.IGNORECASE) or re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes Suricata binary and EVE JSON stream status."""
        binary_exists = bool(self.binary_path or shutil.which("suricata"))
        eve_exists = os.path.isfile(self.eve_path)

        if eve_exists:
            v = self.get_version() if binary_exists else "EVE Feed Active"
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": v,
                "status": ToolStatus.AVAILABLE,
                "available": True,
                "is_remote": False,
                "configuration_status": f"Active EVE JSON log at {self.eve_path}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": self.eve_path,
                "message": f"Suricata EVE JSON telemetry is active and accessible."
            }

        if binary_exists:
            v = self.get_version()
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": v,
                "status": ToolStatus.NOT_CONFIGURED,
                "available": False,
                "is_remote": False,
                "configuration_status": f"Binary detected at {self.binary_path}, but EVE JSON log not found at {self.eve_path}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": str(self.binary_path),
                "message": f"Suricata binary is installed ({v}), but EVE JSON stream is not running. Configure SURICATA_EVE_PATH."
            }

        repo_info = self.get_repo_git_info("suricata")
        if repo_info.get("cloned"):
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": self.version,
                "status": ToolStatus.NOT_CONFIGURED,
                "available": False,
                "is_remote": False,
                "configuration_status": f"Suricata repository integrated at {repo_info['repo_path']} (commit {repo_info['commit']}). EVE log not found at {self.eve_path}.",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": repo_info["repo_path"],
                "message": f"Suricata IDS repository integrated (commit {repo_info['commit']}). Start Suricata engine or configure SURICATA_EVE_PATH to stream alerts."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.NOT_INSTALLED,
            "available": False,
            "is_remote": False,
            "configuration_status": "Suricata binary and EVE JSON logs not present",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": None,
            "message": "Suricata is not installed or configured on this host. Passive IDS monitoring is offline."
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
                    f"Suricata status is {avail['status']}. Passive network intrusion detection was not evaluated.",
                    "No synthetic alerts are generated when real EVE JSON feeds are missing."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"], "eve_path": self.eve_path}
            )

        # Ingest recent alerts matching target_ip from EVE JSON file
        findings: List[ScannerFinding] = []
        raw_entries = []
        seen_sigs = set()

        try:
            with open(self.eve_path, "r", encoding="utf-8", errors="ignore") as f:
                # Read last 200 lines to examine active telemetry
                lines = f.readlines()[-200:]
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        if record.get("event_type") == "alert":
                            src = record.get("src_ip", "")
                            dest = record.get("dest_ip", "")
                            if target_ip in [src, dest]:
                                alert = record.get("alert", {})
                                sig_id = alert.get("signature_id")
                                if sig_id in seen_sigs:
                                    continue
                                seen_sigs.add(sig_id)

                                sev_num = alert.get("severity", 3)
                                sev_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
                                sev_label = sev_map.get(sev_num, "MEDIUM")

                                findings.append(ScannerFinding(
                                    title=alert.get("signature", "Suricata Network Anomaly"),
                                    description=f"Suricata alert observed on medical network flow ({src} -> {dest}). Category: {alert.get('category', 'Network Intrusion')}.",
                                    severity=sev_label,
                                    category="NETWORK",
                                    affected_port=record.get("dest_port"),
                                    affected_service=record.get("proto", "TCP"),
                                    remediation_guidance="Inspect patient VLAN switch port, check firewall ACL, and verify device telemetry flow.",
                                    verification_status="Observation" if sev_label in ["LOW", "MEDIUM"] else "Confirmed Vulnerability",
                                    raw_evidence={
                                        "source_tool": "suricata",
                                        "signature_id": sig_id,
                                        "src_ip": src,
                                        "dest_ip": dest,
                                        "flow_id": record.get("flow_id"),
                                        "verification_status": "Observation" if sev_label in ["LOW", "MEDIUM"] else "Confirmed Vulnerability"
                                    }
                                ))
                                raw_entries.append(line)
                    except json.JSONDecodeError:
                        continue

            elapsed = time.time() - start_time
            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=findings,
                raw_output="\n".join(raw_entries[:20]),
                coverage_limitations=[
                    f"Suricata analyzed active EVE JSON telemetry stream ({self.eve_path}) for flows touching target {target_ip}."
                ],
                is_simulated=False,
                metadata={"eve_path": self.eve_path, "matched_alerts": len(findings)}
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
                error_message=f"Failed to parse Suricata EVE JSON: {str(e)}",
                is_simulated=False,
                metadata={"reason": "PARSING_ERROR"}
            )
