"""Reports and CSV Export API Endpoints."""

import os
import io
import csv
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Response, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.db_models import (
    SecurityEventModel,
    IncidentModel,
    DeviceModel,
    UserModel,
    ReportModel,
    AssessmentModel,
    FindingModel,
)
from app.schemas.report import ReportResponse, ReportGenerateRequest
from app.services.report_service import report_service
from app.middleware.rbac import require_analyst, get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=List[ReportResponse])
@router.get("/list", response_model=List[ReportResponse])
def list_reports(
    assessment_id: Optional[str] = Query(None, description="Filter by assessment ID"),
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    report_type: Optional[str] = Query(None, description="Filter by PDF or HTML"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List historical PDF and HTML security audit reports."""
    query = db.query(ReportModel)
    if assessment_id:
        query = query.filter(ReportModel.assessment_id == assessment_id)
    if device_id:
        query = query.filter(ReportModel.device_id == device_id)
    if report_type:
        query = query.filter(ReportModel.report_type == report_type.upper())
    return query.order_by(ReportModel.created_at.desc()).offset(skip).limit(limit).all()


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

    total_reports = db.query(ReportModel).count()

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
        },
        "reports": {
            "total": total_reports
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


@router.post("/assessments/{assessment_id}", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report_for_assessment(
    assessment_id: str,
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Generate a PDF or HTML security assessment report."""
    return report_service.create_assessment_report(
        db=db,
        assessment_id=assessment_id,
        report_type=req.report_type,
        user=analyst_user
    )


@router.get("/{report_id}", response_model=ReportResponse)
def get_report_metadata(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve metadata and cryptographic hash seal for a report."""
    rep = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")
    return rep


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Download generated PDF or HTML report file with verified filename."""
    rep = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not rep or not rep.file_path or not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail=f"Report file for '{report_id}' not found.")

    ext = "pdf" if rep.report_type == "PDF" else "html"
    media_type = "application/pdf" if rep.report_type == "PDF" else "text/html; charset=utf-8"
    filename = f"medishield-report-{rep.id}.{ext}"

    return FileResponse(
        path=rep.file_path,
        media_type=media_type,
        filename=filename
    )


@router.get("/{report_id}/pdf")
def get_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve PDF representation of report."""
    rep = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")
    if rep.report_type != "PDF":
        raise HTTPException(status_code=400, detail="Report format is not PDF.")
    if not rep.file_path or not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail="PDF report file not found on disk.")

    return FileResponse(
        path=rep.file_path,
        media_type="application/pdf",
        filename=f"medishield-{rep.id}.pdf"
    )


@router.get("/{report_id}/html")
def get_report_html(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve HTML representation of report."""
    rep = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")
    if rep.report_type != "HTML":
        raise HTTPException(status_code=400, detail="Report format is not HTML.")
    if not rep.file_path or not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail="HTML report file not found on disk.")

    with open(rep.file_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    return Response(content=html_content, media_type="text/html; charset=utf-8")
