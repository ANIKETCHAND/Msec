"""Zeek Network Security Monitor Adapter for MediShield.

Integrates with Zeek network telemetry engine.
Supports authentic ingestion of Zeek connection, HTTP, SSL, and DNS logs.
If Zeek binary or log directory is not configured, returns honest status without mock findings.
"""

import os
import shutil
import subprocess
import re
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import (
    BaseScannerAdapter,
    ScannerResult,
    ScannerFinding,
    ToolStatus,
    ToolCategory
)


class ZeekAdapter(BaseScannerAdapter):
    """Adapter for Zeek Network Security Monitor."""

    tool_name = "zeek"
    display_name = "Zeek Network Monitor"
    category = ToolCategory.NETWORK_MONITORING
    version = "6.0.x"
    is_remote = False
    supported_capabilities = [
        "CONN_LOG_INGESTION",
        "PROTOCOL_ANALYSIS",
        "CLEAR_TEXT_TRAFFIC_DETECTION",
        "BEHAVIORAL_TELEMETRY"
    ]

    def __init__(self, log_dir: Optional[str] = None, binary_path: Optional[str] = None):
        self.binary_path = binary_path or os.getenv("ZEEK_PATH") or shutil.which("zeek")
        self.log_dir = log_dir or os.getenv("ZEEK_LOG_DIR", "/var/log/zeek/current")
        self._detected_version = None

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self.binary_path or shutil.which("zeek")
        if path:
            try:
                proc = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"zeek\s+version\s+([0-9\.]+)", output, re.IGNORECASE) or re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes Zeek binary and log directory status."""
        binary_exists = bool(self.binary_path or shutil.which("zeek"))
        log_dir_exists = os.path.isdir(self.log_dir)

        has_logs = False
        if log_dir_exists:
            for log_name in ["conn.log", "http.log", "ssl.log", "dns.log"]:
                if os.path.isfile(os.path.join(self.log_dir, log_name)):
                    has_logs = True
                    break

        if has_logs:
            v = self.get_version() if binary_exists else "Active Log Feed"
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": v,
                "status": ToolStatus.AVAILABLE,
                "available": True,
                "is_remote": False,
                "configuration_status": f"Active Zeek log telemetry at {self.log_dir}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": self.log_dir,
                "message": "Zeek network logs are active and accessible."
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
                "configuration_status": f"Binary at {self.binary_path}, but log directory empty or not found at {self.log_dir}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": str(self.binary_path),
                "message": f"Zeek binary installed ({v}), but ZEEK_LOG_DIR contains no active logs."
            }

        repo_info = self.get_repo_git_info("zeek")
        if repo_info.get("cloned"):
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": self.version,
                "status": ToolStatus.NOT_CONFIGURED,
                "available": False,
                "is_remote": False,
                "configuration_status": f"Zeek repository integrated at {repo_info['repo_path']} (commit {repo_info['commit']}). Log telemetry directory not found at {self.log_dir}.",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": repo_info["repo_path"],
                "message": f"Zeek Network Monitor repository integrated (commit {repo_info['commit']}). Set ZEEK_LOG_DIR to active Zeek log folder."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.NOT_INSTALLED,
            "available": False,
            "is_remote": False,
            "configuration_status": f"Zeek binary not in PATH and log directory not found at {self.log_dir}",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": None,
            "message": "Zeek network monitor is not installed. Passive telemetry disabled."
        }

    def _parse_tsv_log(self, file_path: str, target_ip: str) -> List[Dict[str, str]]:
        """Parses standard Zeek TSV / JSON log lines matching target_ip."""
        matches = []
        if not os.path.isfile(file_path):
            return matches

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                fields = []
                separator = "\t"
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("#separator"):
                        sep_hex = line.split()[-1]
                        if sep_hex.startswith("\\x"):
                            separator = chr(int(sep_hex[2:], 16))
                        continue
                    if line.startswith("#fields"):
                        fields = line.split()[1:]
                        continue
                    if line.startswith("#"):
                        continue

                    if line.startswith("{") and line.endswith("}"):
                        try:
                            record = json.loads(line)
                            orig_h = record.get("id.orig_h") or record.get("orig_h") or ""
                            resp_h = record.get("id.resp_h") or record.get("resp_h") or ""
                            if orig_h == target_ip or resp_h == target_ip:
                                matches.append(record)
                        except json.JSONDecodeError:
                            pass
                        continue

                    parts = line.split(separator)
                    if fields and len(parts) == len(fields):
                        record = dict(zip(fields, parts))
                        orig_h = record.get("id.orig_h", "")
                        resp_h = record.get("id.resp_h", "")
                        if orig_h == target_ip or resp_h == target_ip:
                            matches.append(record)
        except Exception:
            pass

        return matches

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
                    f"Zeek status is {avail['status']}. Passive connection telemetry was not evaluated.",
                    "No synthetic network records are generated when live Zeek logs are missing."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"], "log_dir": self.log_dir}
            )

        conn_records = self._parse_tsv_log(os.path.join(self.log_dir, "conn.log"), target_ip)
        http_records = self._parse_tsv_log(os.path.join(self.log_dir, "http.log"), target_ip)
        ssl_records = self._parse_tsv_log(os.path.join(self.log_dir, "ssl.log"), target_ip)

        findings: List[ScannerFinding] = []

        for http_rec in http_records[:10]:
            method = http_rec.get("method", "GET")
            host = http_rec.get("host", target_ip)
            uri = http_rec.get("uri", "/")
            findings.append(ScannerFinding(
                title=f"Zeek Observed Unencrypted HTTP Traffic to {host}",
                description=f"Zeek detected cleartext HTTP {method} transaction for IoMT device {target_ip} to {host}{uri}.",
                severity="MEDIUM",
                category="PROTOCOL",
                cvss_score=5.3,
                affected_port=80,
                affected_service="HTTP",
                remediation_guidance="Enforce HTTPS / TLS 1.3 encryption for all medical device web and API endpoints.",
                verification_status="Observation",
                raw_evidence={"zeek_log": "http.log", "record": http_rec, "source_tool": "zeek"}
            ))

        insecure_ports = {"21": "FTP", "23": "Telnet", "513": "Rlogin", "69": "TFTP"}
        observed_insecure_ports = set()
        for conn_rec in conn_records:
            resp_p = str(conn_rec.get("id.resp_p", ""))
            if resp_p in insecure_ports and resp_p not in observed_insecure_ports:
                observed_insecure_ports.add(resp_p)
                proto_name = insecure_ports[resp_p]
                findings.append(ScannerFinding(
                    title=f"Zeek Observed Insecure Protocol ({proto_name}) Traffic",
                    description=f"Zeek connection records captured active network communication on port {resp_p} ({proto_name}) involving {target_ip}.",
                    severity="HIGH",
                    category="PORT",
                    cvss_score=7.5,
                    affected_port=int(resp_p) if resp_p.isdigit() else None,
                    affected_service=proto_name,
                    remediation_guidance=f"Disable legacy unencrypted protocol {proto_name} and transition to SSH / TLS-wrapped interfaces.",
                    verification_status="Confirmed Vulnerability",
                    raw_evidence={"zeek_log": "conn.log", "record": conn_rec, "source_tool": "zeek"}
                ))

        if conn_records and not findings:
            findings.append(ScannerFinding(
                title="Zeek Network Connection Telemetry Recorded",
                description=f"Zeek captured {len(conn_records)} connection session(s) for target {target_ip}. No cleartext or insecure protocol anomalies identified.",
                severity="INFORMATIONAL",
                category="NETWORK",
                cvss_score=0.0,
                remediation_guidance="Maintain continuous Zeek passive network telemetry and behavioral anomaly monitoring.",
                verification_status="Observation",
                raw_evidence={"conn_count": len(conn_records), "source_tool": "zeek"}
            ))

        exec_time = round(time.time() - start_time, 2)
        return ScannerResult(
            tool_name=self.tool_name,
            status="COMPLETED",
            target_ip=target_ip,
            available=True,
            execution_time_seconds=exec_time,
            findings=findings,
            raw_output=f"Analyzed Zeek telemetry for {target_ip}: {len(conn_records)} conn, {len(http_records)} http, {len(ssl_records)} ssl records.",
            coverage_limitations=[
                "Passive log inspection relies on traffic routed through Zeek network tap/SPAN interface.",
                "Encrypted payload payloads cannot be inspected without TLS session key logging."
            ],
            is_simulated=False,
            metadata={"conn_records": len(conn_records), "http_records": len(http_records)}
        )
