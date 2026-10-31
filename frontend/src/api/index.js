/**
 * MediShield Scalable API Master Service.
 * 
 * Provides unified access to all domain-specific APIs while preserving
 * complete backward-compatibility with legacy method signatures.
 */

import { httpClient, ApiError } from './client';
import { authApi } from './authApi';
import { devicesApi } from './devicesApi';
import { assessmentsApi } from './assessmentsApi';
import { reportsApi } from './reportsApi';
import { incidentsApi } from './incidentsApi';
import { securityEventsApi } from './securityEventsApi';
import { integrityApi } from './integrityApi';
import { auditLogsApi } from './auditLogsApi';
import { detectionApi } from './detectionApi';
import { settingsApi } from './settingsApi';
import { dashboardApi } from './dashboardApi';
import { getApiBaseUrl } from '../config/environment';

export {
  httpClient,
  ApiError,
  authApi,
  devicesApi,
  assessmentsApi,
  reportsApi,
  incidentsApi,
  securityEventsApi,
  integrityApi,
  auditLogsApi,
  detectionApi,
  settingsApi,
  dashboardApi
};

export const getApiBase = getApiBaseUrl;

class UnifiedApiService {
  constructor() {
    this.client = httpClient;
  }

  get token() {
    return this.client.token;
  }

  setToken(token) {
    this.client.setToken(token);
  }

  getHeaders() {
    return this.client.getHeaders();
  }

  async request(endpoint, options = {}) {
    return this.client.request(endpoint, options);
  }

  // Auth
  async login(email, password) {
    return authApi.login(email, password);
  }

  async logout() {
    return authApi.logout();
  }

  async getMe() {
    return authApi.getMe();
  }

  // Dashboard
  async getDashboardSummary() {
    return dashboardApi.getSummary();
  }

  async getHealth() {
    return dashboardApi.getHealth();
  }

  // Devices
  async getDevices(skip = 0, limit = 100) {
    return devicesApi.listDevices(skip, limit);
  }

  async getDevice(deviceId) {
    return devicesApi.getDevice(deviceId);
  }

  async registerDevice(deviceData) {
    return devicesApi.registerDevice(deviceData);
  }

  async updateDeviceStatus(deviceId, status) {
    return devicesApi.updateDeviceStatus(deviceId, status);
  }

  async decommissionDevice(deviceId) {
    return devicesApi.decommissionDevice(deviceId);
  }

  // Assessments & Scopes
  async getToolInventory() {
    return assessmentsApi.getToolInventory();
  }

  async getToolsInventory() {
    return assessmentsApi.getToolInventory();
  }

  async refreshToolsInventory() {
    return assessmentsApi.refreshToolInventory();
  }

  async getScopes(deviceId = null) {
    return assessmentsApi.listScopes(deviceId);
  }

  async getScope(scopeId) {
    return assessmentsApi.getScope(scopeId);
  }

  async authorizeScope(scopeData) {
    return assessmentsApi.authorizeScope(scopeData);
  }

  async revokeScope(scopeId) {
    return assessmentsApi.revokeScope(scopeId);
  }

  async getAssessments(deviceId = null) {
    return assessmentsApi.listAssessments(deviceId);
  }

  async getAssessment(assessmentId) {
    return assessmentsApi.getAssessment(assessmentId);
  }

  async getAssessmentById(assessmentId) {
    return assessmentsApi.getAssessment(assessmentId);
  }

  async executeAssessment(launchData) {
    return assessmentsApi.executeAssessment(launchData);
  }

  async cancelAssessment(assessmentId) {
    return assessmentsApi.cancelAssessment(assessmentId);
  }

  async getFindings(assessmentId) {
    return assessmentsApi.getFindings(assessmentId);
  }

  // Reports
  async getReports({ skip = 0, limit = 50, assessmentId = null } = {}) {
    return reportsApi.listReports({ skip, limit, assessmentId });
  }

  async getReportsSummary() {
    return reportsApi.getReportsSummary();
  }

  async getReport(reportId) {
    return reportsApi.getReport(reportId);
  }

  async generateReport(assessmentId, reportType = 'PDF') {
    return reportsApi.generateReport(assessmentId, reportType);
  }

  getReportDownloadUrl(reportId) {
    return reportsApi.getReportDownloadUrl(reportId);
  }

  getReportPdfUrl(reportId) {
    return reportsApi.getReportPdfUrl(reportId);
  }

  async getReportHtml(reportId) {
    return reportsApi.getReportHtml(reportId);
  }

  async downloadReportFile(reportId, preferredFilename = null) {
    return reportsApi.downloadReportFile(reportId, preferredFilename);
  }

  async exportCsv(type = 'findings') {
    return reportsApi.exportCsv(type);
  }

  // Incidents
  async getIncidents(skip = 0, limit = 50, status = null) {
    return incidentsApi.listIncidents(skip, limit, status);
  }

  async getIncident(incidentId) {
    return incidentsApi.getIncident(incidentId);
  }

  async createIncident(incidentData) {
    return incidentsApi.createIncident(incidentData);
  }

  async updateIncident(incidentId, updateData) {
    return incidentsApi.updateIncident(incidentId, updateData);
  }

  async correlateEvents(deviceId) {
    return incidentsApi.correlateEvents(deviceId);
  }

  // Security Events
  async getSecurityEvents(options = {}) {
    return securityEventsApi.listEvents(options);
  }

  async getSecurityEvent(eventId) {
    return securityEventsApi.getEvent(eventId);
  }

  // Integrity
  async getIntegrityRecords() {
    return integrityApi.listRecords();
  }

  async verifyRecordIntegrity(recordId) {
    return integrityApi.verifyRecord(recordId);
  }

  async tamperRecord(recordId) {
    return integrityApi.testTamper(recordId);
  }

  // Audit Logs
  async getAuditLogs(limit = 50) {
    return auditLogsApi.listLogs(limit);
  }

  async verifyAuditChain() {
    return auditLogsApi.verifyAuditChain();
  }

  // Settings
  async getPolicies() {
    return settingsApi.getPolicies();
  }

  async updatePolicies(policies) {
    return settingsApi.updatePolicies(policies);
  }

  // Detection & ML
  async evaluateFlow(flowMetrics) {
    return detectionApi.evaluateFlow(flowMetrics);
  }

  async getDetectionStatus() {
    return detectionApi.getStatus();
  }
}

export const api = new UnifiedApiService();
export const apiClient = api;
export default api;
