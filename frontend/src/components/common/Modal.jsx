import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle = null,
  children,
  maxWidth = 'max-w-lg', // max-w-md, max-w-lg, max-w-2xl, max-w-4xl
  footer = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-swiss animate-fade-in">
      <div
        className={`w-full ${maxWidth} bg-white rounded-lg border border-[#E5E7EB] shadow-lg overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-[#FAFAFA]">
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
            {subtitle && <p className="text-xs text-[#6B7280] font-mono mt-0.5">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-[#9CA3AF] hover:text-[#171717] hover:bg-[#E5E7EB] transition-swiss"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto text-xs text-[#374151] flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
