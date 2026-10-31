/**
 * Defensive Security Assessments Domain Hook.
 * Encapsulates assessment execution, scope certificate authorization, tools inventory, and findings.
 */

import { useState, useCallback, useEffect } from 'react';
import { assessmentsApi } from '../api';

export function useAssessments({ autoFetch = true } = {}) {
  const [scopes, setScopes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [toolsInventory, setToolsInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  const fetchScopes = useCallback(async (deviceId = null) => {
    try {
      const data = await assessmentsApi.listScopes(deviceId);
      setScopes(data || []);
      return data;
    } catch (err) {
      console.warn('[useAssessments] Scope list notice:', err.message);
      return [];
    }
  }, []);

  const fetchAssessments = useCallback(async (deviceId = null) => {
    try {
      const data = await assessmentsApi.listAssessments(deviceId);
      setAssessments(data || []);
      return data;
    } catch (err) {
      console.warn('[useAssessments] Assessments list notice:', err.message);
      return [];
    }
  }, []);

  const fetchToolsInventory = useCallback(async () => {
    try {
      const data = await assessmentsApi.getToolInventory();
      setToolsInventory(data || []);
      return data;
    } catch (err) {
      console.warn('[useAssessments] Tool inventory notice:', err.message);
      return [];
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchScopes(),
        fetchAssessments(),
        fetchToolsInventory()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchScopes, fetchAssessments, fetchToolsInventory]);

  useEffect(() => {
    if (autoFetch) {
      loadAll();
    }
  }, [autoFetch, loadAll]);

  const authorizeScope = useCallback(async (scopeData) => {
    const created = await assessmentsApi.authorizeScope(scopeData);
    setScopes(prev => [created, ...prev]);
    return created;
  }, []);

  const revokeScope = useCallback(async (scopeId) => {
    const revoked = await assessmentsApi.revokeScope(scopeId);
    setScopes(prev => prev.map(s => (s.id === scopeId ? { ...s, authorization_status: 'REVOKED' } : s)));
    return revoked;
  }, []);

  const executeAssessment = useCallback(async (launchData) => {
    setExecuting(true);
    setError(null);
    try {
      const result = await assessmentsApi.executeAssessment(launchData);
      setAssessments(prev => [result, ...prev.filter(a => a.id !== result.id)]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, []);

  const cancelAssessment = useCallback(async (assessmentId) => {
    const cancelled = await assessmentsApi.cancelAssessment(assessmentId);
    setAssessments(prev => prev.map(a => (a.id === assessmentId ? { ...a, status: 'CANCELLED' } : a)));
    return cancelled;
  }, []);

  const getFindings = useCallback(async (assessmentId) => {
    return await assessmentsApi.getFindings(assessmentId);
  }, []);

  return {
    scopes,
    assessments,
    toolsInventory,
    loading,
    executing,
    error,
    loadAll,
    fetchScopes,
    fetchAssessments,
    fetchToolsInventory,
    authorizeScope,
    revokeScope,
    executeAssessment,
    cancelAssessment,
    getFindings
  };
}

export default useAssessments;
