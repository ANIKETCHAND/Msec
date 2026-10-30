import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ReportDownloadModal from '../components/common/ReportDownloadModal';
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
  Laptop
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

export default function AssessmentCenterPage() {
  const { devices, currentUser, setCurrentPage, registerDevice } = useApp();

  const [scopes, setScopes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [lastGeneratedReport, setLastGeneratedReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // 8-Step Focused Workflow State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id || 'DEV-VENT-502');
  const [selectedProfile, setSelectedProfile] = useState('DEFENSIVE_AUDIT');
  const [selectedTools, setSelectedTools] = useState(['nmap', 'nuclei']);
  const [durationHours, setDurationHours] = useState(4);
  const [justification, setJustification] = useState('Hospital clinical IoMT compliance audit');
  const [activeScopeId, setActiveScopeId] = useState('');

  // Add Device Modal State
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [deviceSubmitting, setDeviceSubmitting] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState('');
  const [deviceForm, setDeviceForm] = useState({
    id: `DEV-XRAY-${Math.floor(100 + Math.random() * 900)}`,
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
  });

  const applyPreset = (preset) => {
    setDeviceForm({
      ...preset,
      id: `${preset.idPrefix}-${Math.floor(100 + Math.random() * 900)}`
    });
    setAddDeviceError('');
  };

  const handleCreateDevice = async (e) => {
    if (e) e.preventDefault();
    setAddDeviceError('');

    if (!deviceForm.name.trim()) {
      setAddDeviceError('Device Name is required.');
      return;
    }
    if (!deviceForm.id.trim()) {
      setAddDeviceError('Device ID is required.');
      return;
    }
    if (!deviceForm.ipAddress.trim()) {
      setAddDeviceError('Target IP Address is required.');
      return;
    }

    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(deviceForm.ipAddress.trim())) {
      setAddDeviceError('Invalid IPv4 address format (e.g. 192.168.10.150).');
      return;
    }

    if (devices.some(d => d.id.toLowerCase() === deviceForm.id.trim().toLowerCase())) {
      setAddDeviceError(`A device with ID "${deviceForm.id.trim()}" already exists in the registry.`);
      return;
    }

    setDeviceSubmitting(true);
    try {
      const created = await registerDevice(deviceForm);
      setSelectedDeviceId(created.id);
      setSuccessMsg(`Medical asset "${created.name}" (${created.id} • ${created.ipAddress}) registered successfully and selected for vulnerability scanning.`);
      setIsAddDeviceOpen(false);
      // Reset with fresh random ID
      setDeviceForm(prev => ({
        ...prev,
        id: `DEV-NEW-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        ipAddress: ''
      }));
    } catch (err) {
      setAddDeviceError(err.message || 'Failed to register medical asset.');
    } finally {
      setDeviceSubmitting(false);
    }
  };

  const targetDevice = devices.find(d => d.id === selectedDeviceId) || devices[0] || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [fetchedScopes, fetchedAsms] = await Promise.all([
        api.getScopes().catch(() => []),
        api.getAssessments().catch(() => [])
      ]);
      setScopes(fetchedScopes || []);
      setAssessments(fetchedAsms || []);
      if (fetchedAsms && fetchedAsms.length > 0) {
        setSelectedAssessment(fetchedAsms[0]);
      }
      const active = (fetchedScopes || []).find(s => s.authorization_status === 'AUTHORIZED');
      if (active) {
        setActiveScopeId(active.id);
      }
    } catch (err) {
      setErrorMsg('Failed to fetch assessment scopes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScope = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const newScope = await api.authorizeScope({
        device_id: selectedDeviceId,
        target_ip: targetDevice.ipAddress,
        assessment_profile: selectedProfile,
        selected_tools: selectedTools,
        duration_hours: Number(durationHours),
        justification: justification
      });
      setSuccessMsg(`Scope certificate ${newScope.id} authorized.`);
      setActiveScopeId(newScope.id);
      setCurrentStep(7); // Advance to execution step
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Authorization failed. Check backend credentials.');
    }
  };

  const handleExecuteAssessment = async () => {
    if (!activeScopeId) {
      setErrorMsg('No authorized scope certificate selected.');
      return;
    }
    const currentScope = scopes.find(s => s.id === activeScopeId);
    if (!currentScope) {
      setErrorMsg('Selected scope is expired or unauthorized.');
      return;
    }

    setExecuting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await api.executeAssessment({
        scope_id: activeScopeId,
        device_id: currentScope.device_id,
        profile: currentScope.assessment_profile,
        tools: currentScope.selected_tools
      });
      setSelectedAssessment(result);
      setSuccessMsg(`Defensive assessment completed. Posture Score: ${result.security_score}/100.`);
      setCurrentStep(8); // Advance to results step
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Assessment execution failed.');
    } finally {
      setExecuting(false);
    }
  };

  const handleGenerateReport = async (format = 'PDF') => {
    if (!selectedAssessment) return;
    setReportGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const rep = await api.generateReport(selectedAssessment.id, format);
      setLastGeneratedReport(rep);
      setSuccessMsg(`Successfully generated ${format} report (${rep.id}) with SHA-256 seal.`);
    } catch (err) {
      setErrorMsg(err.message || `Failed to generate ${format} report.`);
    } finally {
      setReportGenerating(false);
    }
  };

  const handleCancelScan = async () => {
    if (!selectedAssessment?.id) {
      setExecuting(false);
      return;
    }
    try {
      await api.cancelAssessment(selectedAssessment.id);
      setSuccessMsg('Assessment scan cancelled.');
      setExecuting(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel scan.');
    }
  };

  const toggleTool = (tool) => {
    setSelectedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Assessment Operations Center</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              (Multi-Tool Defensive Scanner)
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs text-[#171717] font-medium transition-swiss flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Safety Scope Notice Banner */}
      <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#171717]">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>
            <strong>AUTHORIZED SECURITY ASSESSMENT ONLY:</strong> Tool adapters operate exclusively against authorized targets with server-side validation.
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#F59E0B] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 w-max font-semibold">
          DEFENSIVE ONLY — NON-DESTRUCTIVE
        </span>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* 2. 8-STEP PROGRESS BAR TRACKER */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 text-xs select-none font-mono">
          {[
            { num: 1, label: 'Select Target' },
            { num: 2, label: 'Verify Auth' },
            { num: 3, label: 'Scope Config' },
            { num: 4, label: 'Tool Adapters' },
            { num: 5, label: 'Review Plan' },
            { num: 6, label: 'Authorize' },
            { num: 7, label: 'Execute' },
            { num: 8, label: 'Results' },
          ].map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-swiss whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#1677FF] text-white font-semibold shadow-xs'
                    : isCompleted
                    ? 'text-emerald-700 bg-emerald-50 font-medium'
                    : 'text-[#9CA3AF] hover:text-[#171717]'
                }`}
              >
                <span>{step.num}.</span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STEP CONTENT WORKFLOW */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
        {/* Step 1: Select Target Device */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F3F4F6]">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] flex items-center gap-2">
                  <span>Step 1: Select Medical Asset for Assessment</span>
                  <span className="text-xs font-normal text-[#6B7280]">({devices.length} registered assets)</span>
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Choose an authorized medical asset or register a new one to immediately configure defensive scanning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDeviceOpen(true)}
                className="px-3.5 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Add Device to Scan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-swiss relative ${
                    selectedDeviceId === dev.id
                      ? 'border-[#1677FF] bg-[#E6F4FF]/35 shadow-xs ring-1 ring-[#1677FF]'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                    <span className="truncate pr-2">{dev.name}</span>
                    <StatusBadge status={dev.riskLevel} size="xs" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280] mt-1.5">
                    <span>{dev.id}</span>
                    <span className="bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#374151]">{dev.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] mt-1">
                    <span>{dev.department}</span>
                    <span className="font-mono text-[10px] text-[#6B7280]">{dev.networkSegment}</span>
                  </div>
                  {selectedDeviceId === dev.id && (
                    <div className="mt-2 pt-2 border-t border-[#1677FF]/20 flex items-center gap-1.5 text-[11px] text-[#1677FF] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active Target Selected</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Device to Scan Card */}
              <div
                onClick={() => setIsAddDeviceOpen(true)}
                className="p-4 rounded-lg border-2 border-dashed border-[#D1D5DB] hover:border-[#1677FF] bg-[#FAFAFA] hover:bg-[#E6F4FF]/20 cursor-pointer transition-swiss flex flex-col items-center justify-center text-center min-h-[110px] group select-none"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#D1D5DB] group-hover:border-[#1677FF] group-hover:bg-[#1677FF] flex items-center justify-center transition-swiss mb-1.5 shadow-2xs">
                  <Plus className="w-4 h-4 text-[#6B7280] group-hover:text-white transition-swiss" />
                </div>
                <span className="text-xs font-semibold text-[#171717] group-hover:text-[#1677FF] transition-swiss">
                  + Add Device to Scan
                </span>
                <span className="text-[11px] text-[#6B7280] mt-0.5">
                  Register new IoMT asset to scan
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F3F4F6]">
              <div className="text-xs text-[#6B7280] flex items-center gap-1.5">
                <span>Active Target:</span>
                <span className="font-semibold text-[#171717]">{targetDevice?.name || 'None'}</span>
                <span className="font-mono text-[11px] text-[#1677FF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {targetDevice?.ipAddress || '—'}
                </span>
                <span className="text-[#9CA3AF]">({targetDevice?.id})</span>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs self-end sm:self-auto"
              >
                <span>Next: Verify Authorization</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify Authorization */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 2: Server-Side Scope Authorization Status</h3>
            <p className="text-xs text-[#6B7280]">
              Checking pre-existing time-bounded authorization certificates for {targetDevice.name} ({targetDevice.ipAddress}).
            </p>
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Selected Target:</span>
                <span className="font-semibold text-[#171717]">{targetDevice.name} ({targetDevice.id})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Target IP:</span>
                <span className="font-mono text-[#171717]">{targetDevice.ipAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Active Scopes on Target:</span>
                <span className="font-mono text-[#1677FF] font-semibold">
                  {scopes.filter(s => s.device_id === targetDevice.id && s.authorization_status === 'AUTHORIZED').length} Active
                </span>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(1)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <span>Next: Configure Scope</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Scope & Profile */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 3: Assessment Profile & Duration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#6B7280] font-medium mb-1">Assessment Profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none"
                >
                  <option value="DEFENSIVE_AUDIT">DEFENSIVE_AUDIT (Safe TCP Connect, Service Banners & CVEs)</option>
                  <option value="PASSIVE_DISCOVERY">PASSIVE_DISCOVERY (Passive Fingerprinting & Boundary Analysis)</option>
                  <option value="COMPLIANCE_SCAN">COMPLIANCE_SCAN (Healthcare Baseline & Regulatory Controls)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#6B7280] font-medium mb-1">Duration Window (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#6B7280] font-medium mb-1 text-xs">Audit Justification</label>
              <input
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-xs text-[#171717] focus:outline-none"
              />
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(2)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <span>Next: Select Tool Adapters</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Tools */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 4: Select Available Tool Adapters</h3>
            <p className="text-xs text-[#6B7280]">
              Adapters employ non-destructive flags (`-sT`, templates only). Synthetic fallback activates if binaries are not in system PATH.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { id: 'nmap', name: 'Nmap Adapter', desc: 'Safe TCP Connect (-sT), service version banner probe' },
                { id: 'nuclei', name: 'Nuclei Adapter', desc: 'IoMT medical template CVE vulnerability detection' },
                { id: 'zap', name: 'OWASP ZAP Adapter', desc: 'Passive REST/HL7 clinical API web service audit' },
                { id: 'nikto', name: 'Nikto Adapter', desc: 'Embedded medical web server header inspection' },
                { id: 'openvas', name: 'OpenVAS Adapter', desc: 'Authenticated clinical vulnerability baseline review' }
              ].map((tool) => (
                <label
                  key={tool.id}
                  className={`p-3 rounded border flex items-start gap-3 cursor-pointer transition-swiss ${
                    selectedTools.includes(tool.id) ? 'border-[#1677FF] bg-[#E6F4FF]/20' : 'border-[#E5E7EB]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    className="mt-0.5 rounded text-[#1677FF] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-[#171717] block">{tool.name}</span>
                    <span className="text-[11px] text-[#6B7280] block mt-0.5">{tool.desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(3)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              <button
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <span>Next: Review Configuration</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review Configuration */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 5: Review Assessment Configuration</h3>
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#6B7280] block">Target Device</span>
                  <span className="font-semibold text-[#171717]">{targetDevice.name} ({targetDevice.id})</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Target IP Endpoint</span>
                  <span className="font-mono text-[#171717]">{targetDevice.ipAddress}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Selected Profile</span>
                  <span className="font-mono text-[#171717]">{selectedProfile}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Valid Duration</span>
                  <span className="font-mono text-[#171717]">{durationHours} Hours</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#6B7280] block">Active Tools</span>
                <span className="font-mono text-[#1677FF] font-semibold">{selectedTools.join(', ').toUpperCase()}</span>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(4)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <span>Next: Confirm & Authorize</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Confirm & Authorize Scope */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 6: Authorize Assessment Scope</h3>
            <p className="text-xs text-[#6B7280]">
              Authorizing generates a cryptographically signed scope token stored on the server.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
              Operator <strong>{currentUser.name}</strong> ({currentUser.role}) is issuing an authorized assessment certificate for target <strong>{targetDevice.ipAddress}</strong>.
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(5)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              <button
                onClick={handleCreateScope}
                className="px-5 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-semibold flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Issue Scope Certificate</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 7: View Progress / Execute */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Step 7: Launch Tool Orchestrator</h3>
            <p className="text-xs text-[#6B7280]">
              Certificate <strong>{activeScopeId}</strong> is validated. Ready to trigger multi-tool orchestrator.
            </p>
            <div className="p-6 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-center space-y-3">
              {executing ? (
                <div className="py-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#1677FF] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#171717]">Executing Security Tool Adapters...</p>
                  <p className="text-[11px] text-[#6B7280] font-mono">Running Nmap (-sT) &bull; Nuclei Templates &bull; Normalizing Findings</p>
                  <button
                    onClick={handleCancelScan}
                    className="mt-2 px-3.5 py-1.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-swiss"
                  >
                    Cancel Scan
                  </button>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  <ShieldCheck className="w-10 h-10 text-[#10B981] mx-auto" />
                  <p className="text-xs font-semibold text-[#171717]">Scope Validated &bull; Ready for Execution</p>
                  <button
                    onClick={handleExecuteAssessment}
                    className="px-6 py-2.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-bold transition-swiss shadow-xs inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Defensive Assessment</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCurrentStep(6)} className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs">Back</button>
              {selectedAssessment && (
                <button onClick={() => setCurrentStep(8)} className="text-xs text-[#1677FF] font-medium">Skip to Results &rarr;</button>
              )}
            </div>
          </div>
        )}

        {/* Step 8: Review Results & Generate Certified Reports */}
        {currentStep === 8 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">Step 8: Assessment Findings & Risk Score</h3>
                <p className="text-xs text-[#6B7280]">
                  Target: {selectedAssessment?.device_id || targetDevice.id} &bull; Score: {selectedAssessment?.security_score ?? 85}/100
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#171717]"
                >
                  New Assessment
                </button>
              </div>
            </div>

            {/* Certified Report Generation Bar */}
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">Generate Certified Audit Report</h4>
                  <p className="text-[11px] text-[#6B7280]">Export report with SHA-256 seal, executive summary, and remediation guidance in PDF or HTML.</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setReportModalOpen(true)}
                    disabled={executing || !selectedAssessment}
                    className="px-3.5 py-1.5 rounded bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold flex items-center gap-1.5 transition-swiss disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Generate & Download Report</span>
                  </button>
                </div>
              </div>

              {lastGeneratedReport && (
                <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between text-xs bg-emerald-50/50 p-2.5 rounded border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="font-medium text-emerald-900">
                      Report {lastGeneratedReport.id} ({lastGeneratedReport.report_type}) Ready
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700">
                      SHA-256: {lastGeneratedReport.sha256_hash?.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => api.downloadReportFile(lastGeneratedReport.id)}
                      className="px-2.5 py-1 rounded bg-white text-[#171717] border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-[#1677FF]" /> Download
                    </button>
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="text-xs text-[#1677FF] hover:underline font-medium cursor-pointer"
                    >
                      Report Options &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Findings Table */}
            {selectedAssessment?.findings && selectedAssessment.findings.length > 0 ? (
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-medium uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Title / Finding</th>
                      <th className="py-2.5 px-3">CVE Reference</th>
                      <th className="py-2.5 px-3">Tool</th>
                      <th className="py-2.5 px-3">Remediation Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {selectedAssessment.findings.map((f, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3"><StatusBadge status={f.severity} size="xs" /></td>
                        <td className="py-2.5 px-3 font-semibold text-[#171717]">{f.title}</td>
                        <td className="py-2.5 px-3 font-mono text-[#1677FF]">{f.cve_id || 'N/A'}</td>
                        <td className="py-2.5 px-3 font-mono text-[#6B7280] uppercase">{f.source_tool}</td>
                        <td className="py-2.5 px-3 text-[#6B7280] leading-relaxed">{f.remediation_guidance || f.remediation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-xs text-[#6B7280]">
                Zero critical vulnerabilities identified during this assessment profile run.
              </div>
            )}

            {/* Guided Workflow Next Steps */}
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-[#6B7280]">
                High &amp; Critical findings have been automatically emitted into the Security Events pipeline.
              </span>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#171717] font-medium flex items-center gap-1.5 transition-swiss cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span>Download Scan Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage('security-events')}
                  className="px-3 py-1.5 rounded bg-[#1677FF] text-white hover:bg-[#0958D9] font-medium flex items-center gap-1.5 transition-swiss"
                >
                  <span>Review Security Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. ADD MEDICAL ASSET MODAL */}
      <Modal
        isOpen={isAddDeviceOpen}
        onClose={() => !deviceSubmitting && setIsAddDeviceOpen(false)}
        title="Register Medical Asset for Assessment"
        subtitle="Enrolls IoMT asset into MediShield scope registry for defensive scanning"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              disabled={deviceSubmitting}
              onClick={() => setIsAddDeviceOpen(false)}
              className="px-3.5 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-medium text-[#171717] transition-swiss"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deviceSubmitting}
              onClick={handleCreateDevice}
              className="px-4 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium transition-swiss flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {deviceSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Asset...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register &amp; Select for Scan</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Quick Presets Bar */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Quick Medical Asset Presets (Click to autofill)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_DEVICES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#E6F4FF]/30 text-left text-xs transition-swiss bg-white"
                >
                  <p className="font-medium text-[#171717] truncate">{preset.label}</p>
                  <p className="text-[10px] font-mono text-[#6B7280] truncate">{preset.ipAddress}</p>
                </button>
              ))}
            </div>
          </div>

          {addDeviceError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addDeviceError}</span>
            </div>
          )}

          <form onSubmit={handleCreateDevice} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Device Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Digital X-Ray System"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Asset Identifier (ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEV-XRAY-401"
                  value={deviceForm.id}
                  onChange={(e) => setDeviceForm({ ...deviceForm, id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Target IP Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.30.125"
                  value={deviceForm.ipAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Device Type
                </label>
                <select
                  value={deviceForm.deviceType}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                >
                  <option value="Radiology Imaging">Radiology Imaging</option>
                  <option value="Dialysis Machine">Dialysis Machine</option>
                  <option value="Surgical Equipment">Surgical Equipment</option>
                  <option value="Infusion Pump">Infusion Pump</option>
                  <option value="Ventilator">Ventilator</option>
                  <option value="Patient Monitor">Patient Monitor</option>
                  <option value="Diagnostic Station">Diagnostic Station</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Network Segment / VLAN
                </label>
                <select
                  value={deviceForm.networkSegment}
                  onChange={(e) => setDeviceForm({ ...deviceForm, networkSegment: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                >
                  <option value="ICU_VLAN_10">ICU_VLAN_10 (192.168.10.0/24)</option>
                  <option value="OR_VLAN_20">OR_VLAN_20 (192.168.20.0/24)</option>
                  <option value="RADIOLOGY_VLAN_30">RADIOLOGY_VLAN_30 (192.168.30.0/24)</option>
                  <option value="TELEMETRY_VLAN_40">TELEMETRY_VLAN_40 (192.168.40.0/24)</option>
                  <option value="ISOLATION_VLAN_99">ISOLATION_VLAN_99 (Quarantined)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Hospital Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Radiology, ICU, OR"
                  value={deviceForm.department}
                  onChange={(e) => setDeviceForm({ ...deviceForm, department: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Siemens Healthineers"
                  value={deviceForm.manufacturer}
                  onChange={(e) => setDeviceForm({ ...deviceForm, manufacturer: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. MobileArt Evolution"
                  value={deviceForm.model}
                  onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Physical Location / Room
                </label>
                <input
                  type="text"
                  placeholder="e.g. Imaging Suite B"
                  value={deviceForm.location}
                  onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Initial Risk Level
                </label>
                <select
                  value={deviceForm.riskLevel}
                  onChange={(e) => setDeviceForm({ ...deviceForm, riskLevel: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 00:1A:2B:66:77:88"
                  value={deviceForm.macAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, macAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Firmware Version
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3.4.1"
                  value={deviceForm.firmwareVersion}
                  onChange={(e) => setDeviceForm({ ...deviceForm, firmwareVersion: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#1677FF] focus:bg-white text-[#171717]"
                />
              </div>
            </div>
          </form>

          {/* Scope security notice */}
          <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] text-[#6B7280] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#1677FF] shrink-0 mt-0.5" />
            <span>
              Once registered, this asset is immediately enrolled into the scope registry and auto-selected for Step 2 (Authorization) and Step 7 (Execution).
            </span>
          </div>
        </div>
      </Modal>

      {/* Certified Report Download Modal */}
      <ReportDownloadModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        assessmentId={selectedAssessment?.id}
        deviceId={selectedAssessment?.device_id || targetDevice?.id}
        targetIp={selectedAssessment?.target_ip || targetDevice?.ipAddress}
        securityScore={selectedAssessment?.security_score}
        onViewInReports={() => setCurrentPage('reports')}
      />
    </div>
  );
}
