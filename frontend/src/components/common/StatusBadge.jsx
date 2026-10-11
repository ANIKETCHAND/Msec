import React from 'react';

/**
 * Swiss Minimalist Status Badge
 * Restrained color palette with soft backgrounds and high-contrast typography
 */
export default function StatusBadge({ status, size = 'sm', className = '' }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  let styles = {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    label: status
  };

  if (['online', 'safe', 'verified', 'healthy', 'approved', 'closed', 'resolved', 'low'].includes(normalized)) {
    styles = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: status
    };
  } else if (['warning', 'medium', 'suspicious', 'investigating', 'in_progress', 'quarantined'].includes(normalized)) {
    styles = {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: status
    };
  } else if (['critical', 'high', 'offline', 'tampered', 'isolated', 'failed', 'open', 'attack'].includes(normalized)) {
    styles = {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      label: status
    };
  } else if (['active', 'running', 'in_review', 'info'].includes(normalized)) {
    styles = {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: status
    };
  }

  const sizeClasses = size === 'xs' 
    ? 'px-1.5 py-0.5 text-[11px]' 
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      <span className="capitalize">{styles.label}</span>
    </span>
  );
}
