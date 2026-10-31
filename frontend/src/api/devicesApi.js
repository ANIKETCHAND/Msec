/**
 * IoMT Device Inventory and Diagnostics API.
 */

import { httpClient } from './client';

export const devicesApi = {
  async listDevices(skip = 0, limit = 100) {
    return await httpClient.get(`/devices?skip=${skip}&limit=${limit}`);
  },

  async getDevice(deviceId) {
    return await httpClient.get(`/devices/${encodeURIComponent(deviceId)}`);
  },

  async registerDevice(deviceData) {
    return await httpClient.post('/devices', deviceData);
  },

  async updateDeviceStatus(deviceId, status) {
    return await httpClient.put(`/devices/${encodeURIComponent(deviceId)}/status?status=${encodeURIComponent(status)}`);
  },

  async decommissionDevice(deviceId) {
    return await httpClient.delete(`/devices/${encodeURIComponent(deviceId)}`);
  }
};

export default devicesApi;
