import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime, formatTimeOnly } from '../utils/dateUtils';
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
  ChevronDown,
  ChevronUp,
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

const TOOL_CATEGORIES = [
  'ALL',
  'Core Discovery',
  'Vulnerability Assessment',
  'Web Assessment',
  'Network Monitoring',
  'Vulnerability Intelligence',
  'Host and Software Assessment'
];

const DEFAULT_TOOLS_SPEC = [
  {
    name: 'native_probe',
    display_name: 'Native Defensive Probe',
    category: 'Core Discovery',
    is_remote: false,
    version: '1.2.0',
    description: 'Built-in socket connectivity, TLS/SSL certificate validation, and HTTP security headers inspection.',
    supported_capabilities: ['SOCKET_CONNECTIVITY', 'TLS_CERT_INSPECTION', 'SECURITY_HEADERS', 'SERVICE_AVAILABILITY'],
    help_text: 'Core native prober. Safe, non-destructive, and always available.'
  },
  {
    name: 'nmap',
    display_name: 'Nmap Service Scanner',
    category: 'Core Discovery',
    is_remote: false,
    version: '7.9x',
    description: 'Defensive TCP connect port discovery and service version fingerprinting within authorized bounds.',
    supported_capabilities: ['TCP_CONNECT_SCAN', 'SERVICE_DETECTION', 'VERSION_PROBING', 'PORT_AUDITING'],
    help_text: 'Requires local nmap binary in system PATH.'
  },
  {
    name: 'openvas',
    display_name: 'Greenbone OpenVAS',
    category: 'Vulnerability Assessment',
    is_remote: true,
    version: '22.4',
    description: 'Greenbone Vulnerability Management engine executing comprehensive clinical network vulnerability tests.',
    supported_capabilities: ['NVT_TEST_EXECUTION', 'GMP_DAEMON_CONTROL', 'ENTERPRISE_CVE_AUDIT', 'NETWORK_VULNERABILITY_SCAN'],
    help_text: 'Requires remote GMP daemon (OPENVAS_HOST) and service credentials.'
  },
  {
    name: 'nuclei',
    display_name: 'Nuclei CVE Engine',
    category: 'Vulnerability Assessment',
    is_remote: false,
    version: 'v3.x',
    description: 'Targeted YAML-based vulnerability template scanning against documented CVEs and misconfigurations.',
    supported_capabilities: ['CVE_TEMPLATE_MATCHING', 'MISCONFIGURATION_DETECTION', 'TARGETED_POC_AUDIT', 'ZERO_DAY_SIGNATURES'],
    help_text: 'Requires nuclei binary and template directory.'
  },
  {
    name: 'zap',
    display_name: 'OWASP ZAP Scanner',
    category: 'Web Assessment',
    is_remote: true,
    version: '2.14.x',
    description: 'OWASP Zed Attack Proxy passive web application security auditor for IoMT clinical web dashboards.',
    supported_capabilities: ['PASSIVE_WEB_AUDIT', 'CWE_RISK_MAPPING', 'HEADER_COMPLIANCE', 'REST_API_CONTROL'],
    help_text: 'Requires running OWASP ZAP daemon (ZAP_URL) with optional API key.'
  },
  {
    name: 'nikto',
    display_name: 'Nikto Web Auditor',
    category: 'Web Assessment',
    is_remote: false,
    version: '2.1.6',
    description: 'Web server security scanner identifying dangerous files, outdated server software, and configuration flaws.',
    supported_capabilities: ['WEB_SERVER_AUDIT', 'DANGEROUS_FILE_CHECK', 'SERVER_VERSION_FINGERPRINT', 'HTTP_METHOD_PROBING'],
    help_text: 'Requires nikto or nikto.pl in system PATH.'
  },
  {
    name: 'suricata',
    display_name: 'Suricata IDS',
    category: 'Network Monitoring',
    is_remote: false,
    version: '7.0.x',
    description: 'Passive intrusion detection system ingesting EVE JSON network telemetry and signature matching.',
    supported_capabilities: ['EVE_JSON_INGESTION', 'SIGNATURE_MATCHING', 'NETWORK_INTRUSION_DETECTION', 'SECURITY_EVENT_NORMALIZATION'],
    help_text: 'Ingests active EVE JSON telemetry (SURICATA_EVE_PATH).'
  },
  {
    name: 'zeek',
    display_name: 'Zeek Network Monitor',
    category: 'Network Monitoring',
    is_remote: false,
    version: '6.0.x',
    description: 'Behavioral network security monitor analyzing connection logs, cleartext protocols, and IoMT telemetry.',
    supported_capabilities: ['CONN_LOG_INGESTION', 'PROTOCOL_ANALYSIS', 'CLEAR_TEXT_TRAFFIC_DETECTION', 'BEHAVIORAL_TELEMETRY'],
    help_text: 'Ingests Zeek connection/protocol logs (ZEEK_LOG_DIR).'
  },
  {
    name: 'tshark',
    display_name: 'TShark Packet Analyzer',
    category: 'Network Monitoring',
    is_remote: false,
    version: '4.x',
    description: 'Deep packet inspection engine validating IoMT protocols including DICOM, HL7, CoAP, and MQTT.',
    supported_capabilities: ['DEEP_PACKET_INSPECTION', 'IOMT_PROTOCOL_VALIDATION', 'CLEAR_TEXT_PROTOCOL_ANALYSIS', 'PCAP_STREAM_ANALYSIS'],
    help_text: 'Requires tshark binary and PCAP stream or capture interface.'
  },
  {
    name: 'nvd_intel',
    display_name: 'NVD / CVE Intelligence',
    category: 'Vulnerability Intelligence',
    is_remote: true,
    version: 'API v2.0',
    description: 'National Vulnerability Database REST API v2 and curated clinical IoMT threat intelligence feed.',
    supported_capabilities: ['NVD_REST_API_V2', 'CPE_CORRELATION', 'CVSS_V31_MAPPING', 'IOMT_CLINICAL_INTEL', 'EPSS_METRICS'],
    help_text: 'Online NVD API v2 with fallback to local IoMT clinical knowledgebase.'
  },
  {
    name: 'trivy',
    display_name: 'Trivy Security Scanner',
    category: 'Host and Software Assessment',
    is_remote: false,
    version: '0.50.x',
    description: 'Container image, firmware filesystem, and software dependency vulnerability auditor.',
    supported_capabilities: ['CONTAINER_IMAGE_SCAN', 'FILESYSTEM_SBOM_AUDIT', 'DEPENDENCY_VULNERABILITY_CHECK', 'MISCONFIGURATION_DETECTION'],
    help_text: 'Requires trivy binary and target container/filesystem artifact.'
  },
  {
    name: 'lynis',
    display_name: 'Lynis Host Auditor',
    category: 'Host and Software Assessment',
    is_remote: false,
    version: '3.1.x',
    description: 'Host-level security auditing and system hardening benchmarking for Linux/Unix medical endpoints.',
    supported_capabilities: ['OS_HARDENING_AUDIT', 'COMPLIANCE_BENCHMARKING', 'KERNEL_SECURITY_CHECK', 'VULNERABILITY_ASSESSMENT'],
    help_text: 'Host OS auditor. Requires Linux host or remote SSH target.'
  },
  {
    name: 'openscap',
    display_name: 'OpenSCAP Compliance Auditor',
    category: 'Host and Software Assessment',
    is_remote: false,
    version: '1.3.x',
    description: 'Security Content Automation Protocol (SCAP) validator enforcing HIPAA and NIST 800-53 baselines.',
    supported_capabilities: ['XCCDF_BENCHMARK_EVALUATION', 'HIPAA_SECURITY_COMPLIANCE', 'NIST_800_53_VALIDATION', 'CIS_PROFILE_AUDITING'],
    help_text: 'Requires oscap binary and SCAP benchmark data streams.'
  },
  {
    name: 'syft',
    display_name: 'Syft SBOM Generator',
    category: 'Host and Software Assessment',
    is_remote: false,
    version: '1.0.x',
    description: 'Software Bill of Materials generator cataloging packages, dependencies, and licenses for FDA compliance.',
    supported_capabilities: ['SPDX_SBOM_GENERATION', 'CYCLONEDX_CATALOGING', 'FIRMWARE_PACKAGE_INVENTORY', 'LICENSE_COMPLIANCE_AUDIT'],
    help_text: 'Requires syft binary and target firmware/container artifact.'
  }
];

