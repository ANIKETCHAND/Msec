import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

/**
 * Collapsed circular search button that expands into an inline search field.
 *
 * Ported from the shadcn/TypeScript snippet to this project's conventions:
 * plain JSX, the Swiss palette (this app has no `--border`/`--card` CSS
 * variables, and no shadcn setup), and a callback the header uses for routing.
 *
 * Note: this intentionally does not use `AnimatePresence mode="wait"`. Its
 * spring exit for the form never settled, which left an invisible-but-mounted
 * form and no button to reopen it. Conditional rendering plus `motion` keeps the
 * expand/collapse animation while making the open/closed state deterministic.
 */
export default function ExpandingSearchDock({
  onSearch,
  placeholder = 'Search...',
  defaultValue = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
      setIsExpanded(false);
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery('');
  };

  return (
    <div className="relative flex items-center justify-center">
      {isExpanded ? (
        <motion.form
          initial={{ width: 36, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onSubmit={handleSubmit}
          className="relative"
        >
          <div className="relative flex items-center gap-2 overflow-hidden rounded-full border border-[#E5E7EB] bg-white shadow-xs focus-within:border-[#1677FF] focus-within:ring-1 focus-within:ring-[#1677FF]/20 transition-swiss">
            <div className="ml-3.5">
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
            <motion.button
              type="button"
              onClick={handleCollapse}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Close search"
              aria-label="Close search"
              className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#171717] transition-swiss"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onClick={() => setIsExpanded(true)}
          title="Search"
          aria-label="Open search"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] hover:bg-white hover:text-[#171717] hover:border-[#D1D5DB] transition-swiss"
        >
          <Search className="h-4 w-4 stroke-[2]" />
        </motion.button>
      )}
    </div>
  );
}
