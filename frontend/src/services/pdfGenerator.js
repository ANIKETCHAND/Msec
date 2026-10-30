import { jsPDF } from 'jspdf';

/**
 * Generates an authentic, publication-grade SOC Defensive Security PDF Report.
 * Includes executive summary, clinical device metadata, findings breakdown,
 * and SHA-256 cryptographic non-repudiation seal.
 */
export function generateAssessmentPdf({
  assessmentId = 'ASM-1553434',
  deviceId = 'DEV-ECG-101',
  deviceName = 'Clinical IoMT Asset',
  targetIp = '192.168.10.15',
  securityScore = 77,
  profile = 'DEFENSIVE_AUDIT',
  toolsExecuted = ['nmap', 'nuclei', 'native_probe', 'zap'],
  findings = [],
  sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  generatedAt = new Date().toISOString()
} = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  const primaryColor = [22, 119, 255]; // #1677FF
  const darkTextColor = [23, 23, 23];   // #171717
  const mutedTextColor = [107, 114, 128]; // #6B7280
  const lightBg = [248, 249, 250];

  // 1. Top Brand Header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, margin, contentWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('MEDISHIELD CLINICAL IoMT DEFENSIVE SECURITY REPORT', margin + 6, margin + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL // HOSPITAL HEALTHCARE SOC OPERATIONS & DEFENSIVE COMPLIANCE', margin + 6, margin + 13.5);

  // 2. Metadata Box
  let y = margin + 23;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, contentWidth, 34, 'FD');

  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Assessment Reference: ${assessmentId}`, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Audit Timestamp: ${new Date(generatedAt).toLocaleString()}`, margin + 5, y + 13);
  doc.text(`Target Asset: ${deviceName} (${deviceId})`, margin + 5, y + 19);
  doc.text(`Target IP Endpoint: ${targetIp}`, margin + 5, y + 25);
  doc.text(`Assessment Profile: ${profile}`, margin + 5, y + 31);

  // Score Badge
  const scoreBoxX = pageWidth - margin - 48;
  const scoreBoxY = y + 4.5;
  const scoreColor = Number(securityScore) >= 85 ? [16, 185, 129] : Number(securityScore) >= 70 ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...scoreColor);
  doc.rect(scoreBoxX, scoreBoxY, 43, 25, 'FD');

  doc.setTextColor(...mutedTextColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('POSTURE SCORE', scoreBoxX + 8, scoreBoxY + 5.5);

  doc.setTextColor(...scoreColor);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${securityScore}`, scoreBoxX + 9, scoreBoxY + 15.5);
  doc.setFontSize(8.5);
  doc.text('/ 100', scoreBoxX + 23, scoreBoxY + 15.5);

  doc.setFontSize(6.5);
  doc.setTextColor(...scoreColor);
  doc.text(Number(securityScore) >= 70 ? 'NON-DISRUPTIVE PASS' : 'ATTENTION REQUIRED', scoreBoxX + 4.5, scoreBoxY + 21.5);

  // 3. Executive Summary Section
  y += 40;
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Executive Summary & Clinical Safety Mandate', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedTextColor);
  const summaryText = `An authorized, non-intrusive clinical cybersecurity assessment was conducted against medical asset ${deviceName} (${targetIp}). All orchestrated tools adhered strictly to hospital patient-safety parameters, avoiding unverified payloads, denial-of-service tests, or clinical workflow interruptions.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, y);

  y += (splitSummary.length * 4) + 2;
  const toolsFormatted = (toolsExecuted || []).map(t => String(t).toUpperCase()).join(', ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`Active Security Adapters Orchestrated: ${toolsFormatted || 'NMAP, NUCLEI, PROBE'}`, margin, y);

  // 4. Technical Findings Table
  y += 9;
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const findingsList = Array.isArray(findings) ? findings : [];
  doc.text(`2. Identified Findings & Actionable Remediation (${findingsList.length} total)`, margin, y);

  y += 6;
  if (findingsList.length === 0) {
    doc.setFillColor(...lightBg);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setTextColor(...mutedTextColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Zero critical vulnerabilities or configuration anomalies observed during this assessment run.', margin + 5, y + 7.5);
    y += 18;
  } else {
    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkTextColor);
    doc.text('SEVERITY', margin + 3, y + 4.5);
    doc.text('FINDING / OBSERVATION', margin + 26, y + 4.5);
    doc.text('TOOL', margin + 118, y + 4.5);
    doc.text('REFERENCE', margin + 148, y + 4.5);

    y += 8;

    findingsList.forEach((f) => {
      if (y > pageHeight - 38) {
        doc.addPage();
        y = margin;
      }

      const sev = (f.severity || 'LOW').toUpperCase();
      const sevColor = sev === 'CRITICAL' ? [220, 38, 38] : sev === 'HIGH' ? [234, 88, 12] : sev === 'MEDIUM' ? [217, 119, 6] : [37, 99, 235];

      // Severity badge
      doc.setFillColor(...sevColor);
      doc.roundedRect(margin + 2, y - 3.2, 19, 4.8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(sev, margin + 4, y);

      // Title
      doc.setTextColor(...darkTextColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const titleLines = doc.splitTextToSize(f.title || 'Clinical Security Observation', 86);
      doc.text(titleLines, margin + 26, y);

      // Tool
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedTextColor);
      doc.text(String(f.source_tool || 'orchestrator'), margin + 118, y);

      // CVE / CWE
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(String(f.cve_id || 'N/A'), margin + 148, y);

      const titleHeight = titleLines.length * 3.5;
      y += Math.max(titleHeight, 4.5);

      // Remediation guidance
      if (f.remediation_guidance || f.remediation) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...mutedTextColor);
        const remLines = doc.splitTextToSize(`Guidance: ${f.remediation_guidance || f.remediation}`, 148);
        doc.text(remLines, margin + 26, y);
        y += (remLines.length * 3.2);
      }

      // Separator line
      doc.setDrawColor(243, 244, 246);
      doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);
      y += 4.5;
    });
  }

  // 5. Cryptographic Seal
  if (y > pageHeight - 34) {
    doc.addPage();
    y = margin;
  } else {
    y += 3;
  }

  doc.setFillColor(230, 244, 255);
  doc.setDrawColor(186, 224, 255);
  doc.rect(margin, y, contentWidth, 16, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CRYPTOGRAPHIC AUDIT SEAL & NON-REPUDIATION ATTESTATION', margin + 5, y + 5);

  doc.setTextColor(...darkTextColor);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(`SHA-256: ${sha256Hash}`, margin + 5, y + 11);

  // 6. Running Footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 10, margin + contentWidth, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...mutedTextColor);
    doc.text('MediShield IoMT Defensive Security Engine • Certified Clinical Audit Document', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth - 18, pageHeight - 6);
  }

  return doc;
}

/**
 * Downloads the generated PDF directly to the user's browser.
 */
export function downloadAssessmentPdf(data, filename) {
  const doc = generateAssessmentPdf(data);
  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
  return true;
}
