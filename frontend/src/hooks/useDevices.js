/**
 * IoMT Devices Domain Hook.
 * Encapsulates device inventory fetching, status management, microsegmentation isolation, and registration.
 */

import { useState, useCallback, useEffect } from 'react';
import { devicesApi } from '../api';
import { INITIAL_DEVICES } from '../services/mockData';
import { DEVICE_STATUS } from '../constants/appConstants';

export function useDevices({ autoFetch = true, onAudit = null } = {}) {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await devicesApi.listDevices();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(d => ({
          id: d.id,
          name: d.name,
          deviceType: d.device_type,
          ipAddress: d.ip_address,
          macAddress: d.mac_address || '00:1A:C2:7B:00:00',
          firmwareVersion: d.firmware_version || 'v2.1',
          networkSegment: d.network_segment || 'ICU_VLAN_10',
          status: d.status || DEVICE_STATUS.ONLINE,
          riskLevel: d.risk_level || 'low',
          securityScore: d.security_score ?? 85,
          lastSeen: d.last_seen || 'Just now',
          patientRoom: d.patient_room || 'ICU Room 102',
          batteryLevel: d.battery_level ?? 95,
          telemetry: d.telemetry_attributes || {}
        }));
        setDevices(mapped);
      }
    } catch (err) {
      console.warn('[useDevices] Backend fetch notice, preserving state:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchDevices();
    }
  }, [autoFetch, fetchDevices]);

  const toggleDeviceIsolation = useCallback(async (deviceId) => {
    const target = devices.find(d => d.id === deviceId);
    if (!target) return;
    const isCurrentlyIsolated = target.status === DEVICE_STATUS.ISOLATED;
    const newStatus = isCurrentlyIsolated ? DEVICE_STATUS.ONLINE : DEVICE_STATUS.ISOLATED;

    try {
      await devicesApi.updateDeviceStatus(deviceId, newStatus);
    } catch (err) {
      console.warn('[useDevices] Backend status update notice:', err.message);
    }

    setDevices(prev => prev.map(d => (d.id === deviceId ? { ...d, status: newStatus } : d)));

    if (onAudit) {
      onAudit(
        isCurrentlyIsolated ? 'DEVICE_UNQUARANTINED' : 'DEVICE_ISOLATED',
        'Device',
        deviceId,
        isCurrentlyIsolated
          ? `Device ${deviceId} restored to operational network segment.`
          : `Device ${deviceId} isolated into microsegmentation quarantine VLAN.`
      );
    }
  }, [devices, onAudit]);

  const registerDevice = useCallback(async (newDeviceData) => {
    try {
      const created = await devicesApi.registerDevice(newDeviceData);
      setDevices(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.warn('[useDevices] Device creation notice:', err.message);
      setDevices(prev => [newDeviceData, ...prev]);
      return newDeviceData;
    }
  }, []);

  const decommissionDevice = useCallback(async (deviceId) => {
    try {
      await devicesApi.decommissionDevice(deviceId);
    } catch (err) {
      console.warn('[useDevices] Decommission notice:', err.message);
    }
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  }, []);

  return {
    devices,
    setDevices,
    loading,
    error,
    fetchDevices,
    toggleDeviceIsolation,
    registerDevice,
    decommissionDevice
  };
}

export default useDevices;
