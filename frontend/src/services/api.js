/**
 * Backward compatibility proxy for existing imports.
 * Routes directly to the modularized API subsystem in `src/api`.
 */

export * from '../api';
import { api, apiClient } from '../api';

export { api, apiClient };
export default api;
