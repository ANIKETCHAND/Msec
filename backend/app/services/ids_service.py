"""Passive Network Monitoring & IDS Integration (Suricata, Zeek, Tshark).

Normalizes EVE JSON and Zeek logs into MediShield Security Events.
"""

import shutil
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session

from app.models.db_models import SecurityEventModel, DeviceModel, AuditLogModel


class IDSManager:
    """Manages Suricata, Zeek, and Tshark adapters and ingests passive network IDS alerts."""

    def __init__(self):
        self.suricata_path = shutil.which("suricata")
        self.zeek_path = shutil.which("zeek")
        self.tshark_path = shutil.which("tshark")

    def check_availability(self) -> Dict[str, Any]:
        return {
            "suricata": {
                "installed": bool(self.suricata_path),
                "path": self.suricata_path,
                "status": "AVAILABLE" if self.suricata_path else "NOT_INSTALLED"
            },
            "zeek": {
                "installed": bool(self.zeek_path),
                "path": self.zeek_path,
                "status": "AVAILABLE" if self.zeek_path else "NOT_INSTALLED"
            },
            "tshark": {
                "installed": bool(self.tshark_path),
                "path": self.tshark_path,
                "status": "AVAILABLE" if self.tshark_path else "NOT_INSTALLED"
            }
        }

    def parse_suricata_eve(self, eve: Dict[str, Any]) -> Dict[str, Any]:
        """Converts Suricata EVE JSON alert entry into normalized MediShield event schema."""
        alert_info = eve.get("alert", {})
        sev_num = alert_info.get("severity", 3)
        severity_map = {1: "critical", 2: "high", 3: "medium", 4: "low"}
        sev_label = severity_map.get(sev_num, "medium")

        return {
            "rule_id": f"SURICATA-{alert_info.get('signature_id', 'ALERT')}",
            "rule_name": alert_info.get("signature", "Suricata Network Anomaly"),
            "severity": sev_label,
            "category": alert_info.get("category", "Network Intrusion"),
            "source_ip": eve.get("src_ip", "unknown"),
            "dest_ip": eve.get("dest_ip", "unknown"),
            "dest_port": eve.get("dest_port", 0),
            "evidence": {
                "signature_id": alert_info.get("signature_id"),
                "proto": eve.get("proto"),
                "app_proto": eve.get("app_proto"),
                "src_ip": eve.get("src_ip"),
                "dest_ip": eve.get("dest_ip"),
                "dest_port": eve.get("dest_port"),
                "flow_id": eve.get("flow_id")
            },
            "suggested_action": "Inspect medical VLAN traffic flow; apply firewall rule to isolate attacking IP."
        }

    def parse_zeek_conn(self, log_entry: Dict[str, Any]) -> Dict[str, Any]:
        """Converts Zeek connection anomaly entry into normalized MediShield event schema."""
        duration = float(log_entry.get("duration", 0.0) or 0.0)
        history = log_entry.get("history", "")
        sev = "medium"
        if "S" in history and "A" not in history and duration > 5.0:
            sev = "high"

        return {
            "rule_id": "ZEEK-CONN-ANOMALY",
            "rule_name": "Zeek Connection Anomaly / Half-Open SYN Probing",
            "severity": sev,
            "category": "Traffic Flow",
            "source_ip": log_entry.get("id.orig_h", "unknown"),
            "dest_ip": log_entry.get("id.resp_h", "unknown"),
            "dest_port": log_entry.get("id.resp_p", 0),
            "evidence": log_entry,
            "suggested_action": "Check gateway connection tables; verify device TLS negotiation."
        }

    def ingest_alert(
        self,
        db: Session,
        alert_payload: Dict[str, Any],
        source_type: str = "suricata"
    ) -> SecurityEventModel:
        """Normalizes external IDS record, matches destination IoMT device, and persists event."""
        if source_type.lower() == "zeek":
            normalized = self.parse_zeek_conn(alert_payload)
        else:
            normalized = self.parse_suricata_eve(alert_payload)

        # Match destination device
        dest_ip = normalized["dest_ip"]
        device = db.query(DeviceModel).filter(DeviceModel.ip_address == dest_ip).first()
        device_id = device.id if device else "UNKNOWN_DEVICE"

        evt_id = f"EVT-IDS-{str(uuid.uuid4())[:8].upper()}"
        event = SecurityEventModel(
            id=evt_id,
            device_id=device_id,
            event_type=normalized.get("category", "IDS_ALERT"),
            rule_id=normalized["rule_id"],
            rule_name=normalized["rule_name"],
            severity=normalized["severity"],
            evidence=normalized["evidence"],
            suggested_action=normalized["suggested_action"],
            status="active",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(event)

        # Update device risk if high/critical
        if device and normalized["severity"] in ["critical", "high"]:
            device.status = "suspicious"
            if normalized["severity"] == "critical":
                device.risk_level = "critical"
            elif device.risk_level != "critical":
                device.risk_level = "high"

        # Log audit entry
        audit = AuditLogModel(
            id=str(uuid.uuid4()),
            actor="IDS_INGESTION_DAEMON",
            role="SYSTEM",
            action="SECURITY_EVENT_CREATED",
            entity_type="SecurityEvent",
            entity_id=evt_id,
            ip_address="127.0.0.1",
            details=json.dumps({
                "source": source_type,
                "rule_name": normalized["rule_name"],
                "device_id": device_id,
                "severity": normalized["severity"]
            })
        )
        db.add(audit)
        db.commit()
        db.refresh(event)
        return event


ids_manager = IDSManager()
