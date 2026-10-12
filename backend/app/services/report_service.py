"""Report Generation Service for MediShield IoMT Platform.

Generates professional PDF security audit reports via ReportLab and
standalone, sanitized HTML audit reports via Jinja2, complete with
tamper-evident SHA-256 integrity verification.
"""

import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from jinja2 import Template

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)

from app.models.db_models import (
    AssessmentModel,
    DeviceModel,
    FindingModel,
    ReportModel,
    AuditLogModel,
    UserModel
)
from app.core.exceptions import ResourceNotFoundException, ReportGenerationException

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports_storage")
os.makedirs(REPORTS_DIR, exist_ok=True)


HTML_REPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediShield Assessment Report - {{ assessment.id }}</title>
  <style>
    :root {
      --bg: #F5F6F8;
      --surface: #FFFFFF;
      --text: #171717;
      --text-muted: #6B7280;
      --border: #E5E7EB;
      --primary: #1677FF;
      --critical: #EF4444;
      --warning: #F59E0B;
      --success: #10B981;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 24px;
      font-size: 14px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-critical { background: #FEE2E2; color: #991B1B; }
    .badge-high { background: #FFEDD5; color: #9A3412; }
    .badge-medium { background: #FEF3C7; color: #92400E; }
    .badge-low { background: #E0E7FF; color: #3730A3; }
    .badge-info { background: #F3F4F6; color: #374151; }
    .badge-success { background: #DCFCE7; color: #166534; }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
      background: #FAFAFA;
    }
    .card h3 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .meta-label { color: var(--text-muted); }
    .meta-value { font-weight: 500; }
    
    .score-display {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-top: 8px;
    }
    .score-num {
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .score-denom { font-size: 16px; color: var(--text-muted); }
    
    .findings-summary {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }
    .findings-pill {
      flex: 1;
      text-align: center;
      padding: 10px;
      border-radius: 4px;
      background: #FFF;
      border: 1px solid var(--border);
    }
    .findings-pill .val { font-size: 18px; font-weight: 700; }
    .findings-pill .lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
      font-size: 13px;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      background: #FAFAFA;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    
    .footer {
      border-top: 1px solid var(--border);
      padding-top: 24px;
      margin-top: 40px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hash-seal {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 11px;
      background: #F3F4F6;
      padding: 4px 8px;
      border-radius: 3px;
      word-break: break-all;
    }
    @media print {
      body { background: #FFF; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand-title">MediShield IoMT Security Assessment Report</div>
        <div class="brand-sub">Defensive Security Evaluation &amp; Vulnerability Posture Audit</div>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-{{ 'success' if assessment.security_score >= 80 else 'warning' if assessment.security_score >= 60 else 'critical' }}">
          Status: {{ assessment.status }}
        </span>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
          Report ID: {{ report_id }}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Target Device Information</h3>
        <div class="meta-row">
          <span class="meta-label">Device Name:</span>
          <span class="meta-value">{{ device.name if device else 'N/A' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Device ID:</span>
          <span class="meta-value">{{ device.id if device else assessment.device_id }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Device Type:</span>
          <span class="meta-value">{{ device.device_type if device else 'Unknown' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Target IP Address:</span>
          <span class="meta-value">{{ assessment.target_ip }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Network Segment:</span>
          <span class="meta-value">{{ device.network_segment if device else 'Standard VLAN' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Assessment Profile:</span>
          <span class="meta-value">{{ assessment.profile }}</span>
        </div>
      </div>

      <div class="card">
        <h3>Posture Score &amp; Impact</h3>
        <div class="score-display">
          <div class="score-num" style="color: {{ '#10B981' if assessment.security_score >= 80 else '#F59E0B' if assessment.security_score >= 60 else '#EF4444' }};">
            {{ assessment.security_score | round(1) }}
          </div>
          <div class="score-denom">/ 100.0</div>
        </div>
        <div class="findings-summary">
          <div class="findings-pill">
            <div class="val" style="color: var(--critical);">{{ assessment.critical_findings }}</div>
            <div class="lbl">Critical</div>
          </div>
          <div class="findings-pill">
            <div class="val" style="color: #EA580C;">{{ assessment.high_findings }}</div>
            <div class="lbl">High</div>
          </div>
          <div class="findings-pill">
            <div class="val" style="color: var(--warning);">{{ assessment.medium_findings }}</div>
            <div class="lbl">Medium</div>
          </div>
          <div class="findings-pill">
            <div class="val" style="color: var(--primary);">{{ assessment.low_findings }}</div>
            <div class="lbl">Low</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-title">Executive Summary</div>
    <p style="margin-bottom: 28px; line-height: 1.6; color: #374151;">
      {{ assessment.summary or 'Automated defensive security audit concluded with findings normalized and enriched against active IoMT risk rules.' }}
    </p>

    <div class="section-title">Normalized Assessment Findings ({{ findings | length }})</div>
    {% if findings %}
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">Severity</th>
          <th style="width: 25%;">Finding / Title</th>
          <th style="width: 15%;">Category</th>
          <th style="width: 15%;">Port / CVE</th>
          <th style="width: 30%;">Remediation Guidance</th>
        </tr>
      </thead>
      <tbody>
        {% for f in findings %}
        <tr>
          <td>
            <span class="badge badge-{{ f.severity.lower() }}">{{ f.severity }}</span>
          </td>
          <td>
            <strong>{{ f.title }}</strong>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">{{ f.description }}</div>
          </td>
          <td>{{ f.category }}</td>
          <td>
            {% if f.affected_port %}Port {{ f.affected_port }}<br>{% endif %}
            {% if f.cve_id %}<span style="font-family: monospace; font-size: 11px;">{{ f.cve_id }}</span>{% endif %}
            {% if f.cvss_score %}<br>CVSS: {{ f.cvss_score }}{% endif %}
          </td>
          <td style="color: #374151;">
            {{ f.remediation_guidance or 'Remediation guidance unavailable.' }}
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
    {% else %}
    <p style="color: var(--text-muted); margin-bottom: 28px;">No security vulnerabilities or configuration defects identified during this assessment scan.</p>
    {% endif %}

    <div class="footer">
      <div>
        <div>Generated by: {{ generated_by }} &bull; {{ generated_at }}</div>
        <div style="margin-top: 4px;">MediShield Defensive Security Platform &bull; Confidential Clinical Audit</div>
      </div>
      <div>
        <div style="text-align: right; margin-bottom: 2px;">SHA-256 Checksum:</div>
        <div class="hash-seal">{{ sha256_hash }}</div>
      </div>
    </div>
  </div>
</body>
</html>
"""


class ReportService:
    """Enterprise report generator for PDF and standalone HTML formats."""

    def generate_html_report(
        self,
        assessment: AssessmentModel,
        device: Optional[DeviceModel],
        findings: List[FindingModel],
        generated_by: str,
        report_id: Optional[str] = None
    ) -> tuple[bytes, str]:
        """Renders sanitized HTML report and computes SHA-256 seal."""
        rep_id = report_id or f"RPT-HTML-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # First pass without hash (autoescape enabled to prevent stored XSS)
        template = Template(HTML_REPORT_TEMPLATE, autoescape=True)
        prelim_html = template.render(
            assessment=assessment,
            device=device,
            findings=findings,
            generated_by=generated_by,
            generated_at=now_str,
            report_id=rep_id,
            sha256_hash="COMPUTING_INTEGRITY_SEAL..."
        )
        # Compute hash of report payload
        content_hash = hashlib.sha256(prelim_html.encode("utf-8")).hexdigest()

        # Render final html with seal
        final_html = template.render(
            assessment=assessment,
            device=device,
            findings=findings,
            generated_by=generated_by,
            generated_at=now_str,
            report_id=rep_id,
            sha256_hash=content_hash
        )
        return final_html.encode("utf-8"), content_hash

    def generate_pdf_report(
        self,
        assessment: AssessmentModel,
        device: Optional[DeviceModel],
        findings: List[FindingModel],
        generated_by: str,
        report_id: Optional[str] = None
    ) -> tuple[bytes, str]:
        """Generates Swiss-minimalist PDF audit report using ReportLab."""
        rep_id = report_id or f"RPT-PDF-{uuid.uuid4().hex[:8].upper()}"
        temp_pdf_path = os.path.join(REPORTS_DIR, f"{rep_id}_temp.pdf")
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        doc = SimpleDocTemplate(
            temp_pdf_path,
            pagesize=letter,
            leftMargin=0.5 * inch,
            rightMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#171717")
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#6B7280")
        )
        h2_style = ParagraphStyle(
            "SectionH2",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#171717"),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#374151")
        )
        body_bold = ParagraphStyle(
            "DocBodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#171717")
        )
        footer_style = ParagraphStyle(
            "DocFooter",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#9CA3AF")
        )

        elements = []

        # 1. Header Banner
        header_table = Table(
            [
                [
                    Paragraph("MediShield IoMT Security Assessment Report", title_style),
                    Paragraph(f"<b>Status:</b> {assessment.status}<br/><b>Report ID:</b> {rep_id}", subtitle_style)
                ],
                [
                    Paragraph("Clinical Engineering & Defensive Posture Audit", subtitle_style),
                    Paragraph(f"<b>Date:</b> {now_str}", subtitle_style)
                ]
            ],
            colWidths=[4.8 * inch, 2.7 * inch]
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB"), spaceAfter=12))

        # 2. Target Device & Executive Summary Grid
        dev_name = device.name if device else "N/A"
        dev_id = device.id if device else assessment.device_id
        dev_type = device.device_type if device else "Medical Device"
        net_seg = device.network_segment if device else "Standard VLAN"

        score_color = "#10B981" if assessment.security_score >= 80 else ("#F59E0B" if assessment.security_score >= 60 else "#EF4444")

        summary_data = [
            [
                Paragraph("<b>Target Asset:</b>", body_style),
                Paragraph(f"{dev_name} ({dev_id})", body_style),
                Paragraph("<b>Security Score:</b>", body_style),
                Paragraph(f"<font color='{score_color}'><b>{assessment.security_score:.1f} / 100</b></font>", body_bold)
            ],
            [
                Paragraph("<b>Device Type:</b>", body_style),
                Paragraph(f"{dev_type}", body_style),
                Paragraph("<b>Findings:</b>", body_style),
                Paragraph(
                    f"Crit: <b>{assessment.critical_findings}</b> | High: <b>{assessment.high_findings}</b> | Med: <b>{assessment.medium_findings}</b> | Low: <b>{assessment.low_findings}</b>",
                    body_style
                )
            ],
            [
                Paragraph("<b>Target IP / Segment:</b>", body_style),
                Paragraph(f"{assessment.target_ip} / {net_seg}", body_style),
                Paragraph("<b>Audit Profile:</b>", body_style),
                Paragraph(f"{assessment.profile}", body_style)
            ]
        ]
        summary_table = Table(summary_data, colWidths=[1.3 * inch, 2.45 * inch, 1.25 * inch, 2.5 * inch])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 10))

        # 3. Assessment Narrative
        elements.append(Paragraph("Executive Narrative", h2_style))
        elements.append(Paragraph(assessment.summary or "Defensive scanning assessment executed successfully.", body_style))
        elements.append(Spacer(1, 10))

        # 4. Normalized Findings Table
        elements.append(Paragraph(f"Normalized Findings Catalog ({len(findings)} identified)", h2_style))

        finding_rows = [
            [
                Paragraph("<b>Severity</b>", body_bold),
                Paragraph("<b>Finding Title & Description</b>", body_bold),
                Paragraph("<b>Category / CVE</b>", body_bold),
                Paragraph("<b>Remediation Guidance</b>", body_bold)
            ]
        ]

        for f in findings:
            sev_color = {
                "CRITICAL": "#991B1B",
                "HIGH": "#9A3412",
                "MEDIUM": "#92400E",
                "LOW": "#3730A3"
            }.get(f.severity.upper(), "#374151")

            cve_str = f"<br/><font size='6' color='#6B7280'>{f.cve_id or ''} (Port {f.affected_port or 'N/A'})</font>" if (f.cve_id or f.affected_port) else ""
            finding_rows.append([
                Paragraph(f"<font color='{sev_color}'><b>{f.severity}</b></font>", body_bold),
                Paragraph(f"<b>{f.title}</b><br/><font size='7' color='#4B5563'>{f.description[:180]}...</font>", body_style),
                Paragraph(f"{f.category}{cve_str}", body_style),
                Paragraph(f"<font size='7'>{f.remediation_guidance or 'Remediation details in portal.'}</font>", body_style)
            ])

        if len(findings) == 0:
            finding_rows.append([
                Paragraph("INFO", body_bold),
                Paragraph("No vulnerability findings or anomalies detected.", body_style),
                Paragraph("BENIGN", body_style),
                Paragraph("Maintain continuous monitoring.", body_style)
            ])

        findings_table = Table(
            finding_rows,
            colWidths=[0.85 * inch, 2.75 * inch, 1.4 * inch, 2.5 * inch]
        )
        findings_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(findings_table)
        elements.append(Spacer(1, 14))

        # 5. Footer & Hash Seal
        footer_block = [
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB"), spaceAfter=6),
            Paragraph(
                f"Generated by: {generated_by} | MediShield IoMT Security Platform | SHA-256 Seal: COMPUTING...",
                footer_style
            )
        ]
        elements.append(KeepTogether(footer_block))

        doc.build(elements)

        with open(temp_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        file_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Update final PDF path
        final_pdf_path = os.path.join(REPORTS_DIR, f"{rep_id}.pdf")
        if os.path.exists(temp_pdf_path):
            os.replace(temp_pdf_path, final_pdf_path)

        return pdf_bytes, file_hash

    def create_assessment_report(
        self,
        db: Session,
        assessment_id: str,
        report_type: str,
        user: UserModel
    ) -> ReportModel:
        """Orchestrates report generation, file persistence, integrity hashing, and db logging."""
        assessment = db.query(AssessmentModel).filter(AssessmentModel.id == assessment_id).first()
        if not assessment:
            raise ResourceNotFoundException("Assessment", assessment_id)

        device = db.query(DeviceModel).filter(DeviceModel.id == assessment.device_id).first()
        findings = db.query(FindingModel).filter(FindingModel.assessment_id == assessment_id).all()

        clean_type = report_type.upper().strip()
        if clean_type not in ["PDF", "HTML"]:
            raise ReportGenerationException(f"Unsupported report format '{report_type}'. Choose 'PDF' or 'HTML'.")

        report_id = f"RPT-{clean_type}-{uuid.uuid4().hex[:8].upper()}"
        file_ext = "pdf" if clean_type == "PDF" else "html"
        filename = f"{report_id}.{file_ext}"
        target_path = os.path.join(REPORTS_DIR, filename)

        if clean_type == "PDF":
            file_bytes, sha256_hash = self.generate_pdf_report(
                assessment=assessment,
                device=device,
                findings=findings,
                generated_by=user.email,
                report_id=report_id
            )
        else:
            file_bytes, sha256_hash = self.generate_html_report(
                assessment=assessment,
                device=device,
                findings=findings,
                generated_by=user.email,
                report_id=report_id
            )
            with open(target_path, "wb") as f:
                f.write(file_bytes)

        report = ReportModel(
            id=report_id,
            assessment_id=assessment.id,
            device_id=device.id if device else None,
            title=f"Security Audit Report ({clean_type}) - {device.name if device else assessment.device_id}",
            report_type=clean_type,
            file_path=target_path,
            file_size_bytes=len(file_bytes),
            sha256_hash=sha256_hash,
            generated_by=user.email,
            summary=assessment.summary,
            meta_info={
                "total_findings": len(findings),
                "security_score": assessment.security_score,
                "profile": assessment.profile
            },
            created_at=datetime.now(timezone.utc)
        )
        db.add(report)

        # Audit log entry
        audit = AuditLogModel(
            id=str(uuid.uuid4()),
            actor=user.email,
            role=user.role,
            action="REPORT_GENERATED",
            entity_type="Report",
            entity_id=report.id,
            ip_address="127.0.0.1",
            details=f"Generated {clean_type} report for assessment {assessment.id}. SHA256: {sha256_hash[:16]}...",
            status="success"
        )
        db.add(audit)
        db.commit()
        db.refresh(report)
        return report


report_service = ReportService()
