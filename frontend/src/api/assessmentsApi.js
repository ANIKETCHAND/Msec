/**
 * Defensive Security Assessment and Scope Authorization API.
 */

import { httpClient } from './client';

export const assessmentsApi = {
  async getToolInventory() {
    return await httpClient.get('/assessments/tools/inventory');
  },

  async refreshToolInventory() {
    return await httpClient.post('/assessments/tools/refresh');
  },

  async listScopes(deviceId = null) {
    const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    return await httpClient.get(`/assessments/scopes${q}`);
  },

  async getScope(scopeId) {
    return await httpClient.get(`/assessments/scopes/${encodeURIComponent(scopeId)}`);
  },

  async authorizeScope(scopeData) {
    return await httpClient.post('/assessments/authorize-scope', scopeData);
  },

  async revokeScope(scopeId) {
    return await httpClient.post(`/assessments/scopes/${encodeURIComponent(scopeId)}/revoke`);
  },

  async listAssessments(deviceId = null) {
    const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    return await httpClient.get(`/assessments${q}`);
  },

  async getAssessment(assessmentId) {
    return await httpClient.get(`/assessments/${encodeURIComponent(assessmentId)}`);
  },

  async executeAssessment(launchData) {
    return await httpClient.post('/assessments/execute', launchData);
  },

  async cancelAssessment(assessmentId) {
    return await httpClient.post(`/assessments/${encodeURIComponent(assessmentId)}/cancel`);
  },

  async getFindings(assessmentId) {
    return await httpClient.get(`/assessments/${encodeURIComponent(assessmentId)}/findings`);
  }
};

export default assessmentsApi;