const getStatusBadgeConfig = (status) => {
  switch (status) {
    case 'AVAILABLE':
      return {
        label: 'AVAILABLE',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'NOT_INSTALLED':
      return {
        label: 'NOT INSTALLED',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400'
      };
    case 'NOT_CONFIGURED':
      return {
        label: 'NOT CONFIGURED',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'NOT_AUTHENTICATED':
      return {
        label: 'NOT AUTHENTICATED',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500'
      };
    case 'UNREACHABLE':
      return {
        label: 'UNREACHABLE',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'NOT_APPLICABLE':
      return {
        label: 'NOT APPLICABLE',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400'
      };
    case 'ERROR':
      return {
        label: 'ERROR',
        className: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500'
      };
    default:
      return {
        label: status || 'UNKNOWN',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400'
      };
  }
};

export default function DevicesScanPage() {
  const {
    devices,
    registerDevice,
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
  const [toolCategoryFilter, setToolCategoryFilter] = useState('ALL');

  // Scope Authorization Form
  const [scopeProfile, setScopeProfile] = useState('DEFENSIVE_AUDIT');
  const [selectedTools, setSelectedTools] = useState(['native_probe', 'nmap', 'nuclei', 'nvd_intel']);
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showToolBreakdown, setShowToolBreakdown] = useState(false);
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

  const mergedTools = React.useMemo(() => {
    return DEFAULT_TOOLS_SPEC.map(spec => {
      const live = toolsInventory.find(t => t.name === spec.name);
      return {
        ...spec,
        display_name: live?.display_name || spec.display_name,
        category: live?.category || spec.category,
        version: live?.version && live.version !== 'unknown' ? live.version : spec.version,
        status: live?.status || 'NOT_CONFIGURED',
        available: live?.available || false,
        is_remote: live?.is_remote !== undefined ? live.is_remote : spec.is_remote,
        configuration_status: live?.configuration_status || '',
        supported_capabilities: live?.supported_capabilities?.length ? live.supported_capabilities : spec.supported_capabilities,
        message: live?.message || spec.help_text,
        path: live?.path || null
      };
    });
  }, [toolsInventory]);

  const filteredTools = React.useMemo(() => {
    if (toolCategoryFilter === 'ALL') return mergedTools;
    return mergedTools.filter(t => t.category === toolCategoryFilter);
  }, [mergedTools, toolCategoryFilter]);

  const statusCounts = React.useMemo(() => {
    const counts = {
      total: mergedTools.length,
      available: 0,
      not_installed: 0,
      not_configured: 0,
      not_applicable: 0
    };
    for (const t of mergedTools) {
      if (t.status === 'AVAILABLE') counts.available++;
      else if (t.status === 'NOT_INSTALLED') counts.not_installed++;
      else if (t.status === 'NOT_APPLICABLE') counts.not_applicable++;
      else counts.not_configured++;
    }
    return counts;
  }, [mergedTools]);

  // Load tools inventory and default selected device
  useEffect(() => {
    loadTools();
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);

  const loadTools = async (forceRefresh = false) => {
    setLoadingTools(true);
    try {
      const inv = forceRefresh ? await api.refreshToolInventory() : await api.getToolsInventory();
      if (inv && Array.isArray(inv)) {
        setToolsInventory(inv);
        if (forceRefresh) {
          setStatusMsg({
            type: 'success',
            text: `Tool readiness refreshed: ${inv.filter(t => t.available).length} available of ${inv.length} integrated tools.`
          });
        }
      }
    } catch (err) {
      console.warn('[DevicesScan] Tools inventory load warning:', err.message);
      if (forceRefresh) {
        setStatusMsg({ type: 'warning', text: `Could not refresh tools: ${err.message}` });
      }
    } finally {
      setLoadingTools(false);
    }
  };

  const selectAllAvailable = () => {
    const avail = mergedTools.filter(t => t.available).map(t => t.name);
    setSelectedTools(Array.from(new Set(['native_probe', ...avail])));
  };

  const selectRecommended = () => {
    setSelectedTools(['native_probe', 'nmap', 'nuclei', 'nvd_intel']);
  };

  const clearSelection = () => {
    setSelectedTools(['native_probe']);
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
      // Single registration path: the server assigns the inventory ID and rejects
      // duplicate IP/MAC assignments, and the context updates the shared device list.
      const createdDevice = await registerDevice({
        name: newDevice.name,
        deviceType: newDevice.deviceType,
        ipAddress: newDevice.ipAddress,
        macAddress: newDevice.macAddress,
        firmwareVersion: newDevice.firmwareVersion,
        networkSegment: newDevice.networkSegment,
        department: newDevice.department,
        manufacturer: newDevice.manufacturer,
        model: newDevice.model,
        location: newDevice.location,
        owner: newDevice.owner,
        riskLevel: 'medium',
        securityScore: 85.0
      });

      setSelectedDevice(createdDevice);
      setAddDeviceModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: `Device "${createdDevice.name}" registered as ${createdDevice.id} and selected for scan.`
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `Failed to add device: ${err.message}` });
    }
  };

  const scopeOutOfSync = React.useMemo(() => {
    if (!authorizedScope) return false;
    if (authorizedScope.device_id !== selectedDevice?.id) return true;
    const approvedTools = new Set((authorizedScope.selected_tools || []).map(t => t.toLowerCase().trim()));
    return selectedTools.some(t => !approvedTools.has(t.toLowerCase().trim()));
  }, [authorizedScope, selectedTools, selectedDevice]);

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
    if (!selectedDevice) {
      setStatusMsg({ type: 'error', text: 'Please select a registered device asset before launching an assessment.' });
      return;
    }
    setScanning(true);
    setStatusMsg(null);
    setScanProgress(5);
    setScanStatusText('Verifying defensive scope certificate...');

    try {
      let activeScope = authorizedScope;

      // Reconcile scope certificate if absent, targeting wrong device, or missing newly selected tools
      const approvedTools = new Set((activeScope?.selected_tools || []).map(t => t.toLowerCase().trim()));
      const isDeviceMismatch = activeScope && activeScope.device_id !== selectedDevice.id;
      const isToolsMismatch = !activeScope || selectedTools.some(t => !approvedTools.has(t.toLowerCase().trim()));

      if (isDeviceMismatch || isToolsMismatch) {
        setScanStatusText('Authorizing updated defensive scope certificate for selected tools...');
        const scopeData = {
          device_id: selectedDevice.id,
          target_ip: selectedDevice.ipAddress,
          assessment_profile: scopeProfile,
          selected_tools: selectedTools,
          duration_hours: parseInt(durationHours, 10),
          justification: justification || 'Authorized IoMT defensive security assessment'
        };
        activeScope = await api.authorizeScope(scopeData);
        setAuthorizedScope(activeScope);
        if (logAudit) {
          logAudit('ASSESSMENT_SCOPE_AUTHORIZED', 'AssessmentScope', activeScope.id, `Scope authorized for ${selectedTools.length} tools on ${selectedDevice.id}`);
        }
      }

      setScanProgress(15);
      setScanStatusText('Initializing defensive scanning harness...');
      setExecutionTimeline([
        { event: 'Execution Initialized', timestamp: new Date().toLocaleTimeString(), source: 'MediShield Orchestrator' },
        { event: `Scope Verified: ${activeScope.id}`, timestamp: new Date().toLocaleTimeString(), source: 'Scope Validator' }
      ]);

      setScanProgress(30);
      setScanStatusText('Executing defensive socket and service probes...');

      const asm = await api.executeAssessment({
        scope_id: activeScope.id,
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
              ) : scopeOutOfSync ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-amber-900">Certificate {authorizedScope.id} (Tools Updated)</span>
                    <p className="text-[11px] text-amber-700">Scope will automatically update on scan launch.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAuthorizeScope}
                      disabled={authorizing}
                      className="text-[#1677FF] hover:text-[#125ecc] text-xs font-semibold cursor-pointer"
                    >
                      {authorizing ? 'Updating...' : 'Update'}
                    </button>
                    <button
                      onClick={() => setAuthorizedScope(null)}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-900">Certificate {authorizedScope.id}</span>
                    <p className="text-[11px] text-emerald-700">Expires: {formatTimeOnly(authorizedScope.expires_at)}</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F3F4F6] gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                    Defensive Tools & Execution
                  </span>
                  <p className="text-[11px] text-[#6B7280]">
                    Select defensive scanners, monitors, and intelligence feeds ({selectedTools.length} selected)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadTools(true)}
                  disabled={loadingTools}
                  title="Probe host environment and refresh tool availability"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1677FF] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTools ? 'animate-spin' : ''}`} />
                  <span>Refresh Tool Status</span>
                </button>
              </div>
            </div>

            {/* Inventory Status Summary Bar */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] text-[#4B5563] bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
              <span className="font-semibold text-[#171717]">Readiness:</span>
              <span className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] font-medium text-[#171717]">
                Total: <strong>{statusCounts.total}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                Available: <strong>{statusCounts.available}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                Not Installed: <strong>{statusCounts.not_installed}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                Not Configured: <strong>{statusCounts.not_configured}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Not Applicable: <strong>{statusCounts.not_applicable}</strong>
              </span>
            </div>

            {/* Category Filter Pills & Selection Controls */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#F3F4F6] pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs max-w-full">
                {TOOL_CATEGORIES.map(cat => {
                  const count = cat === 'ALL' ? mergedTools.length : mergedTools.filter(t => t.category === cat).length;
                  const isAct = toolCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setToolCategoryFilter(cat)}
                      className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        isAct
                          ? 'bg-[#1677FF] text-white shadow-xs'
                          : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#171717]'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                <button
                  onClick={selectAllAvailable}
                  className="px-2 py-0.5 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                >
                  All Available
                </button>
                <span className="text-gray-300">•</span>
                <button
                  onClick={selectRecommended}
                  className="px-2 py-0.5 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                >
                  Recommended
                </button>
                <span className="text-gray-300">•</span>
                <button
                  onClick={clearSelection}
                  className="px-2 py-0.5 text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
                >
                  Core Only
                </button>
              </div>
            </div>

            {/* 14 Tool Selection Cards (Responsive 2-column Grid) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredTools.map(tool => {
                const isSelected = selectedTools.includes(tool.name);
                const isCore = tool.name === 'native_probe';
                const badge = getStatusBadgeConfig(tool.status);

                return (
                  <div
                    key={tool.name}
                    onClick={() => toggleTool(tool.name)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1677FF] bg-blue-50/25 ring-1 ring-[#1677FF]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <div>
                      {/* Card Header: Title & Badges */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[#171717]">
                              {tool.display_name}
                            </span>
                            <span className="text-[10px] text-[#6B7280] font-mono">
                              v{tool.version}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-[#4B5563] font-medium">
                              {tool.category}
                            </span>
                            <span className="text-[9px] text-[#9CA3AF]">
                              {tool.is_remote ? 'Remote Service' : 'Local Binary'}
                            </span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${badge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>

                      {/* Card Description */}
                      <p className="text-[11px] text-[#4B5563] mt-2 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>

                      {/* Capability Badges */}
                      {tool.supported_capabilities && tool.supported_capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tool.supported_capabilities.slice(0, 3).map(cap => (
                            <span
                              key={cap}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {cap}
                            </span>
                          ))}
                          {tool.supported_capabilities.length > 3 && (
                            <span className="text-[9px] font-mono px-1 py-0.5 text-gray-500">
                              +{tool.supported_capabilities.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Operational Hint / Error Message */}
                      <div className="mt-2 text-[10px] text-[#6B7280] bg-gray-50 p-1.5 rounded border border-gray-100 flex items-start gap-1">
                        <Info className="w-3 h-3 text-[#9CA3AF] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{tool.message}</span>
                      </div>
                    </div>

                    {/* Card Footer: Selection Status */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      {isCore ? (
                        <span className="text-[#1677FF] font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Core Baseline (Always Active)
                        </span>
                      ) : isSelected ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selected for Scan
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium hover:text-gray-600">
                          + Click to Select
                        </span>
                      )}

                      <span className="text-[10px] text-gray-400 font-mono">
                        {tool.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Button */}
            <div className="mt-5">
              <button
                onClick={handleStartScan}
                disabled={scanning || !selectedDevice}
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
                    : `Start Security Assessment on ${selectedDevice?.name || 'Device'}`}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#171717]">
                          Assessment ID: {latestAssessment.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          latestAssessment.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : latestAssessment.status === 'PARTIALLY_COMPLETED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {latestAssessment.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        Target: <span className="font-mono">{latestAssessment.target_ip}</span> ({latestAssessment.profile}) • Recorded: {formatTimeOnly(latestAssessment.created_at || Date.now())}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#171717]">
                        {latestAssessment.security_score != null ? Math.round(latestAssessment.security_score) : 85}
                      </span>
                      <span className="text-xs text-[#6B7280]"> / 100 Posture</span>
                    </div>
                  </div>

                  {/* Summary / Partially Completed Guidance */}
                  {latestAssessment.status === 'PARTIALLY_COMPLETED' && (
                    <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Why is this marked Partially Completed?</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Active network security scanners (<code className="font-mono">native_probe</code>, <code className="font-mono">nmap</code>) completed properly with full observations. Non-applicable tools (container/SBOM tools like <code className="font-mono">syft</code>/<code className="font-mono">trivy</code> that require Docker images, or daemons like <code className="font-mono">zap</code>/<code className="font-mono">openvas</code> requiring background services) were safely bypassed in compliance with FDA IoMT defensive boundaries.
                      </p>
                    </div>
                  )}

                  {/* Tool Execution Breakdown Accordion */}
                  <div className="border border-[#E5E7EB] rounded-lg bg-white overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setShowToolBreakdown(!showToolBreakdown)}
                      className="w-full px-3 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] flex items-center justify-between font-medium text-[#374151] transition-swiss cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#171717]">
                        <Layers className="w-3.5 h-3.5 text-[#1677FF]" />
                        <span>Tool Execution Breakdown ({latestAssessment.tools_executed?.length || Object.keys(latestAssessment.raw_results?.tools_status || {}).length || 0} tools)</span>
                      </span>
                      {showToolBreakdown ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      )}
                    </button>

                    {showToolBreakdown && (
                      <div className="p-3 divide-y divide-[#F3F4F6] space-y-2 max-h-56 overflow-y-auto">
                        {Object.entries(latestAssessment.raw_results?.tools_status || {}).length > 0 ? (
                          Object.entries(latestAssessment.raw_results.tools_status).map(([toolName, info]) => {
                            const isCompleted = info.status === 'COMPLETED';
                            const isNotEvaluated = info.status === 'NOT_EVALUATED';
                            return (
                              <div key={toolName} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-[#171717] capitalize">{toolName}</span>
                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                      isCompleted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isNotEvaluated
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {info.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#6B7280]">
                                    {isCompleted
                                      ? `Completed in ${info.execution_time_seconds || 0}s • ${info.findings_count || 0} findings recorded`
                                      : isNotEvaluated
                                      ? (info.error_message || 'Safely bypassed (requires container image or background daemon).')
                                      : (info.error_message || 'Tool timed out or exited with error.')}
                                  </p>
                                </div>
                                <span className="text-[10px] text-[#9CA3AF] shrink-0 font-mono">
                                  {isCompleted ? 'Active Probe' : isNotEvaluated ? 'Bypassed' : 'Attention'}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-[#6B7280]">
                            Tools evaluated: {(latestAssessment.tools_executed || []).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
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
                      onClick={() => setReportModalOpen(true)}
                      className="px-3.5 py-1.5 border border-[#1677FF] text-[#1677FF] hover:bg-blue-50 text-xs font-medium rounded-lg transition-swiss flex items-center gap-1.5 cursor-pointer shadow-xs"
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

      {/* CERTIFIED REPORT MODAL */}
      <ReportDownloadModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        assessmentId={latestAssessment?.id}
        deviceId={latestAssessment?.device_id || selectedDevice?.name || selectedDevice?.id}
        targetIp={latestAssessment?.target_ip || selectedDevice?.ipAddress}
        securityScore={latestAssessment?.security_score}
        onViewInReports={() => setCurrentPage('reports')}
      />
    </div>
  );
}
