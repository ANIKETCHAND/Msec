/**
 * Workspace Navigation & Tab Management Domain Hook.
 * Encapsulates active page state, browser URL synchronization, and open tabs management.
 */

import { useState, useEffect, useCallback } from 'react';
import { PAGE_REGISTRY } from '../utils/pageRegistry';
import { STORAGE_KEYS } from '../constants/appConstants';

export function useNavigation() {
  const getInitialPage = () => {
    try {
      const path = window.location.pathname.replace(/^\//, '');
      if (path === 'landing' || path === 'login') return path;
      if (PAGE_REGISTRY[path]) return path;
    } catch (e) {}

    const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!savedUser && !token) {
      return 'landing';
    }
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [openTabs, setOpenTabs] = useState(() => {
    const initPage = getInitialPage();
    const defaults = ['dashboard', 'assessment-center', 'scan-results', 'reports'];
    if (initPage !== 'login' && initPage !== 'landing' && !defaults.includes(initPage)) {
      defaults.push(initPage);
    }
    return defaults;
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEV-VENT-502');

  // Synchronize openTabs and browser URL when currentPage changes
  useEffect(() => {
    if (currentPage && currentPage !== 'login' && currentPage !== 'landing') {
      const pageId = currentPage;
      setOpenTabs(prev => {
        const sanitized = Array.from(new Set(prev));
        if (!sanitized.includes('dashboard')) {
          sanitized.unshift('dashboard');
        }
        if (sanitized.includes(pageId)) return sanitized;
        const next = [...sanitized, pageId];
        if (next.length > 8) {
          const dropIndex = next.findIndex(p => p !== 'dashboard' && p !== pageId);
          if (dropIndex !== -1) next.splice(dropIndex, 1);
        }
        return next;
      });

      try {
        if (window.location.pathname !== `/${pageId}`) {
          window.history.pushState(null, '', `/${pageId}`);
        }
      } catch (e) {}
    }
  }, [currentPage]);

  const closeTab = useCallback((pageId) => {
    if (pageId === 'dashboard') return; // Dashboard cannot be closed
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== pageId);
      if (currentPage === pageId) {
        const fallback = next[next.length - 1] || 'dashboard';
        setCurrentPage(fallback);
      }
      return next;
    });
  }, [currentPage]);

  return {
    currentPage,
    setCurrentPage,
    openTabs,
    setOpenTabs,
    closeTab,
    selectedDeviceId,
    setSelectedDeviceId
  };
}

export default useNavigation;
