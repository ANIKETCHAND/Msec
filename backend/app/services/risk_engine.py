"""Transparent Risk Scoring & Security Posture Engine for MediShield IoMT Assets."""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


DEVICE_CRITICALITY_MAP: Dict[str, float] = {
    "ventilator": 1.5,
    "defibrillator": 1.5,
    "infusion pump": 1.3,
    "dialysis machine": 1.3,
    "ecg monitor": 1.1,
    "bedside monitor": 1.1,
    "glucose monitor": 0.9,
    "wearable health patch": 0.9,
    "wearable sensor": 0.9,
    "gateway": 1.0
}

DEPARTMENT_WEIGHT_MAP: Dict[str, float] = {
    "intensive care unit": 1.3,
    "icu": 1.3,
    "surgery & or": 1.3,
    "emergency department": 1.2,
    "emergency": 1.2,
    "general medicine ward": 1.0,
    "general ward": 1.0,
    "ambulatory & cardiology": 0.8,
    "ambulatory": 0.8
}


@dataclass
class RiskEvaluation:
    device_id: str
    overall_score: float  # 0 to 100
    risk_level: str       # LOW, MEDIUM, HIGH, CRITICAL
    criticality_multiplier: float
    department_multiplier: float
    subscores: Dict[str, float]
    deductions: List[Dict[str, Any]]
    recommendations: List[str]


class RiskEngine:
    """Computes transparent, clinical-aware IoMT security posture scores."""

    @classmethod
    def get_criticality_factor(cls, device_type: str) -> float:
        dt = device_type.lower().strip()
        for key, val in DEVICE_CRITICALITY_MAP.items():
            if key in dt:
                return val
        return 1.0

    @classmethod
    def get_department_factor(cls, department: str) -> float:
        dept = (department or "").lower().strip()
        for key, val in DEPARTMENT_WEIGHT_MAP.items():
            if key in dept:
                return val
        return 1.0

    @classmethod
    def evaluate_posture(
        cls,
        device_id: str,
        device_type: str,
        department: str,
        findings: List[Dict[str, Any]]
    ) -> RiskEvaluation:
        crit_mult = cls.get_criticality_factor(device_type)
        dept_mult = cls.get_department_factor(department)

        # Baseline subscores out of 100
        network_score = 100.0
        config_score = 100.0
        vuln_score = 100.0

        deductions: List[Dict[str, Any]] = []
        recommendations: List[str] = []

        for f in findings:
            sev = f.get("severity", "LOW").upper()
            category = f.get("category", "CONFIGURATION").upper()
            title = f.get("title", "Security Finding")

            # Base deduction
            if sev == "CRITICAL":
                base_ded = 25.0
            elif sev == "HIGH":
                base_ded = 15.0
            elif sev == "MEDIUM":
                base_ded = 7.0
            elif sev == "LOW":
                base_ded = 3.0
            else:
                base_ded = 0.0

            # Apply clinical criticality weighting
            weighted_ded = round(base_ded * crit_mult, 1)

            if category in ["PORT", "NETWORK", "PROTOCOL"]:
                network_score = max(0.0, network_score - weighted_ded)
            elif category in ["SSL/TLS", "CONFIGURATION"]:
                config_score = max(0.0, config_score - weighted_ded)
            elif category in ["VULNERABILITY"]:
                vuln_score = max(0.0, vuln_score - weighted_ded)

            deductions.append({
                "title": title,
                "severity": sev,
                "category": category,
                "base_deduction": base_ded,
                "weighted_deduction": weighted_ded,
                "reason": f"{sev} severity {category} finding on {device_type} (weight {crit_mult}x in {department})."
            })

            rec = f.get("remediation_guidance")
            if rec and rec not in recommendations:
                recommendations.append(rec)

        # Composite overall score
        # 40% Network, 30% Config, 30% Vulnerability
        composite = (network_score * 0.40) + (config_score * 0.30) + (vuln_score * 0.30)
        final_score = max(10.0, min(100.0, round(composite, 1)))

        # Risk classification
        if final_score >= 80.0:
            risk_level = "LOW"
        elif final_score >= 65.0:
            risk_level = "MEDIUM"
        elif final_score >= 45.0:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        return RiskEvaluation(
            device_id=device_id,
            overall_score=final_score,
            risk_level=risk_level,
            criticality_multiplier=crit_mult,
            department_multiplier=dept_mult,
            subscores={
                "network_posture": round(network_score, 1),
                "configuration_posture": round(config_score, 1),
                "vulnerability_posture": round(vuln_score, 1)
            },
            deductions=deductions,
            recommendations=recommendations
        )


risk_engine = RiskEngine()
