"""Reports and CSV Export API Endpoints."""

import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import SecurityEventModel, IncidentModel, DeviceModel, UserModel
from app.middleware.rbac import require_analyst

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Statistical breakdown of devices, alerts, and incident resolutions."""
    total_devices = db.query(DeviceModel).count()
    online_devices = db.query(DeviceModel).filter(DeviceModel.status == "online").count()
    offline_devices = db.query(DeviceModel).filter(DeviceModel.status == "offline").count()

    total_events = db.query(SecurityEventModel).count()
    critical_events = db.query(SecurityEventModel).filter(SecurityEventModel.severity == "critical").count()
    high_events = db.query(SecurityEventModel).filter(SecurityEventModel.severity == "high").count()

    total_incidents = db.query(IncidentModel).count()
    resolved_incidents = db.query(IncidentModel).filter(IncidentModel.status.in_(["resolved", "closed"])).count()

    return {
        "generated_at": datetime.now(timezone.utc),
        "devices": {
            "total": total_devices,
            "online": online_devices,
            "offline": offline_devices
        },
        "security_events": {
            "total": total_events,
            "critical": critical_events,
            "high": high_events
        },
        "incidents": {
            "total": total_incidents,
            "resolved": resolved_incidents,
            "resolution_rate": round(resolved_incidents / total_incidents, 2) if total_incidents > 0 else 1.0
        }
    }


@router.get("/security-events.csv")
def export_security_events_csv(
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Streams CSV file generated from real stored SecurityEvent records in database."""
    events = db.query(SecurityEventModel).order_by(SecurityEventModel.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["EventID", "Timestamp", "DeviceID", "EventType", "Severity", "RuleID", "RuleName", "Status", "SuggestedAction"])

    for e in events:
        writer.writerow([
            e.id,
            e.timestamp.isoformat() if e.timestamp else "",
            e.device_id or "",
            e.event_type,
            e.severity,
            e.rule_id,
            e.rule_name,
            e.status,
            e.suggested_action or ""
        ])

    csv_data = output.getvalue()
    filename = f"medishield-events-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/incidents.csv")
def export_incidents_csv(
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Streams CSV file generated from real stored Incident records in database."""
    incidents = db.query(IncidentModel).order_by(IncidentModel.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["IncidentID", "Title", "Severity", "Status", "AssignedTo", "DeviceID", "CreatedAt", "ResolutionNotes"])

    for i in incidents:
        writer.writerow([
            i.id,
            i.title,
            i.severity,
            i.status,
            i.assigned_to or "",
            i.device_id or "",
            i.created_at.isoformat() if i.created_at else "",
            i.resolution_notes or ""
        ])

    csv_data = output.getvalue()
    filename = f"medishield-incidents-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/assessments.csv")
def export_assessments_csv(
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Streams CSV file generated from stored Assessment findings in database."""
    from app.models.db_models import FindingModel
    findings = db.query(FindingModel).order_by(FindingModel.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["FindingID", "AssessmentID", "DeviceID", "Severity", "Category", "Title", "CVE", "CVSS", "Port", "Tool", "Remediation"])

    for f in findings:
        writer.writerow([
            f.id,
            f.assessment_id,
            f.device_id,
            f.severity,
            f.category,
            f.title,
            f.cve_id or "",
            f.cvss_score or "",
            f.affected_port or "",
            f.source_tool,
            f.remediation_guidance or ""
        ])

    csv_data = output.getvalue()
    filename = f"medishield-findings-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

