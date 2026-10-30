import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Collapsed circular search button that expands into an inline search field.
 *
 * Ported from the shadcn/TypeScript snippet to this project's conventions:
 * plain JSX, the Swiss palette (this app has no `--border`/`--card` CSS
 * variables and no shadcn setup), and a callback the header uses for routing.
 *
 * The expand/collapse animation is a CSS width transition rather than a
 * framer-motion spring: the spring stalled at its initial width (invisible,
 * non-interactive field) and the AnimatePresence exit never settled, so the
 * animated version could strand the control. CSS keeps the same look and makes
 * the open/closed state deterministic.
 */
export default function ExpandingSearchDock({
  onSearch,
  placeholder = 'Search...',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
      // The parent routes immediately, so collapse back to the dock button.
      setIsExpanded(false);
      setQuery('');
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery('');
  };

  return (
    <div
      // Inline width (rather than a utility class) so the collapsed/expanded
      // size cannot be overridden by flex shrinking or class ordering.
      style={{ width: isExpanded ? 360 : 36 }}
      className="flex shrink-0 items-center justify-end overflow-hidden transition-[width] duration-200 ease-out"
    >
      {isExpanded ? (
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2 rounded-full border border-[#E5E7EB] bg-white shadow-xs focus-within:border-[#1677FF] focus-within:ring-1 focus-within:ring-[#1677FF]/20 transition-swiss"
        >
          <div className="ml-3.5 flex items-center">
            <Search className="h-3.5 w-3.5 text-[#9CA3AF]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="h-9 flex-1 bg-transparent pr-2 text-xs text-[#171717] placeholder-[#9CA3AF] outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleCollapse}
            title="Close search"
            aria-label="Close search"
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#171717] transition-swiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          title="Search"
          aria-label="Open search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] hover:bg-white hover:text-[#171717] hover:border-[#D1D5DB] transition-swiss"
        >
          <Search className="h-4 w-4 stroke-[2]" />
        </button>
      )}
    </div>
  );
}
