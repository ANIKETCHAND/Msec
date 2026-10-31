/**
 * Cryptographic Audit Trail & Hash Chain API.
 */

import { httpClient } from './client';

export const auditLogsApi = {
  async listLogs(limit = 100) {
    return await httpClient.get(`/audit-logs?limit=${limit}`);
  },

  async verifyAuditChain() {
    return await httpClient.get('/audit-logs/verify-chain');
  }
};

export default auditLogsApi;
