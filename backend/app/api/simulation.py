"""Safe Simulation API Endpoints for Academic Demonstration."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import DeviceModel, SecurityEventModel, AuditLogModel, UserModel
from app.schemas.detection import SimulationScenarioResponse
from app.middleware.rbac import get_current_user

router = APIRouter(prefix="/simulation", tags=["Simulation Controls"])


@router.post("/scenarios/{scenario_name}", response_model=SimulationScenarioResponse)
def trigger_scenario(
    scenario_name: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Triggers safe, controlled simulation scenarios on synthetic application data.
    Never transmits traffic to real clinical hardware or networks.
    """
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]

    if scenario_name == "auth_spike":
        dev = db.query(DeviceModel).filter(DeviceModel.id == "DEV-VENT-502").first()
        dev_id = dev.id if dev else "DEV-VENT-502"
        evt_id = f"EVT-SIM-AUTH-{int(now.timestamp())}-{uid}"

        evt = SecurityEventModel(
            id=evt_id,
            timestamp=now,
            device_id=dev_id,
            event_type="AUTH_FAILURE_SPIKE",
            severity="high",
            rule_id="RULE-AUTH-002",
            rule_name="Repeated Failed Authentication Attempts",
            evidence={"failed_attempts": 12, "window_seconds": 20, "source_ip": "192.168.10.198"},
            suggested_action="Enforce gateway quarantine on attacking host 192.168.10.198.",
            status="open"
        )
        db.add(evt)
        audit = AuditLogModel(
            actor=current_user.email,
            role=current_user.role,
            action="SIMULATION_TRIGGERED",
            entity_type="Simulation",
            entity_id="RULE-AUTH-002",
            details="Triggered brute-force authentication scenario on Ventilator DEV-VENT-502.",
            status="success"
        )
        db.add(audit)
        db.commit()
        return SimulationScenarioResponse(
            scenario="auth_spike",
            status="success",
            affected_device=dev_id,
            event_generated=evt_id,
            message="Triggered brute force authentication surge (12 failures in 20s)."
        )

    elif scenario_name == "traffic_spike":
        dev = db.query(DeviceModel).filter(DeviceModel.id == "DEV-PUMP-204").first()
        dev_id = dev.id if dev else "DEV-PUMP-204"
        evt_id = f"EVT-SIM-NET-{int(now.timestamp())}-{uid}"

        evt = SecurityEventModel(
            id=evt_id,
            timestamp=now,
            device_id=dev_id,
            event_type="UNUSUAL_TRAFFIC_VOLUME",
            severity="high",
            rule_id="RULE-NET-003",
            rule_name="Unusual Simulated Traffic Volume Spike (Potential DoS)",
            evidence={"observed_rate_pps": 1450, "syn_ratio": 0.82, "threshold": 600},
            suggested_action="Throttle switch port on ICU VLAN 10.",
            status="open"
        )
        db.add(evt)
        audit = AuditLogModel(
            actor=current_user.email,
            role=current_user.role,
            action="SIMULATION_TRIGGERED",
            entity_type="Simulation",
            entity_id="RULE-NET-003",
            details="Triggered DoS bandwidth flood scenario on Infusion Pump DEV-PUMP-204.",
            status="success"
        )
        db.add(audit)
        db.commit()
        return SimulationScenarioResponse(
            scenario="traffic_spike",
            status="success",
            affected_device=dev_id,
            event_generated=evt_id,
            message="Triggered high-volume SYN flood surge on Infusion Pump."
        )

    elif scenario_name == "device_offline":
        dev = db.query(DeviceModel).filter(DeviceModel.id == "DEV-GLU-309").first()
        dev_id = dev.id if dev else "DEV-GLU-309"
        if dev:
            dev.status = "offline"
            dev.risk_level = "medium"

        evt_id = f"EVT-SIM-OFF-{int(now.timestamp())}-{uid}"
        evt = SecurityEventModel(
            id=evt_id,
            timestamp=now,
            device_id=dev_id,
            event_type="DEVICE_OFFLINE_UNEXPECTED",
            severity="medium",
            rule_id="RULE-STAT-004",
            rule_name="Clinical Device Unexpectedly Offline",
            evidence={"missed_heartbeats": 4, "last_reported": "Just now"},
            suggested_action="Check battery or Bluetooth gateway coverage in Ward Bed 214.",
            status="open"
        )
        db.add(evt)
        db.commit()
        return SimulationScenarioResponse(
            scenario="device_offline",
            status="success",
            affected_device=dev_id,
            event_generated=evt_id,
            message="Continuous Glucose Monitor DEV-GLU-309 marked offline."
        )

    elif scenario_name == "unknown_device":
        dev_id = f"DEV-ROGUE-{int(now.timestamp()) % 1000}-{uid}"
        rogue_dev = DeviceModel(
            id=dev_id,
            name="Unregistered Wi-Fi Bridge (MAC: 00:09:B0:88:AA:11)",
            device_type="Unknown Hardware",
            ip_address="192.168.10.220",
            mac_address="00:09:B0:88:AA:11",
            firmware_version="1.0.0-unknown",
            network_segment="ICU_VLAN_10",
            status="suspicious",
            risk_level="high"
        )
        db.add(rogue_dev)

        evt_id = f"EVT-SIM-ROGUE-{int(now.timestamp())}-{uid}"
        evt = SecurityEventModel(
            id=evt_id,
            timestamp=now,
            device_id=dev_id,
            event_type="UNKNOWN_DEVICE_DISCOVERY",
            severity="high",
            rule_id="RULE-DEV-001",
            rule_name="Rogue IoMT Device Detected on Critical VLAN",
            evidence={"mac": "00:09:B0:88:AA:11", "vlan": "ICU_VLAN_10"},
            suggested_action="Physically locate device and revoke switch port.",
            status="open"
        )
        db.add(evt)
        db.commit()
        return SimulationScenarioResponse(
            scenario="unknown_device",
            status="success",
            affected_device=dev_id,
            event_generated=evt_id,
            message="Injected rogue unmanaged Wi-Fi hardware bridge onto ICU VLAN."
        )

    elif scenario_name == "normal":
        return SimulationScenarioResponse(
            scenario="normal",
            status="success",
            affected_device="DEV-ECG-001",
            event_generated=None,
            message="Normal clinical heartbeat telemetry streamed without alerts."
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scenario '{scenario_name}'. Supported: auth_spike, traffic_spike, device_offline, unknown_device, normal."
        )


@router.post("/reset")
def reset_simulation(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Resets device states and restores clean demo records."""
    db.query(SecurityEventModel).filter(SecurityEventModel.id.ilike("EVT-SIM-%")).delete(synchronize_session=False)
    db.query(DeviceModel).filter(DeviceModel.id.ilike("DEV-ROGUE-%")).delete(synchronize_session=False)

    glu = db.query(DeviceModel).filter(DeviceModel.id == "DEV-GLU-309").first()
    if glu:
        glu.status = "online"
        glu.risk_level = "low"

    db.commit()
    return {"message": "Simulation states reset successfully."}
