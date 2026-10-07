"""Scope Validator Engine for MediShield Defensive Security Operations.

Strictly enforces defensive security principles:
- Tools may ONLY operate against devices explicitly registered in MediShield.
- Target IP must match registered device IP.
- Operations must have valid, unexpired, authorized scope certificates.
- Disallowed: DoS, automated exploitation, brute forcing, destructive testing.
"""

from datetime import datetime, timezone
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.db_models import DeviceModel, AssessmentScopeModel, UserModel


ALLOWED_DEFENSIVE_TOOLS = {
    "nmap",
    "nuclei",
    "zap",
    "nikto",
    "openvas",
    "suricata",
    "zeek",
    "tshark",
    "rule_engine"
}

ALLOWED_PROFILES = {
    "DEFENSIVE_AUDIT",
    "PASSIVE_DISCOVERY",
    "COMPLIANCE_SCAN",
    "SERVICE_INVENTORY",
    "CUSTOM"
}

DISALLOWED_ACTIONS = {
    "exploit",
    "brute_force",
    "dos",
    "ddos",
    "credential_crack",
    "destructive_test",
    "reboot",
    "shutdown"
}


class ScopeValidator:
    """Validates authorization scopes and enforces defensive IoMT boundary constraints."""

    @staticmethod
    def validate_new_scope_request(
        db: Session,
        device_id: str,
        target_ip: str,
        assessment_profile: str,
        selected_tools: List[str],
        initiating_user: UserModel
    ) -> DeviceModel:
        """Validates that a new scope request strictly targets a known registered IoMT device."""
        # 1. Initiating User Role Check
        if initiating_user.role not in ["Administrator", "Security Analyst"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{initiating_user.role}' is not authorized to create assessment scopes."
            )

        # 2. Check Device Existence
        device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target device '{device_id}' is not registered in MediShield inventory. Assessments are restricted to registered assets only."
            )

        # 3. Target IP match check (prevents scanning arbitrary Internet hosts)
        if device.ip_address != target_ip:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target IP '{target_ip}' does not match registered device IP '{device.ip_address}'. Unrestricted or off-target scanning is forbidden."
            )

        # 4. Profile validation
        if assessment_profile not in ALLOWED_PROFILES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assessment profile '{assessment_profile}' is unrecognized. Allowed: {list(ALLOWED_PROFILES)}"
            )

        # 5. Tools validation (defensive only)
        for tool in selected_tools:
            tool_clean = tool.lower().strip()
            if tool_clean not in ALLOWED_DEFENSIVE_TOOLS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tool '{tool}' is not an authorized defensive assessment tool."
                )

        return device

    @staticmethod
    def validate_execution_authorization(
        db: Session,
        scope_id: str,
        device_id: str,
        tools: List[str],
        user: UserModel
    ) -> Tuple[AssessmentScopeModel, DeviceModel]:
        """Validates that an execution request corresponds to a valid, active, non-expired scope."""
        # 1. Role Check
        if user.role not in ["Administrator", "Security Analyst"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Analyst or Administrator authorization required to execute assessments."
            )

        # 2. Scope Existence
        scope = db.query(AssessmentScopeModel).filter(AssessmentScopeModel.id == scope_id).first()
        if not scope:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment scope '{scope_id}' does not exist."
            )

        # 3. Status Check
        if scope.authorization_status != "AUTHORIZED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Assessment scope '{scope_id}' is {scope.authorization_status}. Execution is not authorized."
            )

        # 4. Expiration Check
        now = datetime.now(timezone.utc)
        # Ensure scope.expires_at is timezone-aware
        expires_at = scope.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            scope.authorization_status = "EXPIRED"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Assessment scope '{scope_id}' expired at {scope.expires_at.isoformat()}."
            )

        # 5. Device Match
        if scope.device_id != device_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Scope device mismatch: Scope authorized for '{scope.device_id}', attempted on '{device_id}'."
            )

        device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{device_id}' not found."
            )

        # 6. Tools authorized check
        authorized_tools = [t.lower().strip() for t in scope.selected_tools]
        for t in tools:
            if t.lower().strip() not in authorized_tools:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tool '{t}' was not approved in scope '{scope_id}'. Approved: {authorized_tools}"
                )

        return scope, device


scope_validator = ScopeValidator()
