/**
 * Executive Security Dashboard Summary API.
 */

import { httpClient } from './client';

export const dashboardApi = {
  async getSummary() {
    return await httpClient.get('/dashboard/summary');
  },

  async getHealth() {
    return await httpClient.get('/health');
  }
};

export default dashboardApi;
