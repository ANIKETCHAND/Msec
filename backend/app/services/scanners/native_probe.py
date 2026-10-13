"""Native Defensive Probe Scanner Adapter for MediShield.

Executes strictly non-destructive socket, TLS, and HTTP configuration probes
using Python's standard library. Always available on any operating system without
requiring external binary installations.

Provides authentic network evidence, TLS certificates, and HTTP response headers.
"""

import socket
import ssl
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.scanners.base import BaseScannerAdapter, ScannerResult, ScannerFinding


class NativeProbeAdapter(BaseScannerAdapter):
    """Native Python defensive port, TLS, and configuration auditor."""

    tool_name = "native_probe"
    version = "1.2.0"

    # Authorized IoMT ports for defensive connection checks
    DEFAULT_PORTS = [80, 443, 8080, 8000, 8443, 502, 2575]

    def check_availability(self) -> Dict[str, Any]:
        return {
            "tool": self.tool_name,
            "available": True,
            "status": "AVAILABLE",
            "path": "built-in (python3.socket.ssl)",
            "message": "MediShield Native Defensive Network & TLS Prober is operational."
        }

    def execute(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> ScannerResult:
        start_time = time.time()
        findings: List[ScannerFinding] = []
        raw_logs: List[str] = []
        open_ports: List[int] = []
        observed_tls: Dict[str, Any] = {}
        observed_headers: Dict[str, str] = {}

        raw_logs.append(f"[*] Starting MediShield Native Probe against {target_ip} at {datetime.now(timezone.utc).isoformat()}")

        # 1. Port Availability Checks
        ports_to_check = options.get("ports", self.DEFAULT_PORTS) if options else self.DEFAULT_PORTS
        timeout_val = float(options.get("timeout", 0.4)) if options else 0.4
        for port in ports_to_check:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout_val)
                res = sock.connect_ex((target_ip, port))
                if res == 0:
                    open_ports.append(port)
                    raw_logs.append(f"[+] Port {port}/TCP: OPEN")

                    # Try banner grab
                    try:
                        sock.sendall(b"HEAD / HTTP/1.0\r\n\r\n")
                        banner = sock.recv(256).decode("utf-8", errors="ignore").strip()
                        if banner:
                            raw_logs.append(f"    Banner: {banner[:80]}")
                    except Exception:
                        pass
                    service_desc = {
                        80: ("HTTP Web Interface", "LOW"),
                        443: ("HTTPS Secure Web Interface", "INFO"),
                        8080: ("HTTP Alternate / Management Interface", "LOW"),
                        8000: ("HTTP Alternate Service", "LOW"),
                        8443: ("HTTPS Alternate Service", "INFO"),
                        502: ("Modbus Industrial / IoMT Protocol (Unencrypted)", "HIGH"),
                        2575: ("HL7 Healthcare Interface (Unencrypted)", "HIGH")
                    }.get(port, (f"TCP Service (Port {port})", "LOW"))

                    findings.append(ScannerFinding(
                        title=f"Open Port Identified: {port}/TCP ({service_desc[0]})",
                        description=f"Defensive port audit confirmed that port {port}/TCP is actively listening on target {target_ip}. Service profile: {service_desc[0]}.",
                        severity=service_desc[1],
                        category="PORT_DISCOVERY",
                        affected_port=port,
                        affected_service=service_desc[0],
                        remediation_guidance="Verify whether this network service is strictly necessary for device clinical operation. Apply host firewall or ACL rules to restrict access to authorized management subnets.",
                        raw_evidence={
                            "verification_status": "Observation",
                            "source_type": "Scanner finding",
                            "tool_version": f"MediShield Native Probe {self.version}",
                            "port": port,
                            "protocol": "TCP",
                            "banner": banner if 'banner' in locals() and banner else "None",
                            "source_tool": "native_probe"
                        }
                    ))
                else:
                    raw_logs.append(f"[-] Port {port}/TCP: CLOSED / FILTERED (code {res})")
                sock.close()
            except Exception as e:
                raw_logs.append(f"[-] Port {port}/TCP: ERROR ({str(e)})")

        raw_logs.append(f"[*] Port discovery completed: {len(open_ports)} open ports observed ({open_ports})")

        # 2. TLS Handshake & Certificate Inspection (if port 443 or 8443 open, or explicitly requested)
        tls_ports = [p for p in open_ports if p in [443, 8443]]
        # If testing a hostname or domain target where 443 might be active
        if not tls_ports and (target_ip == "127.0.0.1" or "juice-shop" in target_ip or "owasp" in target_ip):
            tls_ports = [443]

        for tls_port in tls_ports:
            try:
                raw_logs.append(f"[*] Attempting TLS handshake on {target_ip}:{tls_port}...")
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE  # Defensive inspection even on internal self-signed IoMT certs

                with socket.create_connection((target_ip, tls_port), timeout=3.0) as plain_sock:
                    with ctx.wrap_socket(plain_sock, server_hostname=target_ip) as ssock:
                        cipher = ssock.cipher()
                        version = ssock.version()
                        cert = ssock.getpeercert(binary_form=False) or {}

                        observed_tls = {
                            "protocol_version": version,
                            "cipher_suite": cipher[0] if cipher else "Unknown",
                            "key_exchange_bits": cipher[2] if cipher else None,
                            "subject": cert.get("subject", []),
                            "issuer": cert.get("issuer", []),
                            "valid_to": cert.get("notAfter", "")
                        }
                        raw_logs.append(f"[+] TLS handshake succeeded: {version}, Cipher: {cipher[0] if cipher else 'N/A'}")

                        # Positive Control finding for modern TLS
                        if version in ["TLSv1.2", "TLSv1.3"]:
                            findings.append(ScannerFinding(
                                title="Transport Layer Security Verified (Positive Control)",
                                description=f"The endpoint negotiates secure encrypted transport over {version} using cipher suite {cipher[0] if cipher else 'AES-GCM'}.",
                                severity="INFO",
                                category="SSL/TLS",
                                affected_port=tls_port,
                                affected_service="HTTPS",
                                remediation_guidance="Maintain modern TLS protocols (TLS 1.2+). Regularly verify CA certificate validity and avoid legacy SSLv3/TLSv1.0.",
                                raw_evidence={
                                    "verification_status": "Positive Control",
                                    "source_type": "Scanner finding",
                                    "tool_version": f"MediShield Native Probe {self.version}",
                                    "tls_details": observed_tls,
                                    "source_tool": "native_probe"
                                }
                            ))
                        else:
                            findings.append(ScannerFinding(
                                title="Legacy TLS Protocol Version Negotiated",
                                description=f"The endpoint negotiated deprecated protocol {version}. Legacy TLS protocols are susceptible to cryptographic downgrade attacks.",
                                severity="HIGH",
                                category="SSL/TLS",
                                affected_port=tls_port,
                                affected_service="HTTPS",
                                remediation_guidance="Disable SSLv2, SSLv3, TLS 1.0, and TLS 1.1 on the medical endpoint server. Enforce TLS 1.2 or TLS 1.3 only.",
                                raw_evidence={
                                    "verification_status": "Confirmed Vulnerability",
                                    "source_type": "Scanner finding",
                                    "tool_version": f"MediShield Native Probe {self.version}",
                                    "tls_details": observed_tls,
                                    "source_tool": "native_probe"
                                }
                            ))
            except Exception as e:
                raw_logs.append(f"[-] TLS probe error on port {tls_port}: {str(e)}")

        # 3. HTTP Headers & Security Configuration Audit (if port 80, 443, 8080, or 8000 open)
        http_ports = [p for p in open_ports if p in [80, 443, 8080, 8000, 8443]]
        # If testing local server
        if not http_ports and 8000 in ports_to_check:
            http_ports = [8000]

        for http_port in http_ports:
            scheme = "https" if http_port in [443, 8443] else "http"
            url = f"{scheme}://{target_ip}:{http_port}/"
            raw_logs.append(f"[*] Auditing HTTP security headers at {url}...")

            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "MediShield-Defensive-Sensor/1.2 (IoMT Security Audit)"}
                )
                # Ignore self-signed internal certificates
                ssl_context = ssl._create_unverified_context() if scheme == "https" else None
                with urllib.request.urlopen(req, timeout=3.0, context=ssl_context) as resp:
                    resp_headers = dict(resp.headers)
                    observed_headers = {k.lower(): v for k, v in resp_headers.items()}
                    raw_logs.append(f"[+] HTTP {resp.status} response received. Observed headers: {list(observed_headers.keys())}")

                    # Header 1: Server banner disclosure
                    if "server" in observed_headers:
                        server_val = observed_headers["server"]
                        raw_logs.append(f"[i] Server Header Disclosed: {server_val}")
                        findings.append(ScannerFinding(
                            title=f"Web Server Platform Banner Disclosure: {server_val}",
                            description=f"The endpoint exposes its underlying software banner '{server_val}' in HTTP responses.",
                            severity="LOW",
                            category="CONFIGURATION",
                            affected_port=http_port,
                            affected_service="HTTP",
                            remediation_guidance="Minimize or obfuscate identifying Server response headers at the application or reverse proxy layer to restrict reconnaissance.",
                            raw_evidence={
                                "verification_status": "Observation",
                                "source_type": "Scanner finding",
                                "tool_version": f"MediShield Native Probe {self.version}",
                                "header_observed": f"Server: {server_val}",
                                "cwe_id": "CWE-200",
                                "source_tool": "native_probe"
                            }
                        ))

                    # Header 2: Wildcard CORS
                    if "access-control-allow-origin" in observed_headers:
                        cors_val = observed_headers["access-control-allow-origin"]
                        if cors_val == "*":
                            findings.append(ScannerFinding(
                                title="Wildcard CORS Policy (Access-Control-Allow-Origin: *)",
                                description="The HTTP service responds with a wildcard cross-origin resource sharing policy (Access-Control-Allow-Origin: *), permitting external scripts to read responses.",
                                severity="LOW",
                                category="CONFIGURATION",
                                affected_port=http_port,
                                affected_service="HTTP",
                                remediation_guidance="Restrict CORS headers to an explicit allow-list of authorized clinical application origins instead of a wildcard.",
                                raw_evidence={
                                    "verification_status": "Observation",
                                    "source_type": "Scanner finding",
                                    "tool_version": f"MediShield Native Probe {self.version}",
                                    "header_observed": "Access-Control-Allow-Origin: *",
                                    "cwe_id": "CWE-942",
                                    "source_tool": "native_probe"
                                }
                            ))

                    # Header 3: Missing X-Content-Type-Options
                    if "x-content-type-options" not in observed_headers:
                        findings.append(ScannerFinding(
                            title="Missing X-Content-Type-Options Security Header",
                            description="The HTTP response does not include 'X-Content-Type-Options: nosniff', which instructs browsers not to MIME-sniff responses away from the declared Content-Type.",
                            severity="LOW",
                            category="CONFIGURATION",
                            affected_port=http_port,
                            affected_service="HTTP",
                            remediation_guidance="Configure the web server to return 'X-Content-Type-Options: nosniff' on all responses.",
                            raw_evidence={
                                "verification_status": "Observation",
                                "source_type": "Scanner finding",
                                "tool_version": f"MediShield Native Probe {self.version}",
                                "missing_header": "X-Content-Type-Options: nosniff",
                                "source_tool": "native_probe"
                            }
                        ))

                    # Header 4: Missing Content-Security-Policy
                    if "content-security-policy" not in observed_headers:
                        findings.append(ScannerFinding(
                            title="Missing Content-Security-Policy (CSP) Header",
                            description="The web service does not declare a Content-Security-Policy header, reducing defense-in-depth against cross-site scripting and unauthorized resource embedding.",
                            severity="LOW",
                            category="CONFIGURATION",
                            affected_port=http_port,
                            affected_service="HTTP",
                            remediation_guidance="Implement a restrictive Content-Security-Policy header defining trusted script, style, and object sources.",
                            raw_evidence={
                                "verification_status": "Observation",
                                "source_type": "Scanner finding",
                                "tool_version": f"MediShield Native Probe {self.version}",
                                "missing_header": "Content-Security-Policy",
                                "source_tool": "native_probe"
                            }
                        ))

                    # Header 5: Missing Strict-Transport-Security on HTTPS
                    if scheme == "https" and "strict-transport-security" not in observed_headers:
                        findings.append(ScannerFinding(
                            title="Missing HTTP Strict Transport Security (HSTS) Header",
                            description="The HTTPS web endpoint does not declare 'Strict-Transport-Security', allowing potential unencrypted downgrade on initial connections.",
                            severity="LOW",
                            category="SSL/TLS",
                            affected_port=http_port,
                            affected_service="HTTPS",
                            remediation_guidance="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to all HTTPS responses.",
                            raw_evidence={
                                "verification_status": "Observation",
                                "source_type": "Scanner finding",
                                "tool_version": f"MediShield Native Probe {self.version}",
                                "missing_header": "Strict-Transport-Security",
                                "source_tool": "native_probe"
                            }
                        ))

            except urllib.error.HTTPError as e:
                raw_logs.append(f"[-] HTTP Error {e.code} on {url}: {e.reason}")
            except Exception as e:
                raw_logs.append(f"[-] HTTP Probe failed on {url}: {str(e)}")

        # 4. Check for robots.txt if HTTP was accessible
        if http_ports:
            primary_port = http_ports[0]
            scheme = "https" if primary_port in [443, 8443] else "http"
            robots_url = f"{scheme}://{target_ip}:{primary_port}/robots.txt"
            try:
                req = urllib.request.Request(robots_url, headers={"User-Agent": "MediShield-Defensive-Sensor/1.2"})
                ssl_context = ssl._create_unverified_context() if scheme == "https" else None
                with urllib.request.urlopen(req, timeout=2.0, context=ssl_context) as r_resp:
                    content = r_resp.read().decode("utf-8", errors="ignore").strip()
                    if content and len(content) > 0:
                        lines = [l for l in content.splitlines() if l.strip() and not l.startswith("#")]
                        raw_logs.append(f"[+] robots.txt present with {len(lines)} active directive(s).")
                        findings.append(ScannerFinding(
                            title=f"robots.txt Present with {len(lines)} Directives",
                            description=f"The endpoint serves a public robots.txt file containing {len(lines)} directive(s). Sensitive management or diagnostic paths may be inadvertently exposed.",
                            severity="INFO",
                            category="CONFIGURATION",
                            affected_port=primary_port,
                            affected_service="HTTP",
                            remediation_guidance="Review robots.txt contents. Ensure administrative clinical paths are protected by strict authentication rather than obscurity.",
                            raw_evidence={
                                "verification_status": "Observation",
                                "source_type": "Scanner finding",
                                "tool_version": f"MediShield Native Probe {self.version}",
                                "directive_count": len(lines),
                                "robots_sample": content[:200],
                                "source_tool": "native_probe"
                            }
                        ))
            except Exception:
                pass

        # 5. Positive Control if all audited management ports are closed / filtered
        if not findings:
            ports_list_str = ", ".join(str(p) for p in ports_to_check[:6])
            findings.append(ScannerFinding(
                title="Management Port Exposure Audit — Ports Filtered (Positive Control)",
                description=f"Defensive port discovery against {target_ip} verified that standard audited management ports ({ports_list_str}) are closed or filtered, minimizing network-layer exposure.",
                severity="INFO",
                category="NETWORK_EXPOSURE",
                affected_port=0,
                affected_service="TCP",
                remediation_guidance="Maintain existing perimeter filtering and microsegmentation rules to prevent exposure of sensitive medical equipment interfaces.",
                raw_evidence={
                    "verification_status": "Positive Control",
                    "source_type": "Scanner finding",
                    "tool_version": f"MediShield Native Probe {self.version}",
                    "ports_checked": ports_to_check,
                    "target_ip": target_ip,
                    "source_tool": "native_probe"
                }
            ))

        elapsed = time.time() - start_time
        status_str = "COMPLETED"

        raw_logs.append(f"[*] Probe completed in {round(elapsed, 2)}s. {len(findings)} observations recorded.")

        return ScannerResult(
            tool_name=self.tool_name,
            status=status_str,
            target_ip=target_ip,
            available=True,
            execution_time_seconds=round(elapsed, 2),
            findings=findings,
            raw_output="\n".join(raw_logs),
            is_simulated=False,
            metadata={
                "open_ports": open_ports,
                "tls_inspected": observed_tls,
                "headers_count": len(observed_headers),
                "probed_at": datetime.now(timezone.utc).isoformat()
            }
        )
