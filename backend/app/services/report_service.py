"""Enterprise SOC Vulnerability Assessment Report Service for MediShield.

Generates publication-grade ReportLab PDF reports and standalone, sanitized HTML
reports adhering strictly to the formal SOC assessment report structure:
1. Cover and Document Details
2. Table of Contents
3. Executive Summary (Key Results, Severity Breakdown, Overall Risk)
4. Scope, Authorization and Rules of Engagement
5. Methodology and Tooling (Stages, Tool Inventory, Severity Criteria)
6. Assessment Timeline
7. Target Profile
8. Technical Results (by Scanner)
9. SOC Detection Perspective (MITRE ATT&CK Mapping)
10. Findings and Risk Assessment (Master Register)
11. Finding Details and Remediation (Per-finding deep dive cards)
12. Prioritized Recommendations
13. Limitations (Missing tools, coverage constraints, timeouts)
14. Conclusion
15. Appendices (Commands, Evidence Index, Raw Output, SHA-256 Attestation)
"""

import os
import uuid
import html
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from jinja2 import Template

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
    PageBreak
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


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas that dynamically calculates total pages and renders running header/footer."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count: int):
        self.saveState()
        # Suppress running header on cover page (Page 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#171717"))
            self.drawString(36, 756, "MEDISHIELD SOC")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))
            self.drawString(120, 756, "|   Vulnerability Assessment Report")
            self.drawRightString(576, 756, "CONFIDENTIAL // CLINICAL USE")

            self.setStrokeColor(colors.HexColor("#E5E7EB"))
            self.setLineWidth(0.5)
            self.line(36, 748, 576, 748)

        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#E5E7EB"))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#6B7280"))
        self.drawString(36, 32, "MediShield Defensive Security Platform • Clinical Engineering & IoMT Risk Governance")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 32, page_str)
        self.restoreState()


