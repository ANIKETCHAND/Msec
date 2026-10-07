"""Explainable Rule-Based Intrusion Detection Engine for IoMT Devices."""

from typing import Dict, Any, Optional, Tuple


class RuleBasedDetectionEngine:
    """Evaluates telemetry, network metrics, and device state against configurable IoMT security rules."""

    def __init__(self):
        # Configurable detection thresholds
        self.auth_failure_threshold = 5
        self.packet_rate_dos_threshold = 600.0  # packets/sec
        self.syn_ratio_threshold = 0.50         # SYN / Total
        self.port_entropy_threshold = 2.8       # Shannon entropy of destination ports
        self.heartbeat_timeout_sec = 180.0

    def get_thresholds(self) -> Dict[str, Any]:
        """Returns the active detection thresholds."""
        return {
            "auth_failure_threshold": self.auth_failure_threshold,
            "packet_rate_dos_threshold": self.packet_rate_dos_threshold,
            "syn_ratio_threshold": self.syn_ratio_threshold,
            "port_entropy_threshold": self.port_entropy_threshold,
            "heartbeat_timeout_sec": self.heartbeat_timeout_sec,
        }

    def update_thresholds(self, **kwargs):
        """Dynamically updates rule detection thresholds."""
        for key, val in kwargs.items():
            if hasattr(self, key) and val is not None:
                setattr(self, key, float(val))


    def evaluate_telemetry(
        self,
        device_id: str,
        network_stats: Dict[str, Any],
        device_status: str = "online"
    ) -> Optional[Tuple[str, str, str, Dict[str, Any], str]]:
        """
        Evaluates metrics. Returns:
        (rule_id, rule_name, severity, evidence, suggested_action) or None if normal.
        """
        # Rule 1: High failed authentication attempts
        failed_auth = network_stats.get("failed_auth_count", network_stats.get("failed_auth", 0))
        if failed_auth >= self.auth_failure_threshold:
            return (
                "RULE-AUTH-002",
                "Repeated Failed Authentication Attempts",
                "high",
                {"failed_attempts": failed_auth, "threshold": self.auth_failure_threshold, "source_ip": network_stats.get("source_ip", "unknown")},
                "Enforce gateway quarantine on attacking host; inspect authentication service logs."
            )

        # Rule 2: DoS / Bandwidth Flood
        pkt_rate = float(network_stats.get("packet_rate", network_stats.get("packet_count", 0)))
        syn_ratio = float(network_stats.get("syn_ratio", 0.0))
        if pkt_rate > self.packet_rate_dos_threshold or syn_ratio > self.syn_ratio_threshold:
            return (
                "RULE-NET-003",
                "Unusual Simulated Traffic Volume Spike (Potential DoS)",
                "high" if pkt_rate > 1000 else "medium",
                {"observed_rate": pkt_rate, "syn_ratio": syn_ratio, "threshold": self.packet_rate_dos_threshold},
                "Throttle switch port on medical VLAN; rate-limit packet flows to target medical device."
            )

        # Rule 3: Port scan / reconnaissance
        entropy = float(network_stats.get("port_entropy", 0.0))
        if entropy > self.port_entropy_threshold:
            return (
                "RULE-NET-008",
                "IoMT Network Reconnaissance / Rapid Port Scan",
                "medium",
                {"port_entropy": entropy, "threshold": self.port_entropy_threshold},
                "Block scanning IP address at border gateway; alert SOC security analyst."
            )

        # Rule 4: Device unexpectedly dropped offline
        if device_status == "offline" and network_stats.get("missed_heartbeats", 0) >= 3:
            return (
                "RULE-STAT-004",
                "Clinical Device Unexpectedly Offline",
                "medium",
                {"missed_heartbeats": network_stats.get("missed_heartbeats", 3), "status": device_status},
                "Verify physical hardware connectivity and battery state in patient room."
            )

        return None


detection_engine = RuleBasedDetectionEngine()
