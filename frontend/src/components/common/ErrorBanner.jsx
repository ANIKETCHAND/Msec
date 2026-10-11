import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export default function ErrorBanner({
  type = 'error', // error, warning, success, info
  message,
  details = null,
  onDismiss = null,
  className = '',
}) {
  if (!message) return null;

  const typeConfig = {
    error: {
      bg: 'bg-[#FEF2F2]',
      border: 'border-[#FCA5A5]',
      text: 'text-[#991B1B]',
      icon: AlertCircle,
    },
    warning: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FCD34D]',
      text: 'text-[#92400E]',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-[#F0FDF4]',
      border: 'border-[#86EFAC]',
      text: 'text-[#166534]',
      icon: CheckCircle,
    },
    info: {
      bg: 'bg-[#EFF6FF]',
      border: 'border-[#93C5FD]',
      text: 'text-[#1E40AF]',
      icon: Info,
    },
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  return (
    <div
      className={`rounded border px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs ${config.bg} ${config.border} ${config.text} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-relaxed">{message}</p>
          {details && (
            <p className="font-mono text-[11px] opacity-80 mt-1 break-all">
              {typeof details === 'string' ? details : JSON.stringify(details)}
            </p>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded opacity-70 hover:opacity-100 transition-swiss"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
