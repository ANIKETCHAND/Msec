/**
 * System Settings & Detection Policy API.
 */

import { httpClient } from './client';

export const settingsApi = {
  async getPolicies() {
    return await httpClient.get('/settings/policies');
  },

  async updatePolicies(policies) {
    return await httpClient.put('/settings/policies', policies);
  }
};

export default settingsApi;
