/**
 * Intrusion Detection, ML Inference & Passive IDS API.
 */

import { httpClient } from './client';

export const detectionApi = {
  async getStatus() {
    return await httpClient.get('/detection/status');
  },

  async evaluateFlow(flowMetrics) {
    return await httpClient.post('/detection/evaluate', flowMetrics);
  },

  async getIdsStatus() {
    return await httpClient.get('/detection/ids/status');
  },

  async ingestIdsAlert(alertData) {
    return await httpClient.post('/detection/ids/ingest', alertData);
  }
};

export default detectionApi;
