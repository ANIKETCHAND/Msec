/**
 * Cryptographic Integrity Verification & Anti-Tamper API.
 */

import { httpClient } from './client';

export const integrityApi = {
  async listRecords() {
    return await httpClient.get('/integrity/results');
  },

  async verifyRecord(recordId) {
    return await httpClient.post('/integrity/verify', { record_id: recordId });
  },

  async testTamper(recordId) {
    return await httpClient.post('/integrity/tamper-demo', { record_id: recordId });
  }
};

export default integrityApi;
