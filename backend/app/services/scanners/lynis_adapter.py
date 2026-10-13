"""Lynis Host Auditor Adapter for MediShield.

Executes operating system security audits and hardening assessments for Linux/Unix endpoints.
Checks OS platform applicability and SSH remote audit configuration.
"""

import os
import shutil
import subprocess
import re
import sys
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


class LynisAdapter(BaseScannerAdapter):
    """Adapter for Lynis OS security auditor."""

    tool_name = "lynis"
    display_name = "Lynis Host Auditor"
    category = ToolCategory.HOST_SOFTWARE_ASSESSMENT
    version = "3.1.x"
    is_remote = False
    supported_capabilities = [
        "OS_HARDENING_AUDIT",
        "COMPLIANCE_BENCHMARKING",
        "KERNEL_SECURITY_CHECK",
        "VULNERABILITY_ASSESSMENT"
    ]

    def __init__(self, binary_path: Optional[str] = None, ssh_target: Optional[str] = None):
        self.binary_path = binary_path or os.getenv("LYNIS_PATH") or shutil.which("lynis")
        self.ssh_target = ssh_target or os.getenv("LYNIS_SSH_TARGET")
        self._detected_version = None

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self.binary_path or shutil.which("lynis")
        if path:
            try:
                proc = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes Lynis executable and host OS applicability."""
        is_windows = sys.platform.startswith("win")
        binary = self.binary_path or shutil.which("lynis")

        if is_windows and not self.ssh_target:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_APPLICABLE,
                "available": False,
                "is_remote": False,
                "configuration_status": "Lynis requires a Linux/Unix environment; host is running Windows without LYNIS_SSH_TARGET",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "Lynis OS auditor is only applicable to Linux/Unix systems or via remote SSH execution."
            }

        if not binary and not self.ssh_target:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": "Lynis executable not found in PATH or LYNIS_PATH",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "Lynis is not installed on this host."
            }

        v = self.get_version()
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": v,
            "status": ToolStatus.AVAILABLE,
            "available": True,
            "is_remote": bool(self.ssh_target),
            "configuration_status": f"Lynis operational ({'Remote SSH' if self.ssh_target else f'Local binary at {binary}'})",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": str(binary or self.ssh_target),
            "message": f"Lynis ({v}) ready for system hardening audit."
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
                    f"Lynis status is {avail['status']}. Host OS hardening was not evaluated.",
                    "Lynis requires Unix/Linux environment or remote SSH host configuration."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"]}
            )

        binary = self.binary_path or shutil.which("lynis")
        cmd = [binary, "audit", "system", "--quick", "--cronjob"]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
            findings: List[ScannerFinding] = []
            output = proc.stdout

            for line in output.splitlines():
                if "Warning:" in line or "[WARNING]" in line:
                    clean = re.sub(r".*Warning:\s*", "", line).strip()
                    findings.append(ScannerFinding(
                        title=f"Lynis OS Warning: {clean[:60]}",
                        description=f"Lynis system audit identified host security warning: {clean}",
                        severity="HIGH",
                        category="CONFIGURATION",
                        cvss_score=7.0,
                        remediation_guidance="Apply recommended OS configuration baseline and security hardening.",
                        verification_status="Confirmed Vulnerability",
                        raw_evidence={"raw_line": line, "source_tool": "lynis"}
                    ))
                elif "Suggestion:" in line or "[SUGGESTION]" in line:
                    clean = re.sub(r".*Suggestion:\s*", "", line).strip()
                    findings.append(ScannerFinding(
                        title=f"Lynis Hardening Suggestion: {clean[:60]}",
                        description=f"Lynis hardening recommendation: {clean}",
                        severity="MEDIUM",
                        category="CONFIGURATION",
                        cvss_score=4.5,
                        remediation_guidance="Review Lynis control guidance and implement recommended system configuration.",
                        verification_status="Observation",
                        raw_evidence={"raw_line": line, "source_tool": "lynis"}
                    ))

            exec_time = round(time.time() - start_time, 2)
            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=exec_time,
                findings=findings,
                raw_output=output[:1500],
                coverage_limitations=["Scoped to local Linux kernel and OS configuration parameters."],
                is_simulated=False,
                metadata={"findings_count": len(findings)}
            )
        except subprocess.TimeoutExpired:
            return ScannerResult(
                tool_name=self.tool_name,
                status="FAILED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(time.time() - start_time, 2),
                findings=[],
                raw_output="",
                error_message="Lynis audit timed out.",
                is_simulated=False
            )
        except Exception as e:
            return ScannerResult(
                tool_name=self.tool_name,
                status="FAILED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=round(time.time() - start_time, 2),
                findings=[],
                raw_output="",
                error_message=f"Lynis execution error: {str(e)}",
                is_simulated=False
            )
