"""OpenSCAP Security Baseline Compliance Auditor Adapter for MediShield.

Executes Security Content Automation Protocol (SCAP) evaluations
against regulatory profiles (NIST 800-53, HIPAA Security Rule, CIS).
Normalizes XCCDF benchmark rule passes and failures.
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


class OpenSCAPAdapter(BaseScannerAdapter):
    """Adapter for OpenSCAP compliance assessment engine."""

    tool_name = "openscap"
    display_name = "OpenSCAP Compliance Auditor"
    category = ToolCategory.HOST_SOFTWARE_ASSESSMENT
    version = "1.3.x"
    is_remote = False
    supported_capabilities = [
        "XCCDF_BENCHMARK_EVALUATION",
        "HIPAA_SECURITY_COMPLIANCE",
        "NIST_800_53_VALIDATION",
        "CIS_PROFILE_AUDITING"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path
        self._detected_version = None

    def _resolve_binary(self) -> Optional[str]:
        candidate = self.binary_path or os.getenv("OPENSCAP_PATH")
        if candidate:
            if os.path.isfile(candidate) or shutil.which(candidate):
                return candidate
            return None
        return shutil.which("oscap")

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self._resolve_binary()
        if path:
            try:
                proc = subprocess.run([path, "-V"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"OpenSCAP\s+command\s+line\s+tool\s+\(oscap\)\s+([0-9\.]+)", output, re.IGNORECASE) or re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes OpenSCAP executable status."""
        is_windows = sys.platform.startswith("win")
        binary = self._resolve_binary()

        if is_windows and not binary:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_APPLICABLE,
                "available": False,
                "is_remote": False,
                "configuration_status": "OpenSCAP is natively designed for Linux/Unix environments; not found on Windows host",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "OpenSCAP is not installed or natively supported on this Windows host."
            }

        if not binary:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": "OpenSCAP executable 'oscap' not found in PATH or OPENSCAP_PATH",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "OpenSCAP engine is not installed."
            }

        v = self.get_version()
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": v,
            "status": ToolStatus.AVAILABLE,
            "available": True,
            "is_remote": False,
            "configuration_status": f"Executable verified at {binary}",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": str(binary),
            "message": f"OpenSCAP ({v}) ready for compliance benchmark evaluation."
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
                    f"OpenSCAP status is {avail['status']}. Compliance baseline evaluation was not evaluated.",
                    "OpenSCAP requires a configured Linux/Unix environment with SCAP data streams."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"]}
            )

        binary = self.binary_path or shutil.which("oscap")
        opts = options or {}
        profile = opts.get("profile", "xccdf_org.ssgproject.content_profile_standard")
        data_stream = opts.get("datastream", "/usr/share/xml/scap/ssg/content/ssg-debian11-ds.xml")

        cmd = [binary, "xccdf", "eval", "--profile", profile, data_stream]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            findings: List[ScannerFinding] = []

            for line in proc.stdout.splitlines():
                if "Title" in line and "fail" in line.lower():
                    rule_title = line.split("Title")[-1].strip()
                    findings.append(ScannerFinding(
                        title=f"SCAP Compliance Failure: {rule_title[:60]}",
                        description=f"Security Content Automation Protocol rule evaluated to fail: {rule_title}",
                        severity="MEDIUM",
                        category="CONFIGURATION",
                        cvss_score=5.0,
                        remediation_guidance="Apply remediation script specified in standard XCCDF benchmark profile.",
                        verification_status="Confirmed Vulnerability",
                        raw_evidence={"rule": rule_title, "source_tool": "openscap"}
                    ))

            exec_time = round(time.time() - start_time, 2)
            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=exec_time,
                findings=findings,
                raw_output=proc.stdout[:1500],
                coverage_limitations=["Evaluation limited to selected SCAP benchmark profile."],
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
                error_message="OpenSCAP evaluation timed out.",
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
                error_message=f"OpenSCAP execution error: {str(e)}",
                is_simulated=False
            )
