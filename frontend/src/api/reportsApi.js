/**
 * Security Reports & PDF Export API.
 */

import { httpClient } from './client';
import { getApiBaseUrl } from '../config/environment';

export const reportsApi = {
  async listReports({ skip = 0, limit = 100, assessmentId = null } = {}) {
    let query = `?skip=${skip}&limit=${limit}`;
    if (assessmentId) query += `&assessment_id=${encodeURIComponent(assessmentId)}`;
    return await httpClient.get(`/reports${query}`);
  },

  async getReportsSummary() {
    return await httpClient.get('/reports/summary');
  },

  async getReport(reportId) {
    return await httpClient.get(`/reports/${encodeURIComponent(reportId)}`);
  },

  async generateReport(assessmentId, reportType = 'PDF') {
    return await httpClient.post(`/reports/assessments/${encodeURIComponent(assessmentId)}`, {
      report_type: reportType
    });
  },

  getReportDownloadUrl(reportId) {
    const token = httpClient.token || httpClient.getStoredToken();
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBaseUrl()}/reports/${encodeURIComponent(reportId)}/download${q}`;
  },

  getReportPdfUrl(reportId) {
    const token = httpClient.token || httpClient.getStoredToken();
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBaseUrl()}/reports/${encodeURIComponent(reportId)}/pdf${q}`;
  },

  async getReportHtml(reportId) {
    const url = `${getApiBaseUrl()}/reports/${encodeURIComponent(reportId)}/html`;
    const res = await fetch(url, { headers: httpClient.getHeaders() });
    if (!res.ok) throw new Error(`HTML Report fetch failed with status ${res.status}`);
    return await res.text();
  },

  async downloadReportFile(reportId, preferredFilename = null) {
    const rep = await this.getReport(reportId).catch(() => null);
    const ext = (rep?.report_type || 'PDF').toLowerCase();
    const finalFilename = preferredFilename || `medishield-report-${reportId}.${ext}`;
    const url = `${getApiBaseUrl()}/reports/${encodeURIComponent(reportId)}/download`;

    const res = await fetch(url, { headers: httpClient.getHeaders() });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  },

  async exportCsv(type = 'findings') {
    const url = `${getApiBaseUrl()}/reports/${type}.csv`;
    const res = await fetch(url, { headers: httpClient.getHeaders() });
    if (!res.ok) throw new Error(`CSV export failed with status ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `medishield-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  }
};

export default reportsApi;
