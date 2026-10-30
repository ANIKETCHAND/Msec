/**
 * MediShield API Service Client
 * Handles authenticated communication with FastAPI backend endpoints.
 */

export const getApiBase = () => {
  try {
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('medishield_api_url') : null;
    if (custom && custom.trim()) {
      return `${custom.trim().replace(/\/+$/, '')}/api/v1`;
    }
  } catch (e) {}

  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api/v1`;
  }

  return '/api/v1';
};

export const API_BASE = getApiBase();

class ApiService {
  constructor() {
    this.token = localStorage.getItem('medishield_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('medishield_token', token);
    } else {
      localStorage.removeItem('medishield_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const apiBase = getApiBase();
    const url = `${apiBase}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const res = await fetch(url, config);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errMsg = errorData.error?.message || errorData.detail;
        if (!errMsg) {
          if (res.status === 405) {
            errMsg = `Backend endpoint '${endpoint}' returned 405 Method Not Allowed (Static host rewrite or unconfigured backend).`;
          } else if (res.status === 404) {
            errMsg = `Backend endpoint '${endpoint}' was not found (404).`;
          } else {
            errMsg = `Request failed with status ${res.status}`;
          }
        }
        const errObj = new Error(errMsg);
        errObj.code = errorData.error?.code || (res.status === 405 ? 'BACKEND_NOT_CONFIGURED' : 'API_ERROR');
        errObj.requestId = errorData.error?.request_id || res.headers.get('X-Request-ID');
        errObj.statusCode = res.status;
        throw errObj;
      }
      // 204 No Content (e.g. decommission) carries no body to parse.
      if (res.status === 204) return null;
      const text = await res.text();
      // Handle static SPA HTML rewrites where 200 OK returns index.html instead of JSON
      if (!text || text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        const errObj = new Error(`Static host rewrote '${endpoint}' to index.html. No backend server active at this URL.`);
        errObj.code = 'STATIC_FALLBACK_HTML';
        errObj.statusCode = 405;
        throw errObj;
      }
      return JSON.parse(text);
    } catch (err) {
      console.warn(`[API] ${endpoint} request notice:`, err.message);
      throw err;
    }
  }

  // Dashboard Summary (Phase 1/3)
  async getDashboardSummary() {
    return await this.request('/dashboard/summary');
  }

  // Auth Endpoints
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data?.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  async loginWithGoogle(payload) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data?.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // Devices
  async getDevices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/devices${query ? `?${query}` : ''}`);
  }

  async getDevice(id) {
    return await this.request(`/devices/${id}`);
  }

  async createDevice(deviceData) {
    return await this.request('/devices', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    });
  }

  async updateDevice(id, updateData) {
    return await this.request(`/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  async deleteDevice(id) {
    return await this.request(`/devices/${id}`, { method: 'DELETE' });
  }

  // Telemetry
  async getTelemetry(deviceId, limit = 50) {
    return await this.request(`/telemetry?device_id=${deviceId}&limit=${limit}`);
  }

  async sendTelemetry(payload) {
    return await this.request('/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Security Events
  async getSecurityEvents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/security-events${query ? `?${query}` : ''}`);
  }

  async updateSecurityEvent(id, updateData) {
    return await this.request(`/security-events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // Incidents
  async getIncidents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/incidents${query ? `?${query}` : ''}`);
  }

  async createIncident(incidentData) {
    return await this.request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData)
    });
  }

  async updateIncident(id, updateData) {
    return await this.request(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // Detection
  async getDetectionStatus() {
    return await this.request('/detection/status');
  }

  async evaluateDetection(features) {
    return await this.request('/detection/evaluate', {
      method: 'POST',
      body: JSON.stringify(features)
    });
  }

  // Privacy & Integrity
  async getIntegrityResults() {
    return await this.request('/integrity/results');
  }

  async verifyIntegrity(recordId) {
    return await this.request('/integrity/verify', {
      method: 'POST',
      body: JSON.stringify({ record_id: recordId })
    });
  }

  async tamperRecord(recordId) {
    return await this.request('/integrity/tamper-demo', {
      method: 'POST',
      body: JSON.stringify({ record_id: recordId })
    });
  }

  // Audit Logs
  async getAuditLogs(limit = 50) {
    return await this.request(`/audit-logs?limit=${limit}`);
  }

  // Reports
  async getReportsSummary() {
    return await this.request('/reports/summary');
  }

  // Simulation
  async triggerScenario(name) {
    return await this.request(`/simulation/scenarios/${name}`, {
      method: 'POST'
    });
  }

  async resetSimulation() {
    return await this.request('/simulation/reset', {
      method: 'POST'
    });
  }

  // Settings & Policies
  async getPolicies() {
    return await this.request('/settings/policies');
  }

  async updatePolicies(policies) {
    return await this.request('/settings/policies', {
      method: 'PUT',
      body: JSON.stringify(policies)
    });
  }

  // Defensive Security Assessments & Scope Authorization
  async getToolInventory() {
    return await this.request('/assessments/tools/inventory');
  }

  async getToolsInventory() {
    return await this.getToolInventory();
  }

  async refreshToolInventory() {
    return await this.request('/assessments/tools/refresh', {
      method: 'POST'
    });
  }

  async getScopes(deviceId = null) {
    return await this.request(`/assessments/scopes${deviceId ? `?device_id=${deviceId}` : ''}`);
  }

  async authorizeScope(scopeData) {
    return await this.request('/assessments/authorize-scope', {
      method: 'POST',
      body: JSON.stringify(scopeData)
    });
  }

  async revokeScope(scopeId) {
    return await this.request(`/assessments/scopes/${scopeId}/revoke`, {
      method: 'POST'
    });
  }

  async executeAssessment(launchData) {
    return await this.request('/assessments/execute', {
      method: 'POST',
      body: JSON.stringify(launchData)
    });
  }

  async getAssessments(deviceId = null) {
    return await this.request(`/assessments${deviceId ? `?device_id=${deviceId}` : ''}`);
  }

  async getAssessment(assessmentId) {
    return await this.request(`/assessments/${assessmentId}`);
  }

  async getAssessmentById(assessmentId) {
    return await this.getAssessment(assessmentId);
  }

  async getAssessmentFindings(assessmentId) {
    return await this.request(`/assessments/${assessmentId}/findings`);
  }

  async verifyAuditChain() {
    return await this.request('/audit-logs/verify-chain');
  }

  async getIdsStatus() {
    return await this.request('/detection/ids/status');
  }

  async correlateIncident(deviceId) {
    return await this.request(`/incidents/correlate/${deviceId}`, {
      method: 'POST'
    });
  }

  // Assessment Cancellation & Polling
  async cancelAssessment(assessmentId) {
    return await this.request(`/assessments/${assessmentId}/cancel`, {
      method: 'POST'
    });
  }

  // Reports Management (PDF / HTML)
  async getReports(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/reports${query ? `?${query}` : ''}`);
  }

  async getReport(reportId) {
    return await this.request(`/reports/${reportId}`);
  }

  async generateReport(assessmentId, reportType = 'PDF') {
    return await this.request(`/assessments/${assessmentId}/reports`, {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType })
    });
  }

  getReportDownloadUrl(reportId) {
    const token = this.token || localStorage.getItem('medishield_token');
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/${reportId}/download${q}`;
  }

  getReportPdfUrl(reportId) {
    const token = this.token || localStorage.getItem('medishield_token');
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/${reportId}/pdf${q}`;
  }

  async downloadReportFile(reportId, preferredFilename = null) {
    const rep = await this.getReport(reportId).catch(() => null);
    const ext = (rep?.report_type || 'PDF').toLowerCase();
    const finalFilename = preferredFilename || `medishield-report-${reportId}.${ext}`;
    const url = `${getApiBase()}/reports/${reportId}/download`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Download failed with status ${res.status}`);
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
  }

  async downloadCsvFile(endpoint, filename) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Export failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  }

  async getReportHtml(reportId) {
    const url = `${getApiBase()}/reports/${reportId}/html`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to load HTML report');
    return await res.text();
  }

  // Incident Notes & Status Triage
  async addIncidentNote(incidentId, content) {
    return await this.request(`/incidents/${incidentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async updateIncidentStatus(incidentId, status, resolutionNotes = null) {
    return await this.request(`/incidents/${incidentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes })
    });
  }
}

export const api = new ApiService();
export const apiClient = api;

