import React from 'react';

/**
 * Swiss Minimalist Metric Card
 * Crisp white surface, 1px neutral border, disciplined typography
 */
export default function MetricCard({
  title,
  value,
  secondary,
  icon: Icon,
  trend,
  className = '',
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-[#E5E7EB] rounded-lg p-5
        ${onClick ? 'cursor-pointer hover:border-[#D1D5DB] transition-swiss' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[#6B7280] tracking-tight uppercase">
          {title}
        </span>
        {Icon && (
          <div className="text-[#9CA3AF]">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-semibold text-[#171717] tracking-tight tabular-nums">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-medium ${trend.type === 'positive' ? 'text-emerald-600' : trend.type === 'negative' ? 'text-rose-600' : 'text-[#6B7280]'}`}>
            {trend.text}
          </span>
        )}
      </div>

      {secondary && (
        <div className="mt-1.5 text-xs text-[#6B7280] flex items-center gap-1.5">
          {secondary}
        </div>
      )}
    </div>
  );
}
