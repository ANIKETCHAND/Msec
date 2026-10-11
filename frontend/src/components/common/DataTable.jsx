import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  onRowClick = null,
  className = '',
  loading = false,
}) {
  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-[#6B7280]">
        <div className="w-6 h-6 border-2 border-[#1677FF] border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-mono">Loading data records...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-[#9CA3AF] text-xs font-mono border border-dashed border-[#E5E7EB] rounded-md">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto border border-[#E5E7EB] rounded-md bg-white ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{ width: col.width || 'auto' }}
                className={`py-2.5 px-3 font-semibold text-[#6B7280] uppercase tracking-wider text-[11px] font-mono ${col.headerClassName || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {data.map((row, rowIdx) => {
            const isClickable = Boolean(onRowClick);
            return (
              <tr
                key={row[keyField] || rowIdx}
                onClick={() => isClickable && onRowClick(row)}
                className={`transition-swiss ${isClickable ? 'cursor-pointer hover:bg-[#F9FAFB]' : 'hover:bg-[#FCFCFD]'}`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`py-2.5 px-3 text-[#171717] align-middle ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
