"""Vulnerability Intelligence & IoMT Contextual Clinical Knowledgebase."""

from typing import Dict, Any, Optional


IOMT_CVE_DATABASE: Dict[str, Dict[str, Any]] = {
    "CVE-2020-25165": {
        "cve_id": "CVE-2020-25165",
        "title": "Baxter Spectrum Wireless Infusion Pump Status Leak",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
        "cwe": "CWE-200: Information Exposure",
        "affected_devices": ["Baxter Spectrum V8", "Baxter Sigma Spectrum"],
        "clinical_impact": "Exposure of device network status and battery levels allows attackers to plan targeted interruptions during infusion therapy.",
        "remediation": "Update wireless module firmware to version 2.0+ and restrict management VLAN access."
    },
    "CVE-2021-38399": {
        "cve_id": "CVE-2021-38399",
        "title": "Medtronic Puritan Bennett Critical Care Ventilator Diagnostic Memory Leak",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
        "cwe": "CWE-125: Out-of-bounds Read",
        "affected_devices": ["Puritan Bennett 980 Ventilator"],
        "clinical_impact": "Allows unauthorized read of internal operational memory, potentially exposing vital threshold alarm configurations.",
        "remediation": "Deploy medical firewall rules blocking Modbus and diagnostic port 502/2575 from outside ICU telemetry subnet."
    },
    "CVE-2019-18248": {
        "cve_id": "CVE-2019-18248",
        "title": "Philips IntelliVue Patient Monitor Remote Denial-of-Service / State Tamper",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
        "cwe": "CWE-20: Improper Input Validation",
        "affected_devices": ["Philips IntelliVue MX800", "Philips IntelliVue MP70"],
        "clinical_impact": "Malformed UDP telemetry packets cause display freeze requiring physical power cycle during patient monitoring.",
        "remediation": "Apply vendor security patch and enable 802.1X port authentication on bedside switches."
    },
    "CVE-2022-26391": {
        "cve_id": "CVE-2022-26391",
        "title": "IoMT Gateway Cleartext MQTT Credentials",
        "cvss_score": 8.1,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        "cwe": "CWE-319: Cleartext Transmission of Sensitive Information",
        "affected_devices": ["Medical IoT Gateway", "Wearable Aggregator"],
        "clinical_impact": "Permits unauthorized eavesdropping or injection of patient physiological telemetry feeds.",
        "remediation": "Enforce MQTTS (MQTT over TLS 1.3) with mutual certificate authentication."
    }
}


class VulnerabilityIntelligenceService:
    """Enriches findings with IoMT threat intelligence and clinical context."""

    @staticmethod
    def get_cve_info(cve_id: str) -> Optional[Dict[str, Any]]:
        return IOMT_CVE_DATABASE.get(cve_id.upper())

    @staticmethod
    def enrich_finding(finding: Dict[str, Any]) -> Dict[str, Any]:
        cve = finding.get("cve_id")
        if cve and cve.upper() in IOMT_CVE_DATABASE:
            intel = IOMT_CVE_DATABASE[cve.upper()]
            finding["clinical_impact"] = intel["clinical_impact"]
            finding["cvss_score"] = intel["cvss_score"]
            finding["cwe"] = intel["cwe"]
            if not finding.get("remediation_guidance"):
                finding["remediation_guidance"] = intel["remediation"]
        return finding


vuln_intel_service = VulnerabilityIntelligenceService()
