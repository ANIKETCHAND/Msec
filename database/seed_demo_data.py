"""Controlled Synthetic Seed Data Generator for MediShield.

Generates realistic, completely synthetic medical device records, telemetry streams,
and test events for local development and database population in Phase 3.
"""

from typing import List, Dict, Any


def get_synthetic_devices() -> List[Dict[str, Any]]:
    """Returns baseline simulated medical devices."""
    return [
        {
            "id": "DEV-ECG-101",
            "name": "Bedside Multi-Lead ECG Monitor A",
            "device_type": "ECG Monitor",
            "ip_address": "192.168.10.15",
            "mac_address": "00:1A:7D:DA:71:11",
            "firmware_version": "v3.1.2",
            "network_segment": "ICU_VLAN_10",
            "status": "online",
            "risk_level": "low",
        },
        {
            "id": "DEV-PUMP-204",
            "name": "Smart Infusion Pump B-4",
            "device_type": "Infusion Pump",
            "ip_address": "192.168.10.22",
            "mac_address": "00:1A:7D:DA:71:88",
            "firmware_version": "v1.8.0",
            "network_segment": "ICU_VLAN_10",
            "status": "online",
            "risk_level": "low",
        },
        {
            "id": "DEV-GLU-309",
            "name": "Wireless Continuous Glucose Monitor",
            "device_type": "Glucose Monitor",
            "ip_address": "192.168.20.45",
            "mac_address": "00:1A:7D:DA:82:33",
            "firmware_version": "v2.0.4",
            "network_segment": "WARD_VLAN_20",
            "status": "online",
            "risk_level": "low",
        },
        {
            "id": "DEV-BED-401",
            "name": "Ward Bedside Patient Monitor",
            "device_type": "Bedside Monitor",
            "ip_address": "192.168.20.12",
            "mac_address": "00:1A:7D:DA:82:90",
            "firmware_version": "v4.0.1",
            "network_segment": "WARD_VLAN_20",
            "status": "online",
            "risk_level": "low",
        },
    ]


if __name__ == "__main__":
    print(f"[*] Synthetic seed template ready. {len(get_synthetic_devices())} baseline devices defined.")
