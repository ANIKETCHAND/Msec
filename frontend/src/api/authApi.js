/**
 * Authentication and User Session API.
 */

import { httpClient } from './client';

export const authApi = {
  async login(email, password) {
    const res = await httpClient.post('/auth/login', { email, password });
    if (res?.access_token) {
      httpClient.setToken(res.access_token);
    }
    return res;
  },

  async logout() {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      httpClient.setToken(null);
    }
  },

  async getMe() {
    return await httpClient.get('/auth/me');
  }
};

export default authApi;
