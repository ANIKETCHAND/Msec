/**
 * Date and time formatting utility for MediShield IoMT Platform.
 * 
 * Safely parses timestamps from backend API responses (which are stored in UTC).
 * If a backend timestamp string is naive (missing Z or offset), this utility treats
 * it as UTC so that the browser converts it accurately to the user's local timezone.
 */

export function formatDateTime(val) {
  if (!val) return 'N/A';
  let str = String(val).trim();
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  // If no timezone offset is present (no trailing Z and no +/-HH:MM offset), append Z to treat as UTC
  if (!str.endsWith('Z') && !/[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    str += 'Z';
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? String(val) : date.toLocaleString();
}

export function formatTimeOnly(val) {
  if (!val) return 'N/A';
  let str = String(val).trim();
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  if (!str.endsWith('Z') && !/[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    str += 'Z';
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? String(val) : date.toLocaleTimeString();
}

export function formatDateOnly(val) {
  if (!val) return 'N/A';
  let str = String(val).trim();
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  if (!str.endsWith('Z') && !/[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    str += 'Z';
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? String(val) : date.toLocaleDateString();
}
