"""Trivy Container and Dependency Auditor Adapter for MediShield.

Executes comprehensive vulnerability analysis on container images,
filesystems, and software dependency manifests.
Validates applicability for IoMT device firmware and gateway containers.
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


class TrivyAdapter(BaseScannerAdapter):
    """Adapter for Aqua Security Trivy vulnerability scanner."""

    tool_name = "trivy"
    display_name = "Trivy Container & Dependency Auditor"
    category = ToolCategory.HOST_SOFTWARE_ASSESSMENT
    version = "0.50.x"
    is_remote = False
    supported_capabilities = [
        "CONTAINER_IMAGE_SCAN",
        "FILESYSTEM_SBOM_AUDIT",
        "DEPENDENCY_VULNERABILITY_CHECK",
        "MISCONFIGURATION_DETECTION"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or os.getenv("TRIVY_PATH") or shutil.which("trivy")
        self._detected_version = None

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self.binary_path or shutil.which("trivy")
        if path:
            try:
                proc = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"Version:\s*([0-9\.]+)", output, re.IGNORECASE) or re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes Trivy executable status."""
        binary = self.binary_path or shutil.which("trivy")
        if not binary:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": "Trivy binary not found in system PATH or TRIVY_PATH",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "Trivy is not installed. Container and dependency vulnerability scanning disabled."
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
            "message": f"Trivy scanner ({v}) ready for container and filesystem artifact assessment."
        }

    def validate_applicability(self, device_context: Dict[str, Any]) -> tuple[bool, str]:
        artifact = device_context.get("artifact_path") or device_context.get("container_image")
        if not artifact:
            return False, (
                "Trivy analyzes container images or filesystem artifacts. "
                "Target device has no associated container image or filesystem artifact configured."
            )
        return True, "Target artifact is compatible with Trivy."

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
                    f"Trivy status is {avail['status']}. Container and dependency audit was not evaluated.",
                    "No synthetic package alerts are generated when Trivy is uninstalled."
                ],
                is_simulated=False,
                metadata={"reason": avail["status"]}
            )

        opts = options or {}
        artifact = opts.get("artifact_path") or device_context.get("artifact_path") or opts.get("container_image")
        if not artifact:
            return ScannerResult(
                tool_name=self.tool_name,
                status="NOT_EVALUATED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=0.0,
                findings=[],
                raw_output="",
                error_message="Target is a network endpoint without an associated container image or filesystem artifact.",
                coverage_limitations=[
                    "Trivy evaluates filesystem artifacts and container images.",
                    f"Target '{target_ip}' is a network IP; raw network ports do not expose package binaries."
                ],
                is_simulated=False,
                metadata={"reason": "NOT_APPLICABLE"}
            )

        binary = self.binary_path or shutil.which("trivy")
        is_image = bool(opts.get("container_image"))
        cmd = [
            binary,
            "image" if is_image else "fs",
            "--format", "json",
            "--severity", "CRITICAL,HIGH,MEDIUM",
            artifact
        ]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            findings: List[ScannerFinding] = []

            if proc.stdout.strip():
                try:
                    data = json.loads(proc.stdout)
                    results = data.get("Results", [])
                    for res in results:
                        for vuln in res.get("Vulnerabilities", []):
                            vuln_id = vuln.get("VulnerabilityID", "UNKNOWN")
                            pkg_name = vuln.get("PkgName", "")
                            installed_v = vuln.get("InstalledVersion", "")
                            fixed_v = vuln.get("FixedVersion", "N/A")
                            trivy_sev = vuln.get("Severity", "MEDIUM").upper()
                            title = vuln.get("Title") or f"Vulnerability in {pkg_name}"

                            findings.append(ScannerFinding(
                                title=f"Trivy: {title} ({vuln_id})",
                                description=vuln.get("Description", f"Vulnerability detected in package {pkg_name} {installed_v}."),
                                severity=trivy_sev if trivy_sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else "MEDIUM",
                                category="VULNERABILITY",
                                cve_id=vuln_id if vuln_id.startswith("CVE") else None,
                                cvss_score=float(vuln.get("CVSS", {}).get("nvd", {}).get("V3Score", 5.0) or 5.0),
                                remediation_guidance=f"Upgrade package {pkg_name} to version {fixed_v}." if fixed_v != "N/A" else "Review vendor advisory.",
                                verification_status="Confirmed Vulnerability",
                                raw_evidence={
                                    "package": pkg_name,
                                    "installed_version": installed_v,
                                    "fixed_version": fixed_v,
                                    "target": res.get("Target", artifact),
                                    "source_tool": "trivy"
                                }
                            ))
                except json.JSONDecodeError:
                    pass

            exec_time = round(time.time() - start_time, 2)
            return ScannerResult(
                tool_name=self.tool_name,
                status="COMPLETED",
                target_ip=target_ip,
                available=True,
                execution_time_seconds=exec_time,
                findings=findings,
                raw_output=proc.stdout[:1500] if proc.stdout else "Trivy scan completed with no findings.",
                coverage_limitations=["Scoped to container image or local filesystem artifacts."],
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
                error_message="Trivy execution timed out.",
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
                error_message=f"Trivy error: {str(e)}",
                is_simulated=False
            )
