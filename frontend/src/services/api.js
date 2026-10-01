/**
 * MediShield API Service Client
 * Handles authenticated communication with FastAPI backend endpoints.
 */

const API_BASE = '/api';

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
    const url = `${API_BASE}${endpoint}`;
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
        throw new Error(errorData.detail || `Request failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      // Return null or rethrow based on caller
      console.warn(`[API] ${endpoint} request failed:`, err.message);
      throw err;
    }
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

  async updateDevice(id, updateData) {
    return await this.request(`/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
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
}

export const api = new ApiService();
