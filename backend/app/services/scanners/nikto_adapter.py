"""Nikto Web Server Scanner Adapter for MediShield.

Executes non-destructive web server and configuration reconnaissance.
If Nikto is not installed on the system, returns honest NOT_EVALUATED status
without fabricating results.
"""

import os
import shutil
import subprocess
import time
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory


class NiktoAdapter(BaseScannerAdapter):
    """Adapter for Nikto web server scanner."""

    tool_name = "nikto"
    display_name = "Nikto Web Server Auditor"
    category = ToolCategory.WEB_ASSESSMENT
    version = "2.1.6"
    is_remote = False
    supported_capabilities = [
        "WEB_SERVER_AUDIT",
        "HEADER_EXPOSURE_CHECK",
        "CONFIGURATION_OBSERVATIONS"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path
        self._detected_version = None

    def _resolve_binary(self) -> Optional[str]:
        candidate = self.binary_path or os.getenv("NIKTO_PATH")
        if candidate:
            if os.path.isfile(candidate) or shutil.which(candidate):
                return candidate
            return None
        return shutil.which("nikto") or shutil.which("nikto.pl")

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self._resolve_binary()
        if path:
            try:
                proc = subprocess.run([path, "-Version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"Nikto\s+v?([0-9\.]+)", output, re.IGNORECASE)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        path = self._resolve_binary()
        if path:
            v = self.get_version()
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": v,
                "status": ToolStatus.AVAILABLE,
                "available": True,
                "is_remote": False,
                "configuration_status": f"Binary detected at {path}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": path,
                "message": f"Nikto Web Server Auditor is operational (version {v})."
            }
        if self.binary_path:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": f"Specified binary not found at {self.binary_path}",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": f"Specified Nikto binary not found at {self.binary_path}."
            }
        repo_info = self.get_repo_git_info("nikto")
        if repo_info.get("cloned"):
            script_path = os.path.join(repo_info["repo_path"], "program", "nikto.pl")
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": self.version,
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": f"Repository integrated at {repo_info['repo_path']} (commit {repo_info['commit']}). Requires Strawberry Perl runtime.",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": script_path,
                "message": f"Nikto repository integrated at {repo_info['repo_path']} (commit {repo_info['commit']})."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.NOT_INSTALLED,
            "available": False,
            "is_remote": False,
            "configuration_status": "Executable not found in system PATH or NIKTO_PATH",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
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
                coverage_limitations=[
                    "Nikto binary missing from host environment. Web server reconnaissance was not evaluated.",
                    "Unevaluated status must never be interpreted as proof that target device is secure."
                ],
                is_simulated=False,
                metadata={"reason": "TOOL_NOT_INSTALLED", "limitations": "Binary not found on host."}
            )

        # Defensive scan: target port 80/443, fast check
        port = str(options.get("port", 80)) if options else "80"
        binary_exec = avail.get("path") or "nikto"
        args = [
            binary_exec,
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

            # Real output parsing: treat Nikto output as configuration observations
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
                    verification_status="Observation",
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
                    remediation_guidance="Configure web server to return X-Frame-Options: SAMEORIGIN or DENY.",
                    verification_status="Observation",
                    raw_evidence={"header": "X-Frame-Options", "source_tool": "nikto", "verification_status": "Observation"}
                ))

            if "+ The X-Content-Type-Options header is not set" in output:
                findings.append(ScannerFinding(
                    title="X-Content-Type-Options Header Missing",
                    description="The X-Content-Type-Options header is not set, allowing MIME sniffing.",
                    severity="LOW",
                    category="CONFIGURATION",
                    affected_port=int(port),
                    affected_service="HTTP",
                    remediation_guidance="Set 'X-Content-Type-Options: nosniff' header.",
                    verification_status="Observation",
                    raw_evidence={"header": "X-Content-Type-Options", "source_tool": "nikto", "verification_status": "Observation"}
                ))

            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED" if proc.returncode == 0 else "PARTIALLY_COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(elapsed, 2),
                findings=findings,
                raw_output=output[:4000],
                exit_code=proc.returncode,
                coverage_limitations=[
                    "Nikto scan strictly scoped to non-destructive configuration and header checks (-Tuning 1,2,b) with 30s timeout limit."
                ],
                is_simulated=False,
                metadata={"port": port, "target_ip": target_ip}
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
                error_message=f"Nikto execution exception: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXCEPTION"}
            )
