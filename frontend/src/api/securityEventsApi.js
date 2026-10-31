/**
 * Security Events & Alerts Telemetry API.
 */

import { httpClient } from './client';

export const securityEventsApi = {
  async listEvents({ skip = 0, limit = 100, deviceId = null, severity = null } = {}) {
    let q = `?skip=${skip}&limit=${limit}`;
    if (deviceId) q += `&device_id=${encodeURIComponent(deviceId)}`;
    if (severity) q += `&severity=${encodeURIComponent(severity)}`;
    return await httpClient.get(`/security-events${q}`);
  },

  async getEvent(eventId) {
    return await httpClient.get(`/security-events/${encodeURIComponent(eventId)}`);
  }
};

export default securityEventsApi;