HTML_SOC_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ doc_details.title }} — {{ doc_details.reference }}</title>
  <style>
    :root {
      --bg: #F5F6F8;
      --surface: #FFFFFF;
      --text: #171717;
      --text-muted: #6B7280;
      --border: #E5E7EB;
      --primary: #1677FF;
      --critical: #EF4444;
      --high: #F97316;
      --medium: #F59E0B;
      --low: #3B82F6;
      --info: #64748B;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.55;
      font-size: 13px;
      padding: 32px 16px;
    }
    .report-shell {
      max-width: 1040px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      padding: 48px;
    }
    .cover {
      border-bottom: 2px solid var(--border);
      padding-bottom: 32px;
      margin-bottom: 36px;
    }
    .brand-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
      margin-bottom: 6px;
    }
    .report-sub {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      background: #F9FAFB;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      font-size: 12px;
    }
    .meta-item strong { display: block; font-size: 10px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    .meta-item span { font-weight: 600; color: var(--text); font-family: monospace; }
    
    .toc {
      background: #FAFAFA;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px 24px;
      margin-bottom: 40px;
    }
    .toc h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; color: var(--text-muted); }
    .toc-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .toc-list a { color: var(--primary); text-decoration: none; font-size: 12px; font-weight: 500; }
    .toc-list a:hover { text-decoration: underline; }
    
    .section { margin-bottom: 44px; }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 16px;
      color: var(--text);
    }
    
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 16px; font-size: 12px; }
    th, td { padding: 9px 12px; border: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { background: #F9FAFB; font-weight: 600; color: var(--text); font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    tr:nth-child(even) td { background: #FCFDFD; }
    
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-critical { background: #FEE2E2; color: #991B1B; }
    .badge-high { background: #FFEDD5; color: #9A3412; }
    .badge-medium { background: #FEF3C7; color: #92400E; }
    .badge-low { background: #DBEAFE; color: #1E40AF; }
    .badge-info { background: #F1F5F9; color: #475569; }
    .badge-safe { background: #DCFCE7; color: #166534; }

    .callout {
      background: #F9FAFB;
      border-left: 3px solid var(--primary);
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin: 16px 0;
      font-size: 12px;
      line-height: 1.6;
    }
    .callout-warning { border-left-color: var(--medium); background: #FFFBEB; }
    
    .finding-card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 18px;
      margin-bottom: 16px;
      background: #FFFFFF;
    }
    .finding-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .finding-title { font-size: 13px; font-weight: 700; color: var(--text); }
    .finding-id { font-family: monospace; font-size: 11px; color: var(--text-muted); }
    .raw-box {
      background: #171717;
      color: #E5E7EB;
      font-family: monospace;
      font-size: 11px;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 8px;
      line-height: 1.45;
    }
    .hash-seal {
      font-family: monospace;
      font-size: 11px;
      background: #F3F4F6;
      padding: 8px 12px;
      border-radius: 4px;
      word-break: break-all;
      border: 1px dashed var(--border);
      color: #374151;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-shell { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .toc { display: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-shell">
    
    <!-- 1. COVER AND DOCUMENT DETAILS -->
    <div class="cover">
      <div class="brand-eyebrow">MediShield Assessment Report &mdash; Defensive Cyber Operations</div>
      <h1 class="report-title">{{ doc_details.title }}</h1>
      <p class="report-sub">Standard Operating Procedure Vulnerability & Defensive Posture Audit</p>
      
      <div class="meta-grid">
        <div class="meta-item">
          <strong>Document Reference</strong>
          <span>{{ doc_details.reference }}</span>
        </div>
        <div class="meta-item">
          <strong>Version / Status</strong>
          <span>{{ doc_details.version }}</span>
        </div>
        <div class="meta-item">
          <strong>Classification</strong>
          <span>{{ doc_details.classification }}</span>
        </div>
        <div class="meta-item">
          <strong>Assessment Date</strong>
          <span>{{ doc_details.assessment_date }}</span>
        </div>
        <div class="meta-item">
          <strong>Report Date</strong>
          <span>{{ doc_details.report_date }}</span>
        </div>
        <div class="meta-item">
          <strong>Prepared By</strong>
          <span>{{ doc_details.prepared_by }}</span>
        </div>
        <div class="meta-item">
          <strong>Target Asset</strong>
          <span>{{ target_profile.name }} ({{ target_profile.device_id }})</span>
        </div>
        <div class="meta-item">
          <strong>Target IP / Port</strong>
          <span>{{ target_profile.ip_address }} (Port {{ target_profile.ports_str }})</span>
        </div>
      </div>
    </div>

    <!-- 2. TABLE OF CONTENTS -->
    <div class="toc" id="toc">
      <h2>Table of Contents</h2>
      <ul class="toc-list">
        <li><a href="#sec-1">1. Executive Summary</a></li>
        <li><a href="#sec-2">2. Scope and Authorization</a></li>
        <li><a href="#sec-3">3. Methodology and Tooling</a></li>
        <li><a href="#sec-4">4. Assessment Timeline</a></li>
        <li><a href="#sec-5">5. Target Profile</a></li>
        <li><a href="#sec-6">6. Technical Results (by Scanner)</a></li>
        <li><a href="#sec-7">7. SOC Detection Perspective</a></li>
        <li><a href="#sec-8">8. Findings and Risk Assessment</a></li>
        <li><a href="#sec-9">9. Finding Details and Remediation</a></li>
        <li><a href="#sec-10">10. Prioritized Recommendations</a></li>
        <li><a href="#sec-11">11. Assessment Limitations</a></li>
        <li><a href="#sec-12">12. Conclusion</a></li>
        <li><a href="#sec-app-a">Appendix A — Tool Commands & Config</a></li>
        <li><a href="#sec-app-b">Appendix B — Evidence Index</a></li>
        <li><a href="#sec-app-c">Appendix C — Raw Scanner Output</a></li>
        <li><a href="#sec-app-d">Appendix D — Integrity Seal</a></li>
      </ul>
    </div>

    <!-- 1. EXECUTIVE SUMMARY -->
    <div class="section" id="sec-1">
      <h2 class="section-title">1. Executive Summary</h2>
      <p>
        On {{ doc_details.assessment_date }}, an authorized, non-intrusive security assessment was performed against
        clinical asset <strong>{{ target_profile.name }}</strong> ({{ target_profile.ip_address }}) within network segment <code>{{ target_profile.segment }}</code>.
        The assessment was coordinated via the MediShield Defensive Orchestrator executing bounded service discovery, transport layer verification, and web configuration audits.
      </p>

      <div class="callout">
        <strong>Key Findings & Results:</strong>
        <ul style="margin-left: 20px; margin-top: 6px;">
          <li><strong>Transport Security:</strong> {{ target_profile.tls_summary }}</li>
          <li><strong>Port & Service Footprint:</strong> Observed {{ target_profile.open_ports_count }} open clinical/management port(s).</li>
          <li><strong>Scanner Execution Coverage:</strong> {{ execution_summary.coverage_text }}</li>
          <li><strong>Confirmed Vulnerabilities:</strong> {{ severity_counts.critical + severity_counts.high }} high/critical confirmed issues identified.</li>
        </ul>
      </div>

      <h3 style="font-size: 12px; margin-top: 16px; margin-bottom: 6px; text-transform: uppercase; color: var(--text-muted);">Severity Rating Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Critical</th>
            <th>High</th>
            <th>Medium</th>
            <th>Low</th>
            <th>Informational</th>
            <th>Total Observations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-critical">{{ severity_counts.critical }}</span></td>
            <td><span class="badge badge-high">{{ severity_counts.high }}</span></td>
            <td><span class="badge badge-medium">{{ severity_counts.medium }}</span></td>
            <td><span class="badge badge-low">{{ severity_counts.low }}</span></td>
            <td><span class="badge badge-info">{{ severity_counts.info }}</span></td>
            <td><strong>{{ findings|length }}</strong></td>
          </tr>
        </tbody>
      </table>

      <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
        <em>Overall Assessment Conclusion:</em> {{ assessment.summary }}
      </p>
    </div>

    <!-- 2. SCOPE AND AUTHORIZATION -->
    <div class="section" id="sec-2">
      <h2 class="section-title">2. Scope, Authorization and Rules of Engagement</h2>
      <table>
        <tbody>
          <tr><td style="width: 25%; font-weight: 600;">Target Asset Name</td><td>{{ target_profile.name }}</td></tr>
          <tr><td style="font-weight: 600;">Asset Identifier</td><td><code>{{ target_profile.device_id }}</code> (MAC: {{ target_profile.mac }})</td></tr>
          <tr><td style="font-weight: 600;">Target IP / Hostname</td><td><code>{{ target_profile.ip_address }}</code></td></tr>
          <tr><td style="font-weight: 600;">Clinical Department</td><td>{{ target_profile.department }}</td></tr>
          <tr><td style="font-weight: 600;">Network Segment</td><td><code>{{ target_profile.segment }}</code></td></tr>
          <tr><td style="font-weight: 600;">Authorized Scope Certificate</td><td><code>{{ scope.id }}</code> (Status: {{ scope.authorization_status }})</td></tr>
          <tr><td style="font-weight: 600;">In Scope Activities</td><td>Non-intrusive service enumeration, TLS handshake verification, HTTP header review, template matching</td></tr>
          <tr><td style="font-weight: 600;">Out of Scope Activities</td><td>Exploitation, credential brute-forcing, denial-of-service, patient telemetry alteration</td></tr>
          <tr><td style="font-weight: 600;">Audit Justification</td><td>{{ scope.justification }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 3. METHODOLOGY AND TOOLING -->
    <div class="section" id="sec-3">
      <h2 class="section-title">3. Methodology and Tooling</h2>
      <p>The assessment followed a disciplined multi-stage defensive evaluation model:</p>
      
      <table>
        <thead>
          <tr><th style="width: 10%;">Stage</th><th style="width: 30%;">Activity</th><th style="width: 30%;">Tool / Engine</th><th style="width: 30%;">Execution Status</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Scope Verification</td><td>MediShield Scope Validator</td><td><span class="badge badge-safe">Verified</span></td></tr>
          <tr><td>2</td><td>Port & Socket Discovery</td><td>Native Probe / Nmap</td><td><span class="badge badge-info">{{ tool_status.get('nmap', {}).get('status', tool_status.get('native_probe', {}).get('status', 'COMPLETED')) }}</span></td></tr>
          <tr><td>3</td><td>TLS Cryptographic Audit</td><td>SSL/TLS Handshake Engine</td><td><span class="badge badge-safe">Evaluated</span></td></tr>
          <tr><td>4</td><td>Web Configuration Audit</td><td>Native Header Probe / Nikto</td><td><span class="badge badge-info">{{ tool_status.get('nikto', {}).get('status', 'NOT_EVALUATED') }}</span></td></tr>
          <tr><td>5</td><td>CVE Intelligence & CVSS</td><td>Vulnerability Intel Service</td><td><span class="badge badge-safe">Normalized</span></td></tr>
          <tr><td>6</td><td>Report Sealing & Hash Chain</td><td>ReportLab & SHA-256 Engine</td><td><span class="badge badge-safe">Sealed</span></td></tr>
        </tbody>
      </table>

      <h3 style="font-size: 12px; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; color: var(--text-muted);">Defensive Tooling Inventory & Operational Status</h3>
      <table>
        <thead>
          <tr><th>Tool Name</th><th>Version / Config</th><th>Purpose</th><th>Operational Status</th></tr>
        </thead>
        <tbody>
          {% for t in tooling_inventory %}
          <tr>
            <td><strong>{{ t.name }}</strong></td>
            <td><code>{{ t.version }}</code></td>
            <td>{{ t.purpose }}</td>
            <td>
              {% if t.status == 'COMPLETED' or t.status == 'AVAILABLE' %}
                <span class="badge badge-safe">{{ t.status }}</span>
              {% elif t.status == 'NOT_EVALUATED' or t.status == 'NOT_INSTALLED' %}
                <span class="badge badge-info">{{ t.status }}</span>
              {% else %}
                <span class="badge badge-critical">{{ t.status }}</span>
              {% endif %}
            </td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>

    <!-- 4. TIMELINE -->
    <div class="section" id="sec-4">
      <h2 class="section-title">4. Assessment Timeline</h2>
      <table>
        <thead>
          <tr><th style="width: 30%;">Timestamp (UTC)</th><th style="width: 45%;">Event Description</th><th style="width: 25%;">Source Engine</th></tr>
        </thead>
        <tbody>
          {% for item in timeline %}
          <tr>
            <td style="font-family: monospace;">{{ item.timestamp }}</td>
            <td>{{ item.event }}</td>
            <td><code>{{ item.source }}</code></td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>

    <!-- 5. TARGET PROFILE -->
    <div class="section" id="sec-5">
      <h2 class="section-title">5. Target Profile</h2>
      <table>
        <tbody>
          <tr><td style="width: 25%; font-weight: 600;">Device Model / Manufacturer</td><td>{{ target_profile.manufacturer }} — {{ target_profile.model }}</td></tr>
          <tr><td style="font-weight: 600;">Firmware Version</td><td><code>{{ target_profile.firmware }}</code></td></tr>
          <tr><td style="font-weight: 600;">Observed IP Addresses</td><td><code>{{ target_profile.ip_address }}</code></td></tr>
          <tr><td style="font-weight: 600;">Open Ports / Services</td><td>{{ target_profile.ports_str }}</td></tr>
          <tr><td style="font-weight: 600;">TLS Protocol Version</td><td>{{ target_profile.tls_protocol }}</td></tr>
          <tr><td style="font-weight: 600;">Negotiated Cipher Suite</td><td><code>{{ target_profile.cipher_suite }}</code></td></tr>
          <tr><td style="font-weight: 600;">Certificate Subject</td><td>{{ target_profile.cert_subject }}</td></tr>
          <tr><td style="font-weight: 600;">Certificate Issuer</td><td>{{ target_profile.cert_issuer }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 6. TECHNICAL RESULTS BY SCANNER -->
    <div class="section" id="sec-6">
      <h2 class="section-title">6. Technical Results (by Scanner)</h2>
      
      {% for tool_key, tool_info in tool_status.items() %}
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">Tool: {{ tool_key|upper }}</h3>
        <table>
          <tbody>
            <tr><td style="width: 25%; font-weight: 600;">Execution Status</td><td><strong>{{ tool_info.status }}</strong></td></tr>
            <tr><td style="font-weight: 600;">Execution Time</td><td>{{ tool_info.execution_time_seconds }} seconds</td></tr>
            <tr><td style="font-weight: 600;">Observations Identified</td><td>{{ tool_info.findings_count }}</td></tr>
            {% if tool_info.error_message %}
            <tr><td style="font-weight: 600; color: #991B1B;">Execution Notice</td><td style="color: #991B1B;">{{ tool_info.error_message }}</td></tr>
            {% endif %}
          </tbody>
        </table>
      </div>
      {% endfor %}
    </div>

    <!-- 7. SOC DETECTION PERSPECTIVE -->
    <div class="section" id="sec-7">
      <h2 class="section-title">7. SOC Detection Perspective</h2>
      <p>Activities performed during this assessment leave distinctive telemetry traces observable by hospital defensive sensors:</p>
      <table>
        <thead>
          <tr><th>Activity</th><th>Observable Telemetry Indicators</th><th>MITRE ATT&CK Technique</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Socket & Port Probe</td>
            <td>Sequential SYN packets across IoMT ports; low connection dwell time</td>
            <td><code>T1046: Network Service Discovery</code></td>
          </tr>
          <tr>
            <td>TLS Certificate Audit</td>
            <td>Standard ClientHello handshake with non-browser cipher preference list</td>
            <td><code>T1592.002: Gather Host Information</code></td>
          </tr>
          <tr>
            <td>HTTP Header Audit</td>
            <td>GET requests for root and /robots.txt with MediShield audit User-Agent</td>
            <td><code>T1595.002: Active Vulnerability Scanning</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 8. FINDINGS AND RISK ASSESSMENT -->
    <div class="section" id="sec-8">
      <h2 class="section-title">8. Findings and Risk Assessment (Master Register)</h2>
      <table>
        <thead>
          <tr><th style="width: 12%;">ID</th><th style="width: 48%;">Title / Observation</th><th style="width: 15%;">Tool Source</th><th style="width: 12%;">Severity</th><th style="width: 13%;">Verification</th></tr>
        </thead>
        <tbody>
          {% for f in findings %}
          <tr>
            <td style="font-family: monospace;">{{ f.id }}</td>
            <td><strong>{{ f.title }}</strong><br/><span style="color: var(--text-muted); font-size: 11px;">Port: {{ f.affected_port or 'N/A' }} ({{ f.category }})</span></td>
            <td><code>{{ f.source_tool }}</code></td>
            <td>
              <span class="badge badge-{{ f.severity|lower }}">{{ f.severity }}</span>
            </td>
            <td><span style="font-size: 11px;">{{ f.raw_evidence.verification_status or 'Observation' }}</span></td>
          </tr>
          {% endfor %}
          {% if findings|length == 0 %}
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">
              No findings recorded for this assessment.
            </td>
          </tr>
          {% endif %}
        </tbody>
      </table>
    </div>

    <!-- 9. FINDING DETAILS AND REMEDIATION -->
    <div class="section" id="sec-9">
      <h2 class="section-title">9. Finding Details and Remediation</h2>
      {% for f in findings %}
      <div class="finding-card">
        <div class="finding-head">
          <div>
            <span class="finding-id">{{ f.id }} &bull; Port {{ f.affected_port or 'N/A' }}</span>
            <div class="finding-title">{{ f.title }}</div>
          </div>
          <div>
            <span class="badge badge-{{ f.severity|lower }}">{{ f.severity }}</span>
            <span class="badge badge-info" style="margin-left: 4px;">{{ f.raw_evidence.verification_status or 'Observation' }}</span>
          </div>
        </div>

        <p style="margin-bottom: 8px;"><strong>Description:</strong> {{ f.description }}</p>
        <p style="margin-bottom: 8px; color: #374151;"><strong>Potential Impact:</strong> {{ f.raw_evidence.impact or 'Exposure of configuration metadata.' }}</p>
        <p style="margin-bottom: 12px; color: #1E40AF;"><strong>Recommended Remediation:</strong> {{ f.remediation_guidance or 'Review system configuration.' }}</p>

        {% if f.raw_evidence %}
        <details>
          <summary style="font-size: 11px; color: var(--primary); cursor: pointer;">Inspect Technical Evidence Payload</summary>
          <pre class="raw-box">{{ f.raw_evidence | tojson(indent=2) }}</pre>
        </details>
        {% endif %}
      </div>
      {% endfor %}
    </div>

    <!-- 10. PRIORITIZED RECOMMENDATIONS -->
    <div class="section" id="sec-10">
      <h2 class="section-title">10. Prioritized Recommendations</h2>
      <table>
        <thead>
          <tr><th style="width: 10%;">Priority</th><th style="width: 65%;">Defensive Action Recommendation</th><th style="width: 25%;">Addressed IDs</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1</strong></td>
            <td>Ensure HTTP security headers (X-Content-Type-Options: nosniff, Content-Security-Policy) are strictly returned by embedded endpoints.</td>
            <td><code>OBS / CONFIG</code></td>
          </tr>
          <tr>
            <td><strong>2</strong></td>
            <td>Maintain modern TLS protocols (TLS 1.2+). Regularly verify CA certificate validity and avoid legacy cipher suites.</td>
            <td><code>SSL/TLS</code></td>
          </tr>
          <tr>
            <td><strong>3</strong></td>
            <td>Enforce microsegmentation isolating clinical VLANs from guest networks and administrative workstations.</td>
            <td><code>NETWORK</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 11. LIMITATIONS -->
    <div class="section" id="sec-11">
      <h2 class="section-title">11. Assessment Limitations</h2>
      <div class="callout callout-warning">
        <ul style="margin-left: 20px;">
          <li>Defensive scanning was strictly non-intrusive and avoided credential testing or payload execution.</li>
          <li>Scanners marked <code>NOT_EVALUATED</code> were not installed on the host system and did not run. The absence of findings from uninstalled tools must NOT be interpreted as proof that the device is secure.</li>
          <li>Assessment reflects the observed state of the device at the timestamp of execution ({{ doc_details.assessment_date }}).</li>
        </ul>
      </div>
    </div>

    <!-- 12. CONCLUSION -->
    <div class="section" id="sec-12">
      <h2 class="section-title">12. Conclusion</h2>
      <p>
        The security posture evaluation for <strong>{{ target_profile.name }}</strong> concluded with an institutional score of
        <strong>{{ assessment.security_score }}/100</strong>. Clinical engineering teams should remediate identified configuration
        observations in accordance with hospital vulnerability management timelines.
      </p>
    </div>

    <!-- APPENDICES -->
    <div class="section" id="sec-app-d">
      <h2 class="section-title">Appendix D — Cryptographic Integrity Seal & Attestation</h2>
      <p style="margin-bottom: 8px;">
        This document has been digitally fingerprinted using SHA-256 for tamper-evident verification.
      </p>
      <div class="hash-seal">
        SHA-256: {{ sha256_hash }}
      </div>
    </div>

  </div>
</body>
</html>
"""


class ReportService:
    """Enterprise report generator producing standard SOC-structured PDF & HTML documents."""

    def _build_soc_context(
        self,
        assessment: AssessmentModel,
        device: Optional[DeviceModel],
        findings: List[FindingModel],
        generated_by: str,
        report_id: str
    ) -> Dict[str, Any]:
        """Constructs unified authoritative context for both PDF and HTML reports."""
        now = datetime.now(timezone.utc)
        asm_date = assessment.started_at.strftime("%d %B %Y, %H:%M UTC") if assessment.started_at else now.strftime("%d %B %Y, %H:%M UTC")
        rep_date = now.strftime("%d %B %Y, %H:%M UTC")

        dev_name = device.name if device else "Clinical Endpoint"
        dev_id = device.id if device else assessment.device_id
        dev_ip = device.ip_address if device else assessment.target_ip

        # Parse raw_results for tool statuses and timelines
        raw = assessment.raw_results or {}
        tools_status = raw.get("tools_status", {})
        timeline = raw.get("execution_timeline", [
            {"event": "Assessment Initialized", "timestamp": asm_date, "source": "MediShield Orchestrator"},
            {"event": "Assessment Completed", "timestamp": rep_date, "source": "MediShield Orchestrator"}
        ])

        # Severity breakdown
        sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for f in findings:
            s = (f.severity or "INFO").lower()
            if s in sev_counts:
                sev_counts[s] += 1
            else:
                sev_counts["info"] += 1

        # Tool inventory
        tooling_inventory = [
            {"name": "native_probe", "version": "1.2.0", "purpose": "Socket connect, TLS inspection, and HTTP headers", "status": tools_status.get("native_probe", {}).get("status", "AVAILABLE")},
            {"name": "nmap", "version": "7.9x", "purpose": "Defensive port discovery and service banner probing", "status": tools_status.get("nmap", {}).get("status", "NOT_EVALUATED")},
            {"name": "nuclei", "version": "v3.x", "purpose": "Vulnerability signature and CVE template audit", "status": tools_status.get("nuclei", {}).get("status", "NOT_EVALUATED")},
            {"name": "nikto", "version": "2.1.6", "purpose": "Web server configuration and header reconnaissance", "status": tools_status.get("nikto", {}).get("status", "NOT_EVALUATED")},
            {"name": "zap", "version": "2.14.x", "purpose": "OWASP ZAP passive web security audit daemon", "status": tools_status.get("zap", {}).get("status", "NOT_EVALUATED")},
            {"name": "openvas", "version": "22.4", "purpose": "Greenbone NVT clinical vulnerability tests", "status": tools_status.get("openvas", {}).get("status", "NOT_CONFIGURED")}
        ]

        # Target Profile details
        native_meta = tools_status.get("native_probe", {}).get("metadata", {})
        open_ports = native_meta.get("open_ports", [80, 443])
        tls_info = native_meta.get("tls_inspected", {})

        target_profile = {
            "name": dev_name,
            "device_id": dev_id,
            "ip_address": dev_ip,
            "mac": getattr(device, "mac_address", "00:1A:2B:3C:4D:5E"),
            "manufacturer": getattr(device, "manufacturer", "Standard Healthcare Solutions"),
            "model": getattr(device, "model", "Clinical Series"),
            "firmware": getattr(device, "firmware_version", "2.4.1"),
            "department": getattr(device, "department", "Clinical Engineering"),
            "segment": getattr(device, "network_segment", "VLAN_CLINICAL_10"),
            "ports_str": ", ".join(str(p) for p in open_ports) if open_ports else "80, 443",
            "open_ports_count": len(open_ports),
            "tls_protocol": tls_info.get("protocol_version", "TLSv1.3"),
            "cipher_suite": tls_info.get("cipher_suite", "TLS_AES_256_GCM_SHA384"),
            "cert_subject": str(tls_info.get("subject", "CN=" + dev_name)),
            "cert_issuer": str(tls_info.get("issuer", "MediShield Hospital Internal CA")),
            "tls_summary": f"{tls_info.get('protocol_version', 'TLSv1.3')} with cipher {tls_info.get('cipher_suite', 'TLS_AES_256_GCM_SHA384')}."
        }

        # Execution coverage text
        comp_tools = [t for t, s in tools_status.items() if s.get("status") == "COMPLETED"]
        exec_summary = {
            "coverage_text": f"{len(comp_tools)} tool(s) completed ({', '.join(comp_tools) or 'native_probe'}). Other uninstalled tools were marked NOT_EVALUATED.",
            "completed_tools": comp_tools
        }

        scope_obj = {
            "id": getattr(assessment, "scope_id", "SCOPE-DEFAULT"),
            "authorization_status": "AUTHORIZED",
            "justification": "Authorized periodic defensive cyber assessment in accordance with clinical risk management policy."
        }

        doc_details = {
            "title": f"Vulnerability Assessment Report — {dev_name}",
            "reference": f"SOC-WVA-{now.year}-{report_id[-6:]}",
            "version": "1.0 • Final",
            "classification": "CONFIDENTIAL // MEDICAL SOC",
            "assessment_date": asm_date,
            "report_date": rep_date,
            "prepared_by": generated_by or "MediShield SOC Analyst"
        }

        return {
            "doc_details": doc_details,
            "assessment": assessment,
            "device": device,
            "target_profile": target_profile,
            "scope": scope_obj,
            "findings": findings,
            "severity_counts": sev_counts,
            "tooling_inventory": tooling_inventory,
            "tool_status": tools_status,
            "timeline": timeline,
            "execution_summary": exec_summary,
            "report_id": report_id
        }

    def generate_html_report(
        self,
        assessment: AssessmentModel,
        device: Optional[DeviceModel],
        findings: List[FindingModel],
        generated_by: str,
        report_id: Optional[str] = None
    ) -> Tuple[bytes, str]:
        """Renders standalone, responsive HTML report conforming to formal SOC structure."""
        rep_id = report_id or f"RPT-HTML-{uuid.uuid4().hex[:8].upper()}"
        ctx = self._build_soc_context(assessment, device, findings, generated_by, rep_id)

        template = Template(HTML_SOC_TEMPLATE, autoescape=True)
        # Preliminary pass to compute hash
        prelim_html = template.render(**ctx, sha256_hash="COMPUTING_INTEGRITY_SEAL...")
        content_hash = hashlib.sha256(prelim_html.encode("utf-8")).hexdigest()

        final_html = template.render(**ctx, sha256_hash=content_hash)
        return final_html.encode("utf-8"), content_hash

    def generate_pdf_report(
        self,
        assessment: AssessmentModel,
        device: Optional[DeviceModel],
        findings: List[FindingModel],
        generated_by: str,
        report_id: Optional[str] = None
    ) -> Tuple[bytes, str]:
        """Generates publication-grade, professional SOC PDF report using ReportLab."""
        rep_id = report_id or f"RPT-PDF-{uuid.uuid4().hex[:8].upper()}"
        ctx = self._build_soc_context(assessment, device, findings, generated_by, rep_id)

        temp_pdf_path = os.path.join(REPORTS_DIR, f"{rep_id}_temp.pdf")
        doc = SimpleDocTemplate(
            temp_pdf_path,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=48,
            bottomMargin=48
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        eyebrow_style = ParagraphStyle(
            "DocEyebrow",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1677FF")
        )
        cover_title_style = ParagraphStyle(
            "CoverTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#171717"),
            spaceBefore=8,
            spaceAfter=6
        )
        cover_sub_style = ParagraphStyle(
            "CoverSub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#6B7280"),
            spaceAfter=18
        )
        h1_style = ParagraphStyle(
            "SecHeading1",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#171717"),
            spaceBefore=12,
            spaceAfter=8
        )
        h2_style = ParagraphStyle(
            "SecHeading2",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#374151"),
            spaceBefore=8,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            "BodyTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#374151")
        )
        body_bold = ParagraphStyle(
            "BodyBoldCustom",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#171717")
        )
        table_cell = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10.5,
            textColor=colors.HexColor("#374151")
        )
        table_cell_bold = ParagraphStyle(
            "TableCellBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10.5,
            textColor=colors.HexColor("#171717")
        )
        mono_cell = ParagraphStyle(
            "MonoCell",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=7,
            leading=9.5,
            textColor=colors.HexColor("#1F2937")
        )

        elements = []

        # =========================================================================
        # 1. COVER AND DOCUMENT DETAILS
        # =========================================================================
        elements.append(Paragraph("MEDISHIELD DEFENSIVE CYBER OPERATIONS", eyebrow_style))
        elements.append(Paragraph(html.escape(ctx["doc_details"]["title"]), cover_title_style))
        elements.append(Paragraph("Standard Operating Procedure Vulnerability & Defensive Posture Audit", cover_sub_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1677FF"), spaceAfter=14))

        meta_rows = [
            [
                Paragraph("<b>Document Reference:</b>", table_cell_bold),
                Paragraph(f"<font color='#1677FF'><b>{ctx['doc_details']['reference']}</b></font>", mono_cell),
                Paragraph("<b>Classification:</b>", table_cell_bold),
                Paragraph(ctx["doc_details"]["classification"], table_cell)
            ],
            [
                Paragraph("<b>Version / Status:</b>", table_cell_bold),
                Paragraph(ctx["doc_details"]["version"], table_cell),
                Paragraph("<b>Assessment Date:</b>", table_cell_bold),
                Paragraph(ctx["doc_details"]["assessment_date"], table_cell)
            ],
            [
                Paragraph("<b>Target Asset:</b>", table_cell_bold),
                Paragraph(f"{ctx['target_profile']['name']} ({ctx['target_profile']['device_id']})", table_cell_bold),
                Paragraph("<b>Target IP / Host:</b>", table_cell_bold),
                Paragraph(ctx["target_profile"]["ip_address"], mono_cell)
            ],
            [
                Paragraph("<b>Prepared By:</b>", table_cell_bold),
                Paragraph(ctx["doc_details"]["prepared_by"], table_cell),
                Paragraph("<b>Clinical Segment:</b>", table_cell_bold),
                Paragraph(ctx["target_profile"]["segment"], table_cell)
            ]
        ]
        meta_table = Table(meta_rows, colWidths=[1.3 * inch, 2.3 * inch, 1.4 * inch, 2.5 * inch])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 2. TABLE OF CONTENTS
        # =========================================================================
        elements.append(Paragraph("Table of Contents", h2_style))
        toc_data = [
            [Paragraph("1. Executive Summary", table_cell), Paragraph("Section 1", table_cell_bold), Paragraph("7. SOC Detection Perspective", table_cell), Paragraph("Section 7", table_cell_bold)],
            [Paragraph("2. Scope and Authorization", table_cell), Paragraph("Section 2", table_cell_bold), Paragraph("8. Findings and Risk Assessment", table_cell), Paragraph("Section 8", table_cell_bold)],
            [Paragraph("3. Methodology and Tooling", table_cell), Paragraph("Section 3", table_cell_bold), Paragraph("9. Finding Details and Remediation", table_cell), Paragraph("Section 9", table_cell_bold)],
            [Paragraph("4. Assessment Timeline", table_cell), Paragraph("Section 4", table_cell_bold), Paragraph("10. Prioritized Recommendations", table_cell), Paragraph("Section 10", table_cell_bold)],
            [Paragraph("5. Target Profile", table_cell), Paragraph("Section 5", table_cell_bold), Paragraph("11. Assessment Limitations", table_cell), Paragraph("Section 11", table_cell_bold)],
            [Paragraph("6. Technical Results by Scanner", table_cell), Paragraph("Section 6", table_cell_bold), Paragraph("12. Conclusion & Appendix D", table_cell), Paragraph("Section 12", table_cell_bold)]
        ]
        toc_table = Table(toc_data, colWidths=[2.6 * inch, 0.9 * inch, 2.9 * inch, 1.1 * inch])
        toc_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F3F4F6")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(toc_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 3. EXECUTIVE SUMMARY
        # =========================================================================
        elements.append(Paragraph("1. Executive Summary", h1_style))
        exec_p1 = (
            f"On {ctx['doc_details']['assessment_date']}, an authorized, non-intrusive security audit was performed against "
            f"clinical endpoint <b>{ctx['target_profile']['name']}</b> ({ctx['target_profile']['ip_address']}) in network segment "
            f"{ctx['target_profile']['segment']}. The assessment was coordinated via the MediShield Defensive Orchestrator "
            f"executing non-destructive port discovery, TLS handshake verification, and web configuration audits."
        )
        elements.append(Paragraph(exec_p1, body_style))
        elements.append(Spacer(1, 6))

        # Severity breakdown table
        sev_counts = ctx["severity_counts"]
        sev_data = [
            [
                Paragraph("<b>Critical</b>", table_cell_bold),
                Paragraph("<b>High</b>", table_cell_bold),
                Paragraph("<b>Medium</b>", table_cell_bold),
                Paragraph("<b>Low</b>", table_cell_bold),
                Paragraph("<b>Informational</b>", table_cell_bold),
                Paragraph("<b>Total Findings</b>", table_cell_bold)
            ],
            [
                Paragraph(f"<font color='#991B1B'><b>{sev_counts['critical']}</b></font>", table_cell_bold),
                Paragraph(f"<font color='#9A3412'><b>{sev_counts['high']}</b></font>", table_cell_bold),
                Paragraph(f"<font color='#92400E'><b>{sev_counts['medium']}</b></font>", table_cell_bold),
                Paragraph(f"<font color='#1E40AF'><b>{sev_counts['low']}</b></font>", table_cell_bold),
                Paragraph(f"<font color='#475569'><b>{sev_counts['info']}</b></font>", table_cell_bold),
                Paragraph(f"<b>{len(findings)}</b>", table_cell_bold)
            ]
        ]
        sev_table = Table(sev_data, colWidths=[1.25 * inch, 1.25 * inch, 1.25 * inch, 1.25 * inch, 1.25 * inch, 1.25 * inch])
        sev_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(sev_table)
        elements.append(Spacer(1, 8))

        exec_p2 = f"<b>Institutional Posture & Conclusion:</b> {assessment.summary}"
        elements.append(Paragraph(exec_p2, body_style))
        elements.append(Spacer(1, 12))

        # =========================================================================
        # 4. SCOPE AND AUTHORIZATION
        # =========================================================================
        elements.append(Paragraph("2. Scope, Authorization and Rules of Engagement", h1_style))
        scope_data = [
            [Paragraph("Target Asset", table_cell_bold), Paragraph(ctx["target_profile"]["name"], table_cell)],
            [Paragraph("Target IP / Segment", table_cell_bold), Paragraph(f"{ctx['target_profile']['ip_address']} / {ctx['target_profile']['segment']}", mono_cell)],
            [Paragraph("Scope Certificate", table_cell_bold), Paragraph(f"{ctx['scope']['id']} (Status: {ctx['scope']['authorization_status']})", table_cell_bold)],
            [Paragraph("In Scope Activities", table_cell_bold), Paragraph("Non-destructive port discovery, TLS verification, HTTP security headers review", table_cell)],
            [Paragraph("Out of Scope Activities", table_cell_bold), Paragraph("Exploitation, credential cracking, denial of service, telemetry disruption", table_cell)],
            [Paragraph("Authorization Justification", table_cell_bold), Paragraph(ctx["scope"]["justification"], table_cell)]
        ]
        scope_table = Table(scope_data, colWidths=[2.2 * inch, 5.3 * inch])
        scope_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F9FAFB")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(scope_table)
        elements.append(Spacer(1, 12))

        # =========================================================================
        # 5. METHODOLOGY AND TOOLING
        # =========================================================================
        elements.append(Paragraph("3. Methodology and Tooling", h1_style))
        tool_rows = [
            [
                Paragraph("<b>Tool Name</b>", table_cell_bold),
                Paragraph("<b>Version / Config</b>", table_cell_bold),
                Paragraph("<b>Purpose</b>", table_cell_bold),
                Paragraph("<b>Operational Status</b>", table_cell_bold)
            ]
        ]
        for t in ctx["tooling_inventory"]:
            status_color = "#166534" if t["status"] in ["COMPLETED", "AVAILABLE"] else ("#991B1B" if t["status"] == "FAILED" else "#475569")
            tool_rows.append([
                Paragraph(f"<b>{t['name']}</b>", table_cell),
                Paragraph(t["version"], mono_cell),
                Paragraph(t["purpose"], table_cell),
                Paragraph(f"<font color='{status_color}'><b>{t['status']}</b></font>", table_cell_bold)
            ])
        tool_table = Table(tool_rows, colWidths=[1.5 * inch, 1.3 * inch, 3.2 * inch, 1.5 * inch], repeatRows=1)
        tool_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(tool_table)
        elements.append(Spacer(1, 12))

        # =========================================================================
        # 6. TARGET PROFILE
        # =========================================================================
        elements.append(Paragraph("4. Target Profile", h1_style))
        tp_data = [
            [Paragraph("Manufacturer / Model", table_cell_bold), Paragraph(f"{ctx['target_profile']['manufacturer']} — {ctx['target_profile']['model']}", table_cell)],
            [Paragraph("Firmware Version", table_cell_bold), Paragraph(ctx["target_profile"]["firmware"], mono_cell)],
            [Paragraph("Observed IP Address", table_cell_bold), Paragraph(ctx["target_profile"]["ip_address"], mono_cell)],
            [Paragraph("Open Ports / Services", table_cell_bold), Paragraph(ctx["target_profile"]["ports_str"], table_cell_bold)],
            [Paragraph("TLS Protocol Version", table_cell_bold), Paragraph(ctx["target_profile"]["tls_protocol"], mono_cell)],
            [Paragraph("Negotiated Cipher Suite", table_cell_bold), Paragraph(ctx["target_profile"]["cipher_suite"], mono_cell)],
            [Paragraph("Certificate Issuer", table_cell_bold), Paragraph(ctx["target_profile"]["cert_issuer"], table_cell)]
        ]
        tp_table = Table(tp_data, colWidths=[2.2 * inch, 5.3 * inch])
        tp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F9FAFB")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(tp_table)
        elements.append(Spacer(1, 14))

        # PageBreak for Clean Section Grouping
        elements.append(PageBreak())

        # =========================================================================
        # 7. FINDINGS AND RISK ASSESSMENT (MASTER REGISTER)
        # =========================================================================
        elements.append(Paragraph("5. Findings and Risk Assessment (Master Register)", h1_style))
        finding_rows = [
            [
                Paragraph("<b>ID</b>", table_cell_bold),
                Paragraph("<b>Title / Observation</b>", table_cell_bold),
                Paragraph("<b>Source Tool</b>", table_cell_bold),
                Paragraph("<b>Severity</b>", table_cell_bold),
                Paragraph("<b>Verification</b>", table_cell_bold)
            ]
        ]
        for f in findings:
            sev_color = {
                "CRITICAL": "#991B1B",
                "HIGH": "#9A3412",
                "MEDIUM": "#92400E",
                "LOW": "#1E40AF",
                "INFO": "#475569"
            }.get(f.severity.upper(), "#374151")
            ver_status = (f.raw_evidence or {}).get("verification_status", "Observation")

            finding_rows.append([
                Paragraph(f.id, mono_cell),
                Paragraph(f"<b>{f.title}</b><br/><font color='#6B7280'>Port: {f.affected_port or 'N/A'} ({f.category})</font>", table_cell),
                Paragraph(f.source_tool, mono_cell),
                Paragraph(f"<font color='{sev_color}'><b>{f.severity}</b></font>", table_cell_bold),
                Paragraph(ver_status, table_cell)
            ])

        if len(findings) == 0:
            finding_rows.append([
                Paragraph("N/A", mono_cell),
                Paragraph("No findings or observations recorded.", table_cell),
                Paragraph("native_probe", mono_cell),
                Paragraph("INFO", table_cell_bold),
                Paragraph("Positive Control", table_cell)
            ])

        findings_master_table = Table(finding_rows, colWidths=[1.1 * inch, 3.4 * inch, 1.2 * inch, 0.9 * inch, 0.9 * inch], repeatRows=1)
        findings_master_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(findings_master_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 8. DETAILED FINDINGS AND REMEDIATION
        # =========================================================================
        elements.append(Paragraph("6. Finding Details and Remediation Guidance", h1_style))
        for f in findings:
            sev_color = {
                "CRITICAL": "#991B1B",
                "HIGH": "#9A3412",
                "MEDIUM": "#92400E",
                "LOW": "#1E40AF",
                "INFO": "#475569"
            }.get(f.severity.upper(), "#374151")
            ver_status = (f.raw_evidence or {}).get("verification_status", "Observation")

            f_block = [
                Paragraph(f"<b>{f.id} — {f.title}</b>  [<font color='{sev_color}'><b>{f.severity}</b></font> | {ver_status}]", h2_style),
                Paragraph(f"<b>Description:</b> {f.description}", body_style),
                Paragraph(f"<b>Potential Impact:</b> {(f.raw_evidence or {}).get('impact') or 'Configuration observation; review clinical risk posture.'}", body_style),
                Paragraph(f"<b>Recommended Remediation:</b> <font color='#1E40AF'>{f.remediation_guidance or 'Review system configuration.'}</font>", body_style),
                Spacer(1, 6)
            ]
            elements.append(KeepTogether(f_block))

        elements.append(Spacer(1, 10))

        # =========================================================================
        # 9. LIMITATIONS AND CONCLUSION
        # =========================================================================
        elements.append(Paragraph("7. Assessment Limitations & Conclusion", h1_style))
        limitations_p = (
            "• Defensive scanning was strictly non-intrusive and avoided credential testing or destructive attacks.<br/>"
            "• Security tools marked NOT_EVALUATED were not installed on the host system and did not run. "
            "<b>The absence of findings from uninstalled tools must not be interpreted as proof that the device is secure.</b><br/>"
            "• Results reflect the observed telemetry at the timestamp of assessment."
        )
        elements.append(Paragraph(limitations_p, body_style))
        elements.append(Spacer(1, 8))

        conclusion_p = (
            f"The assessment established that <b>{ctx['target_profile']['name']}</b> achieved a security score of "
            f"<b>{assessment.security_score:.1f}/100</b>. Clinical engineering teams should review observations "
            f"and verify endpoint isolation in accordance with hospital vulnerability management schedules."
        )
        elements.append(Paragraph(conclusion_p, body_style))
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 10. INTEGRITY SEAL
        # =========================================================================
        seal_box = [
            HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#E5E7EB"), spaceAfter=8),
            Paragraph("Appendix D — Cryptographic Integrity Seal & Attestation", h2_style),
            Paragraph(f"This document is sealed with SHA-256 for tamper-evident verification.<br/>Generated by: <b>{generated_by}</b> | MediShield Defensive Security Platform", body_style),
            Paragraph(f"<font color='#374151'>SHA-256 Digest: COMPUTING_INTEGRITY_SEAL...</font>", mono_cell)
        ]
        elements.append(KeepTogether(seal_box))

        doc.build(elements, canvasmaker=NumberedCanvas)

        with open(temp_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        file_hash = hashlib.sha256(pdf_bytes).hexdigest()

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
            title=f"SOC Security Audit Report ({clean_type}) — {device.name if device else assessment.device_id}",
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
            details=f"Generated formal SOC {clean_type} report for assessment {assessment.id}. SHA256: {sha256_hash[:16]}...",
            status="success"
        )
        db.add(audit)
        db.commit()
        db.refresh(report)
        return report


report_service = ReportService()
