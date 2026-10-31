/**
 * Data Integrity & Cryptographic Anti-Tamper Domain Hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { integrityApi } from '../api';
import { INTEGRITY_SAMPLE_RECORDS } from '../services/mockData';

export function useIntegrity({ autoFetch = true, onAudit = null } = {}) {
  const [integrityRecords, setIntegrityRecords] = useState(INTEGRITY_SAMPLE_RECORDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await integrityApi.listRecords();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(r => ({
          recordId: r.record_id,
          deviceId: r.device_id,
          recordType: r.record_type,
          sha256Hash: r.sha256_hash,
          rawPayload: r.raw_payload,
          status: r.status,
          lastVerified: r.last_verified,
          tamperCount: r.tamper_count || 0
        }));
        setIntegrityRecords(mapped);
      }
    } catch (err) {
      console.warn('[useIntegrity] Fetch notice, preserving state:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchRecords();
    }
  }, [autoFetch, fetchRecords]);

  const verifyRecord = useCallback(async (recordId) => {
    try {
      const res = await integrityApi.verifyRecord(recordId);
      setIntegrityRecords(prev =>
        prev.map(rec =>
          rec.recordId === recordId
            ? {
                ...rec,
                status: res.is_match ? 'VERIFIED' : 'TAMPERED',
                lastVerified: res.verified_at
              }
            : rec
        )
      );
      if (onAudit) {
        onAudit(
          'INTEGRITY_VERIFICATION',
          'IntegrityRecord',
          recordId,
          res.is_match
            ? `Cryptographic SHA-256 integrity verified for ${recordId}.`
            : `INTEGRITY TAMPER DETECTED: Hash mismatch on ${recordId}.`
        );
      }
      return res;
    } catch (err) {
      console.warn('[useIntegrity] Verification notice:', err.message);
      throw err;
    }
  }, [onAudit]);

  const tamperRecord = useCallback(async (recordId) => {
    try {
      const tampered = await integrityApi.testTamper(recordId);
      setIntegrityRecords(prev =>
        prev.map(rec =>
          rec.recordId === recordId
            ? {
                ...rec,
                status: 'TAMPERED',
                sha256Hash: tampered?.sha256_hash || rec.sha256Hash,
                rawPayload: tampered?.raw_payload || rec.rawPayload,
                lastVerified: new Date().toISOString()
              }
            : rec
        )
      );
      if (onAudit) {
        onAudit('INTEGRITY_TAMPER_TEST', 'IntegrityRecord', recordId, `Controlled payload mutation executed on ${recordId}.`);
      }
      return tampered;
    } catch (err) {
      console.warn('[useIntegrity] Tamper diagnostic notice:', err.message);
      throw err;
    }
  }, [onAudit]);

  return {
    integrityRecords,
    setIntegrityRecords,
    loading,
    error,
    fetchRecords,
    verifyRecord,
    tamperRecord
  };
}

export default useIntegrity;
