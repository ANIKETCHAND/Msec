import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  Info,
  Server,
  ArrowRight,
  Download,
  FileCode,
  ExternalLink,
  Laptop,
  Check
} from 'lucide-react';

const PRESET_DEVICES = [
  {
    label: 'Portable X-Ray',
    idPrefix: 'DEV-XRAY',
    name: 'Mobile Digital X-Ray System',
    deviceType: 'Radiology Imaging',
    ipAddress: '192.168.30.125',
    macAddress: '00:1A:2B:66:77:88',
    firmwareVersion: '3.4.1',
    networkSegment: 'RADIOLOGY_VLAN_30',
    department: 'Radiology',
    manufacturer: 'Siemens Healthineers',
    model: 'MobileArt Evolution',
    location: 'Imaging Suite B',
    riskLevel: 'medium',
    owner: 'Clinical Engineering',
    securityScore: 78.0
  },
  {
    label: 'Hemodialysis Unit',
    idPrefix: 'DEV-DIAL',
    name: 'Hemodialysis System Delta',
    deviceType: 'Dialysis Machine',
    ipAddress: '192.168.10.188',
    macAddress: '00:1A:2B:99:AA:BB',
    firmwareVersion: '2.1.0',
    networkSegment: 'ICU_VLAN_10',
    department: 'Nephrology',
    manufacturer: 'Fresenius Medical Care',
    model: '5008S CorDiax',
    location: 'Renal Care Unit 4',
    riskLevel: 'high',
    owner: 'Biomedical Support',
    securityScore: 64.0
  },
  {
    label: 'Anesthesia Machine',
    idPrefix: 'DEV-ANES',
    name: 'Smart Anesthesia Station',
    deviceType: 'Surgical Equipment',
    ipAddress: '192.168.20.142',
    macAddress: '00:1A:2B:33:44:55',
    firmwareVersion: '4.0.2',
    networkSegment: 'OR_VLAN_20',
    department: 'Surgical Services',
    manufacturer: 'Dräger',
    model: 'Perseus A500',
    location: 'Operating Room 3',
    riskLevel: 'low',
    owner: 'Anesthesia Dept',
    securityScore: 91.0
  },
  {
    label: 'Syringe Pump',
    idPrefix: 'DEV-SYRN',
    name: 'Smart Syringe Pump Neo',
    deviceType: 'Infusion Pump',
    ipAddress: '192.168.10.95',
    macAddress: '00:1A:2B:11:22:33',
    firmwareVersion: '1.8.5',
    networkSegment: 'ICU_VLAN_10',
    department: 'Neonatal ICU',
    manufacturer: 'B. Braun',
    model: 'Perfusor Space',
    location: 'NICU Pod 2',
    riskLevel: 'medium',
    owner: 'Clinical Engineering',
    securityScore: 82.0
  }
];

