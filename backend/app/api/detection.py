"""Detection Engine API Endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.models.db_models import UserModel
from app.schemas.detection import DetectionEvaluateRequest, DetectionEvaluateResponse
from app.services.detection_engine import detection_engine
from app.services.ml_service import ml_service
from app.middleware.rbac import get_current_user

router = APIRouter(prefix="/detection", tags=["Detection"])


@router.get("/status")
def get_detection_status(current_user: UserModel = Depends(get_current_user)):
    """Retrieve operational status and configuration of Rule Engine and ML Model."""
    return {
        "status": "operational",
        "rule_engine": {
            "status": "active",
            "active_rules": [
                {"id": "RULE-DEV-001", "name": "Rogue IoMT Device Discovery", "severity": "high"},
                {"id": "RULE-AUTH-002", "name": "Repeated Failed Authentication", "threshold": 5, "severity": "high"},
                {"id": "RULE-NET-003", "name": "Unusual Traffic Volume Spike", "threshold_pps": 600, "severity": "high"},
                {"id": "RULE-STAT-004", "name": "Device Unexpectedly Offline", "threshold_heartbeats": 3, "severity": "medium"},
                {"id": "RULE-INT-007", "name": "Cryptographic Integrity Digest Mismatch", "severity": "critical"}
            ]
        },
        "ml_engine": {
            "status": "model_active" if ml_service.is_available() else "trained_weights_ready",
            "metadata": ml_service.model_metadata
        }
    }


@router.post("/evaluate", response_model=DetectionEvaluateResponse)
def evaluate_flow(
    payload: DetectionEvaluateRequest,
    current_user: UserModel = Depends(get_current_user)
):
    """
    Evaluates packet features against deterministic detection rules and machine learning model.
    Clear distinction between rule alerts and ML classifications is maintained.
    """
    # 1. Rule Engine Evaluation
    rule_result = detection_engine.evaluate_telemetry(
        device_id=payload.device_id,
        network_stats={
            "packet_rate": payload.packet_rate,
            "packet_size": payload.packet_size,
            "syn_ratio": payload.syn_ratio,
            "port_entropy": payload.port_entropy,
            "failed_auth_count": payload.failed_auth_count
        }
    )

    # 2. ML Inference Evaluation
    ml_class, confidence, ml_anomaly = ml_service.predict({
        "packet_rate": payload.packet_rate,
        "packet_size": payload.packet_size,
        "syn_ratio": payload.syn_ratio,
        "port_entropy": payload.port_entropy
    })

    if rule_result:
        rule_id, rule_name, severity, evidence, action = rule_result
        return DetectionEvaluateResponse(
            is_anomaly=True,
            detection_type="Rule-Based Security Violation",
            rule_triggered=f"{rule_id}: {rule_name}",
            predicted_class=ml_class,
            confidence=confidence,
            model_version=ml_service.model_metadata["version"],
            severity=severity,
            suggested_action=action,
            evaluated_at=datetime.now(timezone.utc)
        )

    if ml_anomaly:
        return DetectionEvaluateResponse(
            is_anomaly=True,
            detection_type="Machine Learning Flow Anomaly",
            rule_triggered=None,
            predicted_class=ml_class,
            confidence=confidence,
            model_version=ml_service.model_metadata["version"],
            severity="medium",
            suggested_action="Isolate target device for forensic flow inspection.",
            evaluated_at=datetime.now(timezone.utc)
        )

    return DetectionEvaluateResponse(
        is_anomaly=False,
        detection_type="Normal Baseline",
        rule_triggered=None,
        predicted_class=ml_class,
        confidence=confidence,
        model_version=ml_service.model_metadata["version"],
        severity="low",
        suggested_action="No action required. Telemetry flow within expected clinical thresholds.",
        evaluated_at=datetime.now(timezone.utc)
    )
