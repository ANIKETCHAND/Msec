"""Nmap Defensive Scanner Adapter for MediShield.

Executes non-destructive, strictly parameterized port and service audits.
If Nmap is not present on the host system, returns structured fallback diagnostics
with clear indicators: 'Nmap is not installed/configured on host system'.
"""

import shutil
import subprocess
import time
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class NmapAdapter(BaseScannerAdapter):
    """Adapter for Nmap defensive service & port auditing."""

    tool_name = "nmap"
    version = "7.9x"

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or shutil.which("nmap")

    def check_availability(self) -> Dict[str, Any]:
        path = shutil.which("nmap") if not self.binary_path else self.binary_path
        if path:
            return {
                "tool": self.tool_name,
                "available": True,
                "status": "AVAILABLE",
                "path": path,
                "message": f"Nmap binary detected at {path}"
            }
        return {
            "tool": self.tool_name,
            "available": False,
            "status": "NOT_INSTALLED",
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
            # Provide faithful synthetic IoMT port discovery fallback
            return self._generate_simulated_scan_result(target_ip, device_context, start_time)

        # Defensive scan arguments only:
        # -sT: TCP connect (unprivileged, non-raw)
        # -sV: Service version probe
        # --version-light: minimal intrusive probing
        # -T3: Normal polite timing
        # -p: specific IoMT / web / HL7 / Modbus ports
        ports = "80,443,502,2575,8080,8443"
        args = [
            self.binary_path or "nmap",
            "-sT",
            "-sV",
            "--version-light",
            "-p", ports,
            "-T3",
            "--max-retries", "1",
            "--host-timeout", "30s",
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
                    status="SUCCESS",
                    target_ip=target_ip,
                    available=True,
                    execution_time_seconds=round(elapsed, 2),
                    findings=findings,
                    raw_output=proc.stdout,
                    is_simulated=False,
                    metadata={"scanned_ports": ports, "target": target_ip}
                )
            else:
                # Execution returned non-zero (host down or unroutable synthetic IP in demo environment)
                return self._generate_simulated_scan_result(
                    target_ip,
                    device_context,
                    start_time,
                    notice=f"Host unreachable via live Nmap probe ({proc.stderr.strip() or 'Host offline'}). Evaluated defensive simulation model."
                )

        except subprocess.TimeoutExpired:
            return self._generate_simulated_scan_result(
                target_ip,
                device_context,
                start_time,
                notice="Nmap probe timed out. Evaluated defensive simulation model."
            )
        except Exception as e:
            return self._generate_simulated_scan_result(
                target_ip,
                device_context,
                start_time,
                notice=f"Nmap execution error: {str(e)}. Evaluated defensive simulation model."
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
                        remediation = "Keep service patched."
                        if portid == 80:
                            severity = "HIGH"
                            remediation = "Enforce HTTPS encryption (port 443) and redirect plaintext HTTP."
                        elif portid == 502:
                            severity = "HIGH"
                            remediation = "Isolate Modbus protocol on a dedicated microsegment; enforce TLS encapsulation or ACLs."
                        elif portid == 2575:
                            severity = "MEDIUM"
                            remediation = "Ensure HL7 MLLP feeds use TLS encryption tunnels (port 2575/TLS) to protect patient health records."

                        findings.append(ScannerFinding(
                            title=f"Open Port {portid} ({service_name}) Detected",
                            description=f"Service '{service_product} {service_version}'. Port is open and responding on {target_ip}.",
                            severity=severity,
                            category="PORT",
                            affected_port=portid,
                            affected_service=service_name,
                            remediation_guidance=remediation,
                            raw_evidence={"port": portid, "service": service_name, "product": service_product}
                        ))
        except Exception:
            pass
        return findings

    def _generate_simulated_scan_result(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        start_time: float,
        notice: Optional[str] = None
    ) -> ScannerResult:
        device_type = device_context.get("device_type", "").lower()
        findings: List[ScannerFinding] = []

        if "infusion" in device_type:
            findings.extend([
                ScannerFinding(
                    title="Plaintext HTTP Management Interface Exposed",
                    description="Port 80 is serving an unencrypted web configuration interface exposing device state without TLS.",
                    severity="HIGH",
                    category="SSL/TLS",
                    affected_port=80,
                    affected_service="http",
                    remediation_guidance="Disable HTTP and enforce HTTPS with HSTS on port 443.",
                    raw_evidence={"port": 80, "server": "Embedded-Web/2.1", "plaintext_auth": True}
                ),
                ScannerFinding(
                    title="Self-Signed TLS Certificate on Management Port",
                    description="Port 8443 uses a default vendor self-signed X.509 certificate expiring 2024.",
                    severity="LOW",
                    category="CONFIGURATION",
                    affected_port=8443,
                    affected_service="https",
                    remediation_guidance="Deploy hospital enterprise PKI certificate signed by trusted internal CA.",
                    raw_evidence={"port": 8443, "issuer": "Vendor Self-Signed CA", "valid": False}
                )
            ])
        elif "ventilator" in device_type:
            findings.extend([
                ScannerFinding(
                    title="Industrial Protocol Modbus/TCP Exposed Without Authentication",
                    description="Port 502 (Modbus/TCP) is open on the clinical network segment without native authentication.",
                    severity="HIGH",
                    category="PROTOCOL",
                    affected_port=502,
                    affected_service="modbus",
                    remediation_guidance="Implement strict VLAN microsegmentation and firewall ACLs restricting Modbus access solely to authorized central telemetry servers.",
                    raw_evidence={"port": 502, "protocol": "Modbus/TCP", "auth_required": False}
                ),
                ScannerFinding(
                    title="Cleartext HL7 Medical Telemetry Broadcast",
                    description="Port 2575 is actively broadcasting unencrypted HL7 Minimal Lower Layer Protocol (MLLP) frames.",
                    severity="HIGH",
                    category="PROTOCOL",
                    affected_port=2575,
                    affected_service="hl7-mllp",
                    remediation_guidance="Upgrade HL7 endpoint to use TLS encapsulation (HL7 over TLS) to safeguard patient physiological metrics.",
                    raw_evidence={"port": 2575, "protocol": "HL7 v2.5", "tls_enabled": False}
                )
            ])
        elif "ecg" in device_type:
            findings.extend([
                ScannerFinding(
                    title="Unencrypted HL7 Telemetry Stream",
                    description="Port 2575 is streaming continuous ECG lead telemetry without transport-layer encryption.",
                    severity="HIGH",
                    category="PROTOCOL",
                    affected_port=2575,
                    affected_service="hl7",
                    remediation_guidance="Tunnel ECG telemetry through IPsec or TLS-encrypted gateway broker.",
                    raw_evidence={"port": 2575, "stream": "ECG-Waveform-Feed", "encryption": "none"}
                ),
                ScannerFinding(
                    title="Legacy SSLv3 / TLS 1.0 Negotiation Supported",
                    description="Port 443 web viewer supports deprecated TLS 1.0 cipher suites susceptible to downgrade attacks.",
                    severity="MEDIUM",
                    category="SSL/TLS",
                    affected_port=443,
                    affected_service="https",
                    remediation_guidance="Disable TLS 1.0 and TLS 1.1; enforce TLS 1.2 and TLS 1.3 only.",
                    raw_evidence={"port": 443, "min_tls": "TLSv1.0"}
                )
            ])
        else:
            findings.append(ScannerFinding(
                title="Generic IoMT Discovery Port Open",
                description="Port 8080 responding to HTTP service requests.",
                severity="MEDIUM",
                category="PORT",
                affected_port=8080,
                affected_service="http-proxy",
                remediation_guidance="Restrict access to authorized administrative subnet.",
                raw_evidence={"port": 8080}
            ))

        msg = notice or "Nmap is not installed/configured on host system. Simulated IoMT defensive scan telemetry applied."

        return ScannerResult(
            tool_name=self.tool_name,
            status="SIMULATED",
            target_ip=target_ip,
            available=False,
            execution_time_seconds=round(time.time() - start_time, 2),
            findings=findings,
            raw_output=f"Notice: {msg}",
            error_message=None,
            is_simulated=True,
            metadata={
                "fallback_reason": msg,
                "target_device": device_context.get("name", "IoMT Asset"),
                "scanned_ports": [f.affected_port for f in findings if f.affected_port]
            }
        )
