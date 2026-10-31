/**
 * MediShield Frontend Environment Configuration.
 * 
 * Centralizes all environment variable access, provides safe fallbacks,
 * eliminates environment conflicts (e.g. VITE_API_URL vs VITE_API_BASE_URL),
 * and supports custom runtime API URL overrides via localStorage.
 */

// Safe retrieval of environment variables
const env = import.meta.env || {};

/**
 * Resolves the backend API base path.
 * Priority order:
 * 1. Runtime override stored in localStorage (`medishield_api_url`)
 * 2. `VITE_API_URL` environment variable
 * 3. `VITE_API_BASE_URL` environment variable
 * 4. Default relative proxy path `/api/v1`
 */
export const getApiBaseUrl = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem('medishield_api_url');
      if (custom && custom.trim()) {
        const clean = custom.trim().replace(/\/+$/, '');
        return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
      }
    }
  } catch (e) {
    // Ignore localStorage access restrictions in sandboxed iframes
  }

  const rawUrl = env.VITE_API_URL || env.VITE_API_BASE_URL;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) {
    const clean = rawUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }

  // In development and standard production, Vite or reverse proxy routes /api/v1
  return '/api/v1';
};

export const ENVIRONMENT_CONFIG = {
  APP_TITLE: env.VITE_APP_TITLE || 'MediShield — IoMT Security & Privacy Platform',
  APP_VERSION: env.VITE_APP_VERSION || '2.0.0',
  IS_DEV: Boolean(env.DEV),
  IS_PROD: Boolean(env.PROD),
  API_BASE_URL: getApiBaseUrl(),
  REQUEST_TIMEOUT_MS: Number(env.VITE_REQUEST_TIMEOUT_MS) || 30000,
  ENABLE_DEBUG_LOGGING: Boolean(env.DEV && env.VITE_DEBUG_LOGS !== 'false')
};

export default ENVIRONMENT_CONFIG;
