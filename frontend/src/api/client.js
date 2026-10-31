/**
 * MediShield Core HTTP Client.
 * 
 * Provides unified request handling, automatic JWT Bearer token attachment,
 * response timeout protection, standard error envelope extraction, and
 * typed exception instantiation.
 */

import { getApiBaseUrl, ENVIRONMENT_CONFIG } from '../config/environment';
import { STORAGE_KEYS } from '../constants/appConstants';

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code || 'API_ERROR';
    this.statusCode = options.statusCode || 500;
    this.requestId = options.requestId || null;
    this.details = options.details || {};
  }
}

export class HttpClient {
  constructor() {
    this.token = this.getStoredToken();
  }

  getStoredToken() {
    try {
      return typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
        : null;
    } catch {
      return null;
    }
  }

  setToken(token) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch (e) {
      // Ignore in restricted environments
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const activeToken = this.token || this.getStoredToken();
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const apiBase = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${apiBase}${cleanEndpoint}`;

    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {})
    };

    // If sending FormData or ArrayBuffer, remove Content-Type so browser sets correct multipart boundary
    if (options.body instanceof FormData || options.body instanceof Blob) {
      delete headers['Content-Type'];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || ENVIRONMENT_CONFIG.REQUEST_TIMEOUT_MS
    );

    const config = {
      ...options,
      headers,
      signal: options.signal || controller.signal
    };

    try {
      const res = await fetch(url, config);
      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (res.status === 204) return null;

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errMsg = errorData.error?.message || errorData.detail;
        if (!errMsg) {
          if (res.status === 405) {
            errMsg = `Endpoint '${endpoint}' returned 405 Method Not Allowed.`;
          } else if (res.status === 404) {
            errMsg = `Endpoint '${endpoint}' was not found (404).`;
          } else if (res.status === 401) {
            errMsg = 'Authentication session expired or invalid credentials.';
          } else if (res.status === 403) {
            errMsg = 'You do not have authorization to perform this operation.';
          } else {
            errMsg = `Request failed with HTTP status ${res.status}`;
          }
        }

        throw new ApiError(errMsg, {
          code: errorData.error?.code || (res.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR'),
          statusCode: res.status,
          requestId: errorData.error?.request_id || res.headers.get('X-Request-ID'),
          details: errorData.error?.details || {}
        });
      }

      const text = await res.text();
      // Guard against static SPA server rewrites where 200 returns HTML instead of JSON
      if (!text || text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        throw new ApiError(
          `Static host rewrote '${endpoint}' to HTML. Backend API is unavailable at this address.`,
          { code: 'STATIC_FALLBACK_HTML', statusCode: 405 }
        );
      }

      return JSON.parse(text);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApiError(`Request to '${endpoint}' timed out after ${ENVIRONMENT_CONFIG.REQUEST_TIMEOUT_MS}ms.`, {
          code: 'TIMEOUT',
          statusCode: 408
        });
      }
      if (ENVIRONMENT_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.warn(`[HttpClient] Request notice on ${endpoint}:`, err.message);
      }
      throw err;
    }
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
export default httpClient;
