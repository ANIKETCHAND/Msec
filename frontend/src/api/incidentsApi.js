/**
 * Incident Management & Correlation API.
 */

import { httpClient } from './client';

export const incidentsApi = {
  async listIncidents(skip = 0, limit = 100, status = null) {
    let q = `?skip=${skip}&limit=${limit}`;
    if (status) q += `&status=${encodeURIComponent(status)}`;
    return await httpClient.get(`/incidents${q}`);
  },

  async getIncident(incidentId) {
    return await httpClient.get(`/incidents/${encodeURIComponent(incidentId)}`);
  },

  async createIncident(incidentData) {
    return await httpClient.post('/incidents', incidentData);
  },

  async updateIncident(incidentId, updateData) {
    return await httpClient.put(`/incidents/${encodeURIComponent(incidentId)}`, updateData);
  },

  async correlateEvents(deviceId) {
    return await httpClient.post(`/incidents/correlate/${encodeURIComponent(deviceId)}`);
  }
};

export default incidentsApi;
