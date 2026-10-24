"""Syft Software Bill of Materials (SBOM) Generator Adapter for MediShield.

Catalogs software packages, dependencies, and licensing components from
IoMT device firmware archives, container images, and host filesystems.
Provides FDA/NIST compliant SBOM inventory generation.
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


class SyftAdapter(BaseScannerAdapter):
    """Adapter for Anchore Syft SBOM generator."""

    tool_name = "syft"
    display_name = "Syft SBOM Generator"
    category = ToolCategory.HOST_SOFTWARE_ASSESSMENT
    version = "1.0.x"
    is_remote = False
    supported_capabilities = [
        "SPDX_SBOM_GENERATION",
        "CYCLONEDX_CATALOGING",
        "FIRMWARE_PACKAGE_INVENTORY",
        "LICENSE_COMPLIANCE_AUDIT"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path
        self._detected_version = None

    def _resolve_binary(self) -> Optional[str]:
        candidate = self.binary_path or os.getenv("SYFT_PATH")
        if candidate:
            if os.path.isfile(candidate) or shutil.which(candidate):
                return candidate
            return None
        return self.resolve_project_binary("syft")

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self._resolve_binary()
        if path:
            try:
                proc = subprocess.run([path, "version"], capture_output=True, text=True, timeout=5)
                output = proc.stdout or proc.stderr or ""
                match = re.search(r"version:\s*([0-9\.]+)", output, re.IGNORECASE) or re.search(r"([0-9\.]+)", output)
                if match:
                    self._detected_version = match.group(1)
                    return self._detected_version
            except Exception:
                pass
        return self.version

    def check_availability(self) -> Dict[str, Any]:
        """Probes Syft executable status."""
        binary = self._resolve_binary()
        if not binary:
            return {
                "name": self.tool_name,
                "display_name": self.display_name,
                "category": self.category,
                "version": "unknown",
                "status": ToolStatus.NOT_INSTALLED,
                "available": False,
                "is_remote": False,
                "configuration_status": "Syft executable not found in system PATH or SYFT_PATH",
                "supported_capabilities": self.supported_capabilities,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "path": None,
                "message": "Syft is not installed. Software Bill of Materials (SBOM) generation disabled."
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
            "message": f"Syft ({v}) ready for Software Bill of Materials (SBOM) extraction."
        }

    def validate_applicability(self, device_context: Dict[str, Any]) -> tuple[bool, str]:
        artifact = device_context.get("artifact_path") or device_context.get("container_image")
        if not artifact:
            return False, (
                "Syft catalogs firmware artifacts, filesystems, and container images. "
                "Target device has no associated artifact or container image configured."
            )
        return True, "Target artifact is compatible with Syft SBOM generation."

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
                    f"Syft status is {avail['status']}. Software Bill of Materials was not evaluated.",
                    "No synthetic package inventories are created when Syft is missing."
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
                error_message="Target is a network endpoint without an associated firmware or container artifact.",
                coverage_limitations=[
                    "Syft catalogs firmware artifacts, filesystems, and container images.",
                    f"Target '{target_ip}' is a network IP; raw network ports do not expose package binaries for SBOM generation."
                ],
                is_simulated=False,
                metadata={"reason": "NOT_APPLICABLE"}
            )

        binary = self.binary_path or shutil.which("syft")
        cmd = [binary, artifact, "-o", "json"]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            findings: List[ScannerFinding] = []
            packages = []

            if proc.stdout.strip():
                try:
                    data = json.loads(proc.stdout)
                    artifacts = data.get("artifacts", [])
                    for art in artifacts[:20]:
                        name = art.get("name", "Unknown")
                        v = art.get("version", "Unknown")
                        packages.append(f"{name} ({v})")

                    if packages:
                        findings.append(ScannerFinding(
                            title=f"Syft SBOM Generated: {len(artifacts)} Packages Cataloged",
                            description=f"Syft extracted a full Software Bill of Materials for {artifact}, identifying {len(artifacts)} distinct component(s). Top components: {', '.join(packages[:5])}...",
                            severity="INFORMATIONAL",
                            category="CONFIGURATION",
                            cvss_score=0.0,
                            remediation_guidance="Maintain SBOM tracking in compliance with FDA Cybersecurity Medical Device guidance (Section 524B).",
                            verification_status="Observation",
                            raw_evidence={"package_count": len(artifacts), "sample_packages": packages[:5], "source_tool": "syft"}
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
                raw_output=f"Cataloged {len(packages)} packages.\n{proc.stdout[:1000]}",
                coverage_limitations=["Analyzed visible software package manifests and binaries in the target artifact."],
                is_simulated=False,
                metadata={"package_count": len(packages)}
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
                error_message="Syft execution timed out.",
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
                error_message=f"Syft error: {str(e)}",
                is_simulated=False
            )
