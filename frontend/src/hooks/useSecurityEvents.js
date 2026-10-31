/**
 * Security Events & Telemetry Alerts Domain Hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { securityEventsApi } from '../api';
import { INITIAL_SECURITY_EVENTS } from '../services/mockData';

export function useSecurityEvents({ autoFetch = true } = {}) {
  const [securityEvents, setSecurityEvents] = useState(INITIAL_SECURITY_EVENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityEventsApi.listEvents(options);
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          eventType: e.event_type,
          ruleId: e.rule_id,
          ruleName: e.rule_name,
          deviceId: e.device_id,
          deviceName: e.device_name || e.device_id,
          severity: e.severity,
          status: e.status,
          evidence: e.evidence || {},
          suggestedAction: e.suggested_action || ''
        }));
        setSecurityEvents(mapped);
      }
    } catch (err) {
      console.warn('[useSecurityEvents] Fetch notice, preserving state:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
    }
  }, [autoFetch, fetchEvents]);

  return {
    securityEvents,
    setSecurityEvents,
    loading,
    error,
    fetchEvents
  };
}

export default useSecurityEvents;
