import React from 'react';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, outline, danger, ghost
  size = 'md', // sm, md, lg
  className = '',
  disabled = false,
  loading = false,
  icon: Icon = null,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-swiss focus:outline-none focus:ring-1 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2 font-medium',
    lg: 'text-sm px-4 py-2 gap-2 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-[#1677FF] hover:bg-[#0958D9] text-white focus:ring-[#1677FF] shadow-xs',
    secondary: 'bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#171717] border border-[#E5E7EB]',
    outline: 'bg-white hover:bg-[#F9FAFB] text-[#171717] border border-[#E5E7EB] hover:border-[#D1D5DB]',
    danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white focus:ring-[#EF4444]',
    ghost: 'bg-transparent hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#171717]',
    success: 'bg-[#10B981] hover:bg-[#059669] text-white focus:ring-[#10B981]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
