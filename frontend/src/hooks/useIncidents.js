/**
 * Incident Management Domain Hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { incidentsApi } from '../api';
import { INITIAL_INCIDENTS } from '../services/mockData';

export function useIncidents({ autoFetch = true, onAudit = null } = {}) {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentsApi.listIncidents();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(inc => ({
          id: inc.id,
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          deviceId: inc.device_id,
          assignedTo: inc.assigned_to,
          createdAt: inc.created_at,
          notes: inc.notes || []
        }));
        setIncidents(mapped);
      }
    } catch (err) {
      console.warn('[useIncidents] Fetch notice, preserving state:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchIncidents();
    }
  }, [autoFetch, fetchIncidents]);

  const updateIncidentStatus = useCallback(async (incidentId, newStatus) => {
    try {
      await incidentsApi.updateIncident(incidentId, { status: newStatus });
    } catch (err) {
      console.warn('[useIncidents] Backend status update notice:', err.message);
    }

    setIncidents(prev => prev.map(inc => (inc.id === incidentId ? { ...inc, status: newStatus } : inc)));

    if (onAudit) {
      onAudit('INCIDENT_STATUS_UPDATED', 'Incident', incidentId, `Status transitioned to ${newStatus}.`);
    }
  }, [onAudit]);

  const correlateEvents = useCallback(async (deviceId) => {
    try {
      const inc = await incidentsApi.correlateEvents(deviceId);
      if (inc) {
        setIncidents(prev => [inc, ...prev.filter(i => i.id !== inc.id)]);
      }
      return inc;
    } catch (err) {
      console.warn('[useIncidents] Correlation notice:', err.message);
      return null;
    }
  }, []);

  return {
    incidents,
    setIncidents,
    loading,
    error,
    fetchIncidents,
    updateIncidentStatus,
    correlateEvents
  };
}

export default useIncidents;
