/**
 * MediShield Application-wide Constants.
 * Centralizes roles, severity categories, verification statuses, and styling tokens.
 */

export const USER_ROLES = {
  ADMIN: 'Administrator',
  ANALYST: 'Security Analyst',
  DOCTOR: 'Doctor Demo'
};

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

export const SEVERITY_BADGE_STYLES = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-amber-50/70 text-amber-700 border-amber-200/80',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  info: 'bg-slate-50 text-slate-700 border-slate-200'
};

export const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ISOLATED: 'isolated',
  SUSPICIOUS: 'suspicious',
  DECOMMISSIONED: 'decommissioned'
};

export const ASSESSMENT_STATUS = {
  AUTHORIZED: 'AUTHORIZED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'REVOKED'
};

export const REPORT_FORMATS = {
  PDF: 'PDF',
  HTML: 'HTML'
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'medishield_token',
  AUTH_USER: 'medishield_user',
  API_URL_OVERRIDE: 'medishield_api_url',
  ACTIVE_PAGE: 'medishield_active_page',
  OPEN_TABS: 'medishield_open_tabs'
};
