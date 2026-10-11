import React from 'react';

export default function Badge({
  children,
  variant = 'default', // default, critical, warning, success, info, neutral
  size = 'sm', // xs, sm, md
  className = '',
  dot = false,
  ...props
}) {
  const variantStyles = {
    critical: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    warning: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    success: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
    info: 'bg-[#E0E7FF] text-[#3730A3] border-[#C7D2FE]',
    neutral: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]',
    default: 'bg-[#F9FAFB] text-[#171717] border-[#E5E7EB]',
  };

  const dotColors = {
    critical: 'bg-[#EF4444]',
    warning: 'bg-[#F59E0B]',
    success: 'bg-[#10B981]',
    info: 'bg-[#3B82F6]',
    neutral: 'bg-[#9CA3AF]',
    default: 'bg-[#6B7280]',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  const cleanVariant = (variant || 'default').toLowerCase();
  const vClass = variantStyles[cleanVariant] || variantStyles.default;
  const dClass = dotColors[cleanVariant] || dotColors.default;

  return (
    <span
      className={`inline-flex items-center rounded border font-mono tracking-tight ${vClass} ${sizeStyles[size] || sizeStyles.sm} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dClass}`} />}
      <span>{children}</span>
    </span>
  );
}