export default function DevicesScanPage() {
  const {
    devices,
    addDevice,
    logAudit,
    currentUser,
    setCurrentPage,
    setSelectedDeviceId
  } = useApp();

  // Active Device Selection
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Tools Inventory
  const [toolsInventory, setToolsInventory] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // Scope Authorization Form
  const [scopeProfile, setScopeProfile] = useState('DEFENSIVE_AUDIT');
  const [selectedTools, setSelectedTools] = useState(['native_probe', 'nmap', 'nuclei']);
  const [durationHours, setDurationHours] = useState(4);
  const [justification, setJustification] = useState('Routine quarterly clinical IoMT security audit and perimeter verification');
  const [authorizedScope, setAuthorizedScope] = useState(null);
  const [authorizing, setAuthorizing] = useState(false);

  // Scan Execution State
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [executionTimeline, setExecutionTimeline] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  // Add Device Modal State
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    deviceType: 'Infusion Pump',
    ipAddress: '',
    macAddress: '',
    firmwareVersion: '1.0.0',
    networkSegment: 'ICU_VLAN_10',
    department: 'Intensive Care Unit',
    manufacturer: '',
    model: '',
    location: '',
    owner: 'Clinical Engineering'
  });

  // Load tools inventory and default selected device
  useEffect(() => {
    loadTools();
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);

  const loadTools = async () => {
    setLoadingTools(true);
    try {
      const inv = await api.getToolsInventory();
      if (inv && Array.isArray(inv)) {
        setToolsInventory(inv);
      }
    } catch (err) {
      console.warn('[DevicesScan] Tools inventory load warning:', err.message);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    setAuthorizedScope(null);
    setLatestAssessment(null);
    setStatusMsg(null);
  };

  const handleApplyPreset = (preset) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setNewDevice({
      name: `${preset.name} #${randomSuffix}`,
      deviceType: preset.deviceType,
      ipAddress: preset.ipAddress,
      macAddress: preset.macAddress,
      firmwareVersion: preset.firmwareVersion,
      networkSegment: preset.networkSegment,
      department: preset.department,
      manufacturer: preset.manufacturer,
      model: preset.model,
      location: preset.location,
      owner: preset.owner
    });
  };

  const handleAddDeviceSubmit = async (e) => {
    e.preventDefault();
    if (!newDevice.name.trim() || !newDevice.ipAddress.trim()) {
      setStatusMsg({ type: 'error', text: 'Device name and IP address are required.' });
      return;
    }

    try {
      let createdDevice = null;
      if (api.createDevice) {
        createdDevice = await api.createDevice({
          name: newDevice.name.trim(),
          device_type: newDevice.deviceType,
          ip_address: newDevice.ipAddress.trim(),
          mac_address: newDevice.macAddress.trim() || '00:1A:2B:00:11:22',
          firmware_version: newDevice.firmwareVersion.trim() || '1.0.0',
          network_segment: newDevice.networkSegment,
          department: newDevice.department,
          manufacturer: newDevice.manufacturer || 'Generic Medical',
          model: newDevice.model || 'IoMT Device',
          location: newDevice.location || 'Hospital Ward',
          risk_level: 'medium',
          security_score: 85.0
        });
      }

      const localDevice = createdDevice ? {
        id: createdDevice.id,
        name: createdDevice.name,
        deviceType: createdDevice.device_type,
        ipAddress: createdDevice.ip_address,
        macAddress: createdDevice.mac_address,
        firmwareVersion: createdDevice.firmware_version,
        networkSegment: createdDevice.network_segment,
        department: createdDevice.department,
        riskLevel: createdDevice.risk_level || 'medium',
        status: createdDevice.status || 'online',
        securityScore: createdDevice.security_score || 85.0
      } : {
        id: `DEV-MANUAL-${Date.now().toString().slice(-4)}`,
        name: newDevice.name.trim(),
        deviceType: newDevice.deviceType,
        ipAddress: newDevice.ipAddress.trim(),
        macAddress: newDevice.macAddress.trim() || '00:1A:2B:00:11:22',
        firmwareVersion: newDevice.firmwareVersion.trim() || '1.0.0',
        networkSegment: newDevice.networkSegment,
        department: newDevice.department,
        riskLevel: 'medium',
        status: 'online',
        securityScore: 85.0
      };

      if (addDevice) {
        addDevice(localDevice);
      }
      setSelectedDevice(localDevice);
      setAddDeviceModalOpen(false);
      setStatusMsg({ type: 'success', text: `Device "${localDevice.name}" added successfully and selected for scan.` });

      if (logAudit) {
        logAudit('DEVICE_REGISTERED', 'Device', localDevice.id, `Manual device registration: ${localDevice.name} (${localDevice.ipAddress})`);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to add device: ${err.message}` });
    }
  };

  const handleAuthorizeScope = async () => {
    if (!selectedDevice) return;
    setAuthorizing(true);
    setStatusMsg(null);
    try {
      const scopeData = {
        device_id: selectedDevice.id,
        target_ip: selectedDevice.ipAddress,
        assessment_profile: scopeProfile,
        selected_tools: selectedTools,
        duration_hours: parseInt(durationHours, 10),
        justification: justification
      };
      const scope = await api.authorizeScope(scopeData);
      setAuthorizedScope(scope);
      setStatusMsg({ type: 'success', text: `Defensive Scope Certificate ${scope.id} authorized for ${selectedDevice.name}.` });
      if (logAudit) {
        logAudit('ASSESSMENT_SCOPE_AUTHORIZED', 'AssessmentScope', scope.id, `Scope authorized on ${selectedDevice.id}`);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Scope authorization failed: ${err.message}` });
    } finally {
      setAuthorizing(false);
    }
  };

  const handleStartScan = async () => {
    if (!authorizedScope || !selectedDevice) return;
    setScanning(true);
    setScanProgress(10);
    setScanStatusText('Initializing defensive scanning harness...');
    setExecutionTimeline([
      { event: 'Execution Initialized', timestamp: new Date().toLocaleTimeString(), source: 'MediShield Orchestrator' },
      { event: `Scope Verified: ${authorizedScope.id}`, timestamp: new Date().toLocaleTimeString(), source: 'Scope Validator' }
    ]);

    try {
      setScanProgress(30);
      setScanStatusText('Executing defensive socket and service probes...');

      const asm = await api.executeAssessment({
        scope_id: authorizedScope.id,
        device_id: selectedDevice.id,
        profile: scopeProfile,
        tools: selectedTools
      });

      setScanProgress(75);
      setScanStatusText('Normalizing findings & calculating risk scores...');

      // Small delay for clean UI feedback
      await new Promise(r => setTimeout(r, 600));

      setScanProgress(100);
      setScanStatusText(`Scan Complete — Status: ${asm.status}`);
      setLatestAssessment(asm);

      if (asm.raw_results && asm.raw_results.execution_timeline) {
        setExecutionTimeline(asm.raw_results.execution_timeline);
      }

      setStatusMsg({
        type: asm.status === 'FAILED' ? 'error' : asm.status === 'PARTIALLY_COMPLETED' ? 'warning' : 'success',
        text: `Assessment ${asm.id} finished with status "${asm.status}". Found ${asm.findings ? asm.findings.length : 0} observations/findings.`
      });

      if (logAudit) {
        logAudit('ASSESSMENT_COMPLETED', 'Assessment', asm.id, `Assessment status: ${asm.status}, score: ${asm.security_score}`);
      }
    } catch (err) {
      setScanProgress(100);
      setScanStatusText('Scan failed due to an error.');
      setStatusMsg({ type: 'error', text: `Scan execution error: ${err.message}` });
    } finally {
      setScanning(false);
    }
  };

  const toggleTool = (toolName) => {
    if (toolName === 'native_probe') return; // built-in safe probe cannot be removed
    if (selectedTools.includes(toolName)) {
      setSelectedTools(selectedTools.filter(t => t !== toolName));
    } else {
      setSelectedTools([...selectedTools, toolName]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header with Direct Context and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#171717] tracking-tight">
              Devices & Security Scan
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Shield className="w-3.5 h-3.5" />
              Defensive Assessment Engine
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Select a verified IoMT device, authorize defensive scope boundaries, and execute non-destructive security audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAddDeviceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1677FF] text-[#1677FF] hover:bg-blue-50 text-xs font-semibold rounded-lg transition-swiss cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
          {latestAssessment && (
            <button
              onClick={() => setCurrentPage('scan-results')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>View Scan Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            statusMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : statusMsg.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : statusMsg.type === 'warning' ? (
              <Info className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Device Selection & Scope Certificate (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* STEP 1: SELECT DEVICE */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                  Select Authorized Device
                </span>
              </div>
              <span className="text-[11px] text-[#6B7280]">
                {devices.length} registered
              </span>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-[#374151] mb-1.5">
                Target Device Asset
              </label>
              <select
                value={selectedDevice?.id || ''}
                onChange={(e) => {
                  const dev = devices.find(d => d.id === e.target.value);
                  if (dev) handleSelectDevice(dev);
                }}
                className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.ipAddress} ({d.deviceType || d.department})
                  </option>
                ))}
              </select>
            </div>

            {selectedDevice && (
              <div className="mt-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[#171717]">{selectedDevice.name}</h3>
                    <p className="text-[11px] font-mono text-[#6B7280]">{selectedDevice.id}</p>
                  </div>
                  <StatusBadge status={selectedDevice.riskLevel || 'safe'} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB]/60 text-[11px]">
                  <div>
                    <span className="text-[#6B7280]">IP Address:</span>{' '}
                    <span className="font-mono font-medium text-[#171717]">{selectedDevice.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">VLAN:</span>{' '}
                    <span className="font-medium text-[#171717]">{selectedDevice.networkSegment || 'ICU_VLAN_10'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Type:</span>{' '}
                    <span className="font-medium text-[#171717]">{selectedDevice.deviceType}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Department:</span>{' '}
                    <span className="font-medium text-[#171717]">{selectedDevice.department}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: AUTHORIZE DEFENSIVE SCOPE */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                  Defensive Scope Authorization
                </span>
              </div>
              {authorizedScope ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Authorized
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Required
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Assessment Profile
                </label>
                <select
                  value={scopeProfile}
                  onChange={(e) => setScopeProfile(e.target.value)}
                  disabled={!!authorizedScope}
                  className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20"
                >
                  <option value="DEFENSIVE_AUDIT">Defensive Audit (Port, TLS, Header & CVE Check)</option>
                  <option value="PASSIVE_DISCOVERY">Passive Discovery (Service & Perimeter Fingerprinting)</option>
                  <option value="COMPLIANCE_SCAN">Compliance Scan (Healthcare Security Baseline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Authorization Validity Window
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  disabled={!!authorizedScope}
                  className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20"
                >
                  <option value={2}>2 Hours</option>
                  <option value={4}>4 Hours (Standard Audit)</option>
                  <option value={8}>8 Hours (Maintenance Window)</option>
                  <option value={24}>24 Hours (Full Cycle)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Clinical Justification
                </label>
                <input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  disabled={!!authorizedScope}
                  className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20"
                />
              </div>

              {/* Defensive Bounds Guarantee */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] text-[#4B5563] space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Defensive Security Safeguards
                </div>
                <p>• Strictly non-destructive socket, TLS, and HTTP response inspections.</p>
                <p>• Target IP strictly constrained to registered device ({selectedDevice?.ipAddress}).</p>
                <p>• DoS, exploit payloads, and credential brute-forcing strictly prohibited.</p>
              </div>

              {!authorizedScope ? (
                <button
                  onClick={handleAuthorizeScope}
                  disabled={authorizing || !selectedDevice}
                  className="w-full py-2.5 px-4 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authorizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Authorize Scope Certificate</span>
                </button>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-900">Certificate {authorizedScope.id}</span>
                    <p className="text-[11px] text-emerald-700">Expires: {new Date(authorizedScope.expires_at).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => setAuthorizedScope(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tool Selection, Execution & Live Monitor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 3: CONFIGURE TOOLS & START SCAN */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                  Defensive Tools & Execution
                </span>
              </div>
              <button
                onClick={loadTools}
                title="Refresh tools inventory"
                className="text-[#6B7280] hover:text-[#171717] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTools ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Tool Selection Cards */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Native Probe Card */}
              <div
                onClick={() => toggleTool('native_probe')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedTools.includes('native_probe')
                    ? 'border-[#1677FF] bg-blue-50/30'
                    : 'border-[#E5E7EB] bg-white opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">Native Defensive Prober</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-emerald-100 text-emerald-800">
                    AVAILABLE
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Built-in socket connect, real TLS certificate audit, and HTTP security header auditor.
                </p>
                <div className="mt-2 text-[10px] text-[#1677FF] font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Core Probe (Required)
                </div>
              </div>

              {/* Nmap Adapter Card */}
              <div
                onClick={() => toggleTool('nmap')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedTools.includes('nmap')
                    ? 'border-[#1677FF] bg-blue-50/30'
                    : 'border-[#E5E7EB] bg-white opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">Nmap Service Scanner</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    toolsInventory.find(t => t.name === 'nmap')?.available
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {toolsInventory.find(t => t.name === 'nmap')?.available ? 'AVAILABLE' : 'NOT INSTALLED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Comprehensive port discovery & service banner inspection (honest fallback if missing).
                </p>
                <div className="mt-2 text-[10px] text-gray-500 font-medium flex items-center gap-1">
                  {selectedTools.includes('nmap') ? '✓ Selected' : '+ Click to add'}
                </div>
              </div>

              {/* Nuclei Adapter Card */}
              <div
                onClick={() => toggleTool('nuclei')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedTools.includes('nuclei')
                    ? 'border-[#1677FF] bg-blue-50/30'
                    : 'border-[#E5E7EB] bg-white opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">Nuclei CVE Engine</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    toolsInventory.find(t => t.name === 'nuclei')?.available
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {toolsInventory.find(t => t.name === 'nuclei')?.available ? 'AVAILABLE' : 'NOT INSTALLED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Targeted YAML vulnerability template verification against known CVE signatures.
                </p>
                <div className="mt-2 text-[10px] text-gray-500 font-medium flex items-center gap-1">
                  {selectedTools.includes('nuclei') ? '✓ Selected' : '+ Click to add'}
                </div>
              </div>

              {/* Nikto Adapter Card */}
              <div
                onClick={() => toggleTool('nikto')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedTools.includes('nikto')
                    ? 'border-[#1677FF] bg-blue-50/30'
                    : 'border-[#E5E7EB] bg-white opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">Nikto Web Auditor</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    toolsInventory.find(t => t.name === 'nikto')?.available
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {toolsInventory.find(t => t.name === 'nikto')?.available ? 'AVAILABLE' : 'NOT INSTALLED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Clinical web interface inspection for outdated server binaries and exposed files.
                </p>
                <div className="mt-2 text-[10px] text-gray-500 font-medium flex items-center gap-1">
                  {selectedTools.includes('nikto') ? '✓ Selected' : '+ Click to add'}
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-5">
              <button
                onClick={handleStartScan}
                disabled={scanning || !authorizedScope}
                className="w-full py-3 px-4 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {scanning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                <span>
                  {scanning
                    ? 'Assessment In Progress...'
                    : authorizedScope
                    ? `Start Security Assessment on ${selectedDevice?.name}`
                    : 'Authorize Scope Above First'}
                </span>
              </button>
            </div>
          </div>

          {/* STEP 4: LIVE EXECUTION PROGRESS & TIMELINE */}
          {(scanning || latestAssessment) && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Execution Progress & Verification
                  </span>
                </div>
                {latestAssessment && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    latestAssessment.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : latestAssessment.status === 'PARTIALLY_COMPLETED'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {latestAssessment.status}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                  <span>{scanStatusText}</span>
                  <span className="font-mono">{scanProgress}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      latestAssessment?.status === 'FAILED' ? 'bg-red-500' : 'bg-[#1677FF]'
                    }`}
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>

              {/* Completed Results Summary Banner */}
              {latestAssessment && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#171717]">
                        Assessment ID: {latestAssessment.id}
                      </span>
                      <p className="text-[11px] text-[#6B7280]">
                        Executed on target: {latestAssessment.target_ip} ({latestAssessment.profile})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#171717]">
                        {latestAssessment.security_score != null ? Math.round(latestAssessment.security_score) : 85}
                      </span>
                      <span className="text-xs text-[#6B7280]"> / 100 Posture</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => setCurrentPage('scan-results')}
                      className="px-3.5 py-1.5 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-medium rounded-lg transition-swiss flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>View All Findings ({latestAssessment.findings?.length || 0})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setCurrentPage('reports')}
                      className="px-3.5 py-1.5 border border-[#E5E7EB] hover:bg-white text-[#374151] text-xs font-medium rounded-lg transition-swiss flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate Certified Report</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Timeline */}
              {executionTimeline.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                    Execution Timeline
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {executionTimeline.map((item, idx) => (
                      <div key={idx} className="text-[11px] flex items-start justify-between p-1.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]/60">
                        <span className="text-[#171717]">{item.event}</span>
                        <span className="font-mono text-[#6B7280] text-[10px] ml-2 shrink-0">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'now'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ADD DEVICE MODAL */}
      <Modal
        isOpen={addDeviceModalOpen}
        onClose={() => setAddDeviceModalOpen(false)}
        title="Register Medical Device for Defensive Audit"
      >
        <form onSubmit={handleAddDeviceSubmit} className="space-y-4">
          <p className="text-xs text-[#6B7280]">
            Add an authorized hospital IoMT asset to the registry. Select a preset or specify hospital IP/VLAN boundaries.
          </p>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] uppercase mb-1.5">
              Quick Clinical Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_DEVICES.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => handleApplyPreset(p)}
                  className="p-2 border border-[#E5E7EB] hover:border-[#1677FF] bg-[#F9FAFB] hover:bg-blue-50/30 rounded text-left text-xs transition-swiss cursor-pointer"
                >
                  <span className="font-semibold text-[#171717] block">{p.label}</span>
                  <span className="text-[10px] font-mono text-[#6B7280]">{p.ipAddress}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Device Name *</label>
              <input
                type="text"
                required
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                placeholder="e.g. ICU Infusion Pump 4"
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Device Type *</label>
              <select
                value={newDevice.deviceType}
                onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              >
                <option value="Infusion Pump">Infusion Pump</option>
                <option value="Mechanical Ventilator">Mechanical Ventilator</option>
                <option value="Patient Monitor">Patient Monitor</option>
                <option value="Radiology Imaging">Radiology Imaging</option>
                <option value="Dialysis Machine">Dialysis Machine</option>
                <option value="Surgical Equipment">Surgical Equipment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Target IP Address *</label>
              <input
                type="text"
                required
                value={newDevice.ipAddress}
                onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                placeholder="192.168.10.x or 127.0.0.1"
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">MAC Address</label>
              <input
                type="text"
                value={newDevice.macAddress}
                onChange={(e) => setNewDevice({ ...newDevice, macAddress: e.target.value })}
                placeholder="00:1A:2B:..."
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Clinical Department</label>
              <input
                type="text"
                value={newDevice.department}
                onChange={(e) => setNewDevice({ ...newDevice, department: e.target.value })}
                placeholder="Intensive Care Unit"
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Network Segment (VLAN)</label>
              <select
                value={newDevice.networkSegment}
                onChange={(e) => setNewDevice({ ...newDevice, networkSegment: e.target.value })}
                className="w-full text-xs border border-[#E5E7EB] rounded p-2 focus:ring-1 focus:ring-[#1677FF]"
              >
                <option value="ICU_VLAN_10">ICU_VLAN_10 (Critical)</option>
                <option value="OR_VLAN_20">OR_VLAN_20 (Operating)</option>
                <option value="RADIOLOGY_VLAN_30">RADIOLOGY_VLAN_30</option>
                <option value="GENERAL_WARD_VLAN_40">GENERAL_WARD_VLAN_40</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setAddDeviceModalOpen(false)}
              className="px-3 py-2 border border-[#E5E7EB] text-xs font-medium rounded hover:bg-[#F9FAFB] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold rounded shadow-sm cursor-pointer"
            >
              Register & Authorize
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
