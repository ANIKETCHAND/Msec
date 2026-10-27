"""Nmap Defensive Scanner Adapter for MediShield.

Executes non-destructive, strictly parameterized TCP connect port and service audits.
If Nmap is not present on the host system, returns honest NOT_EVALUATED status
without fabricating results.
"""

import os
import shutil
import subprocess
import time
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding, ToolStatus, ToolCategory


class NmapAdapter(BaseScannerAdapter):
    """Adapter for Nmap defensive service & port auditing."""

    tool_name = "nmap"
    display_name = "Nmap Service Scanner"
    category = ToolCategory.CORE_DISCOVERY
    version = "7.9x"
    is_remote = False
    supported_capabilities = [
        "HOST_DISCOVERY",
        "PORT_DISCOVERY",
        "SERVICE_DETECTION",
        "VERSION_DETECTION",
        "EXPOSURE_AUDIT"
    ]

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path
        self._detected_version = None

    def _resolve_binary(self) -> Optional[str]:
        candidate = self.binary_path or os.getenv("NMAP_PATH")
        if candidate:
            if os.path.isfile(candidate) or shutil.which(candidate):
                return candidate
            return None
        return self.resolve_project_binary("nmap")

    def get_version(self) -> str:
        if self._detected_version:
            return self._detected_version
        path = self._resolve_binary()
        if path:
            try:
                proc = subprocess.run([path, "-V"], capture_output=True, text=True, timeout=5)
                if proc.returncode == 0:
                    match = re.search(r"Nmap version\s+([0-9\.]+)", proc.stdout)
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
                "message": f"Nmap Service Scanner is operational (version {v})."
            }
        return {
            "name": self.tool_name,
            "display_name": self.display_name,
            "category": self.category,
            "version": "unknown",
            "status": ToolStatus.NOT_INSTALLED,
            "available": False,
            "is_remote": False,
            "configuration_status": "Executable not found in system PATH or NMAP_PATH",
            "supported_capabilities": self.supported_capabilities,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "path": None,
            "message": "Nmap is not installed or not configured in system PATH."
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
                error_message="Nmap binary is not installed in system PATH. Port auditing was not evaluated.",
                coverage_limitations=[
                    "Nmap binary missing from host environment. Defensive port and service discovery was not evaluated.",
                    "Unevaluated status must never be interpreted as proof that target device is secure."
                ],
                is_simulated=False,
                metadata={"reason": "TOOL_NOT_INSTALLED", "limitations": "Binary not found on host."}
            )

        # Defensive scan arguments only:
        # -sT: TCP connect (unprivileged, non-raw)
        # -sV: Service version probe
        # --version-light: minimal intrusive probing
        # -T3: Normal polite timing
        # -p: specific IoMT / web / HL7 / Modbus ports
        ports = options.get("ports", "80,443,502,2575,8000,8080,8090,8443,5173") if options else "80,443,502,2575,8000,8080,8090,8443,5173"
        binary_exec = avail.get("path") or "nmap"
        args = [
            binary_exec,
            "-sT",
            "-sV",
            "--version-light",
            "-n",
            "-p", str(ports),
            "-T4",
            "--max-retries", "1",
            "--host-timeout", "15s",
            "-oX", "-",
            target_ip
        ]

        try:
            proc = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=40,
                shell=False
            )
            elapsed = time.time() - start_time

            if proc.returncode == 0 and proc.stdout:
                findings = self._parse_nmap_xml(proc.stdout, target_ip)
                return ScannerResult(
                    tool_name=self.tool_name,
                    status="COMPLETED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=findings,
                    raw_output=proc.stdout[:4000],
                    exit_code=proc.returncode,
                    coverage_limitations=[
                        f"Scan restricted to non-destructive TCP connect ports ({ports}). UDP and unlisted ports were not audited."
                    ],
                    is_simulated=False,
                    metadata={"target_ip": target_ip, "open_ports_count": len(findings)}
                )
            else:
                return ScannerResult(
                    tool_name=self.tool_name,
                    status="FAILED",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=[],
                    raw_output=proc.stderr or proc.stdout or "",
                    exit_code=proc.returncode,
                    error_message=f"Nmap execution failed (code {proc.returncode}): {proc.stderr.strip() or 'Host unreachable or probe blocked'}",
                    is_simulated=False,
                    metadata={"reason": "SCAN_FAILED"}
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
                error_message="Nmap probe timed out after 40 seconds.",
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
                error_message=f"Nmap execution exception: {str(e)}",
                is_simulated=False,
                metadata={"reason": "EXCEPTION"}
            )

    def _parse_nmap_xml(self, xml_content: str, target_ip: str) -> List[ScannerFinding]:
        findings = []
        try:
            root = ET.fromstring(xml_content)
            for host in root.findall("host"):
                for port in host.findall(".//port"):
                    portid = int(port.get("portid", 0))
                    state = port.find("state")
                    if state is not None and state.get("state") == "open":
                        service = port.find("service")
                        service_name = service.get("name", "unknown") if service is not None else "unknown"
                        service_product = service.get("product", "") if service is not None else ""
                        service_version = service.get("version", "") if service is not None else ""

                        # Categorize IoMT risk
                        severity = "INFO"
                        remediation = "Keep service patched and restricted to authorized management subnets."
                        ver_status = "Observation"

                        if portid == 80:
                            severity = "HIGH"
                            remediation = "Enforce HTTPS encryption (port 443) and redirect plaintext HTTP."
                            ver_status = "Observation"
                        elif portid == 502:
                            severity = "HIGH"
                            remediation = "Apply firewall rules restricting Modbus/TCP access solely to authorized central telemetry servers."
                            ver_status = "Observation"
                        elif portid == 2575:
                            severity = "HIGH"
                            remediation = "Encapsulate HL7 traffic in TLS (HL7 over TLS) to safeguard patient health information."
                            ver_status = "Observation"
                        elif portid in [443, 8443]:
                            severity = "INFO"
                            remediation = "Maintain modern TLS ciphers and verify CA certificate renewal."
                            ver_status = "Positive Control"

                        ver_str = f" {service_version}" if service_version else ""
                        prod_str = f"{service_product}{ver_str}" if service_product else service_name

                        findings.append(ScannerFinding(
                            title=f"Open Port Observed: {portid}/TCP ({prod_str})",
                            description=f"Nmap identified open port {portid}/TCP actively running {prod_str} on target {target_ip}.",
                            severity=severity,
                            category="PORT",
                            affected_port=portid,
                            affected_service=service_name,
                            remediation_guidance=remediation,
                            verification_status=ver_status,
                            raw_evidence={
                                "source_tool": "nmap",
                                "port": portid,
                                "protocol": "tcp",
                                "service": service_name,
                                "product": service_product,
                                "version": service_version,
                                "verification_status": ver_status
                            }
                        ))
        except Exception:
            pass
        return findings
