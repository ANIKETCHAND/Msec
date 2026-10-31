/**
 * Security Reports & Compliance Audits Domain Hook.
 * Encapsulates report listing, summary telemetry, PDF generation, and verified downloads.
 */

import { useState, useCallback, useEffect } from 'react';
import { reportsApi } from '../api';

export function useReports({ autoFetch = true } = {}) {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async (options = { limit: 100 }) => {
    try {
      const data = await reportsApi.listReports(options);
      setReports(data || []);
      return data;
    } catch (err) {
      console.warn('[useReports] Reports list notice:', err.message);
      return [];
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await reportsApi.getReportsSummary();
      setSummary(data);
      return data;
    } catch (err) {
      console.warn('[useReports] Summary notice:', err.message);
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchReports(), fetchSummary()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchReports, fetchSummary]);

  useEffect(() => {
    if (autoFetch) {
      loadAll();
    }
  }, [autoFetch, loadAll]);

  const generateReport = useCallback(async (assessmentId, reportType = 'PDF') => {
    setGenerating(true);
    setError(null);
    try {
      const rep = await reportsApi.generateReport(assessmentId, reportType);
      setReports(prev => [rep, ...prev.filter(r => r.id !== rep.id)]);
      return rep;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const downloadReport = useCallback(async (reportId, filename = null) => {
    return await reportsApi.downloadReportFile(reportId, filename);
  }, []);

  const exportCsv = useCallback(async (type) => {
    return await reportsApi.exportCsv(type);
  }, []);

  return {
    reports,
    summary,
    loading,
    generating,
    error,
    loadAll,
    fetchReports,
    fetchSummary,
    generateReport,
    downloadReport,
    exportCsv
  };
}

export default useReports;
