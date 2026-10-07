"""Multi-Source Security Event Correlation Engine for MediShield.

Correlates scanner findings, telemetry threshold triggers, and passive IDS alerts
to identify multi-stage IoMT attack chains and raise coordinated incident tickets.
"""

import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.db_models import (
    SecurityEventModel,
    FindingModel,
    IncidentModel,
    DeviceModel,
    AuditLogModel
)


class CorrelationEngine:
    """Correlates disparate IoMT security alerts and creates aggregated incident tickets."""

    @staticmethod
    def correlate_device_events(
        db: Session,
        device_id: str
    ) -> Optional[IncidentModel]:
        """Analyzes recent alerts and findings for a device to detect composite attack chains."""
        device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
        if not device:
            return None

        # Fetch active events from past 2 hours
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        events = db.query(SecurityEventModel).filter(
            SecurityEventModel.device_id == device_id,
            SecurityEventModel.timestamp >= two_hours_ago
        ).all()

        findings = db.query(FindingModel).filter(
            FindingModel.device_id == device_id
        ).all()

        if len(events) < 2 and len(findings) == 0:
            return None

        has_recon = any("port" in e.rule_name.lower() or "scan" in e.rule_name.lower() for e in events) or any(f.category == "PORT" for f in findings)
        has_dos = any("dos" in e.rule_name.lower() or "spike" in e.rule_name.lower() for e in events)
        has_auth_fail = any("auth" in e.rule_name.lower() for e in events)
        has_proto_vuln = any(f.category in ["PROTOCOL", "VULNERABILITY"] for f in findings)

        incident_title = None
        severity = "medium"
        description = ""
        suggested_containment = "SIMULATION: Quarantine device to isolated investigation VLAN."

        # Pattern 1: Reconnaissance followed by Traffic Flood (Multi-Stage IoMT Penetration)
        if has_recon and has_dos:
            incident_title = f"Multi-Stage Penetration Attack Chain Detected on {device.name}"
            severity = "critical"
            description = (
                f"Correlation Engine identified coordinated attack stages: Initial network reconnaissance/port enumeration "
                f"followed by high-volume traffic flooding directed at {device.ip_address} on {device.network_segment}."
            )
            suggested_containment = "SIMULATION ONLY: Activate VLAN 99 Quarantine Isolation on switch port; restrict ingress packet rate."

        # Pattern 2: Protocol Vulnerability + Traffic Anomaly
        elif has_proto_vuln and (has_dos or has_auth_fail):
            incident_title = f"Vulnerability Exploitation Attempt on {device.name}"
            severity = "high"
            description = (
                f"Device has known protocol exposure ({', '.join(set(f.title for f in findings[:2]))}) and experienced "
                f"subsequent active traffic violations or authentication anomalies."
            )
            suggested_containment = "SIMULATION ONLY: Temporarily isolate management web interface; enforce medical firewall ACL."

        # Pattern 3: Repeated Brute Force & State Instability
        elif has_auth_fail and len(events) >= 3:
            incident_title = f"Brute Force Credential Attack & Lockout on {device.name}"
            severity = "high"
            description = f"Repeated unauthorized access attempts exceeding safety threshold detected on {device.name} ({device.ip_address})."
            suggested_containment = "SIMULATION ONLY: Invalidate active device API sessions; rotate cryptographic device keys."

        if not incident_title:
            return None

        # Check if an existing open incident already addresses this
        existing_inc = db.query(IncidentModel).filter(
            IncidentModel.device_id == device_id,
            IncidentModel.status.in_(["new", "investigating"])
        ).first()

        if existing_inc:
            existing_inc.severity = severity
            existing_inc.description = f"{existing_inc.description}\n[Correlation Update]: {description}"
            current_notes = list(existing_inc.notes or [])
            current_notes.append({
                "author": "MediShield Correlation Engine",
                "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                "text": f"Correlated {len(events)} events and {len(findings)} vulnerability findings. Recommended response: {suggested_containment}"
            })
            existing_inc.notes = current_notes
            db.commit()
            return existing_inc

        # Create new coordinated incident
        inc_id = f"INC-CORR-{str(uuid.uuid4())[:8].upper()}"
        now = datetime.now(timezone.utc)
        incident = IncidentModel(
            id=inc_id,
            title=incident_title,
            description=description,
            severity=severity,
            status="new",
            assigned_to="Security Analyst (Tier 2)",
            device_id=device.id,
            notes=[
                {
                    "author": "MediShield Correlation Engine",
                    "time": now.strftime("%H:%M:%S"),
                    "text": f"Correlated {len(events)} events and {len(findings)} vulnerability findings. Recommended response: {suggested_containment}"
                }
            ],
            created_at=now,
            updated_at=now
        )
        db.add(incident)

        # Audit entry
        audit = AuditLogModel(
            id=str(uuid.uuid4()),
            actor="CORRELATION_ENGINE",
            role="SYSTEM",
            action="INCIDENT_CREATED",
            entity_type="Incident",
            entity_id=inc_id,
            ip_address="127.0.0.1",
            details=json.dumps({
                "device_id": device.id,
                "title": incident_title,
                "severity": severity,
                "correlated_event_count": len(events)
            })
        )
        db.add(audit)
        db.commit()
        db.refresh(incident)
        return incident


correlation_engine = CorrelationEngine()
