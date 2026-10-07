import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Server,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Shield,
  Activity,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  X,
  Building2,
  Cpu,
  CheckCircle2,
  HelpCircle,
  Clock
} from 'lucide-react';

export default function DeviceInventoryPage() {
  const { devices, setSelectedDeviceId, setCurrentPage, currentUser, logAudit } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [assessmentFilter, setAssessmentFilter] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 8;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('Infusion Pump');
  const [newDeviceManufacturer, setNewDeviceManufacturer] = useState('Baxter International');
  const [newDeviceModel, setNewDeviceModel] = useState('Spectrum V8');
  const [newDeviceDepartment, setNewDeviceDepartment] = useState('Intensive Care Unit');
  const [newDeviceSegment, setNewDeviceSegment] = useState('ICU_VLAN_10');

  // Filtered & sorted list
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        dev.name?.toLowerCase().includes(q) ||
        dev.id?.toLowerCase().includes(q) ||
        dev.ipAddress?.includes(q) ||
        dev.deviceType?.toLowerCase().includes(q) ||
        (dev.manufacturer && dev.manufacturer.toLowerCase().includes(q)) ||
        (dev.model && dev.model.toLowerCase().includes(q)) ||
        (dev.department && dev.department.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || dev.status?.toUpperCase() === statusFilter;
      const matchRisk = riskFilter === 'ALL' || dev.riskLevel?.toUpperCase() === riskFilter;
      const matchSegment = segmentFilter === 'ALL' || dev.networkSegment === segmentFilter;
      const matchDepartment = departmentFilter === 'ALL' || dev.department === departmentFilter;
      const matchAssessment = assessmentFilter === 'ALL' || (dev.assessmentStatus || 'NOT_ASSESSED') === assessmentFilter;

      return matchSearch && matchStatus && matchRisk && matchSegment && matchDepartment && matchAssessment;
    }).sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [devices, searchQuery, statusFilter, riskFilter, segmentFilter, departmentFilter, assessmentFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage) || 1;
  const paginatedDevices = filteredDevices.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  const getRiskBadge = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getAssessmentBadge = (status) => {
    switch (status) {
      case 'ASSESSED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Assessed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-max"><Activity className="w-3 h-3 animate-pulse" /> Scanning</span>;
      case 'REMEDIATION_REQUIRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Action Needed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700/40 text-slate-400 border border-slate-700/50 flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Not Assessed</span>;
    }
  };

  const getSecurityScoreBadge = (score) => {
    const s = typeof score === 'number' ? score : 85;
    let colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (s < 60) {
      colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
    } else if (s < 80) {
      colorClass = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    }
    return (
      <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${colorClass}`}>
        {Math.round(s)}/100
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Offline
          </span>
        );
      case 'isolated':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Quarantined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Suspicious
          </span>
        );
    }
  };

  const handleRowClick = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCurrentPage('device-detail');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-mediblue-400" />
              IoMT Device Inventory & Asset Posture
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mediblue-500/10 text-mediblue-400 border border-mediblue-500/30">
              Defensive Asset Registry
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Registered medical equipment, hardware specifications, network segmentation, and real-time security posture.
          </p>
        </div>

        {/* Register Device Button (RBAC protected for Admin) */}
        {currentUser.role === 'Administrator' && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-mediblue-600/20"
          >
            <Plus className="w-4 h-4" />
            Register Simulated Device
          </button>
        )}
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3 bg-navy-900/80 border border-navy-700/60 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-emerald-400">DEFENSIVE SECURITY SCOPE:</strong> Only explicitly inventoried and authorized IoMT assets are monitored and scoped for defensive diagnostics.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-navy-950 border border-navy-800 hidden md:inline">
          SIMULATION — NO REAL DEVICE CONTROL
        </span>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, model, IP, dept..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Departments</option>
              <option value="Intensive Care Unit">Intensive Care Unit</option>
              <option value="General Medicine Ward">General Medicine Ward</option>
              <option value="Emergency Department">Emergency Department</option>
              <option value="Ambulatory & Cardiology">Ambulatory & Cardiology</option>
            </select>
          </div>

          {/* Network Segment Filter */}
          <div>
            <select
              value={segmentFilter}
              onChange={(e) => { setSegmentFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Segments (VLAN)</option>
              <option value="ICU_VLAN_10">ICU_VLAN_10</option>
              <option value="WARD_VLAN_20">WARD_VLAN_20</option>
              <option value="ER_VLAN_30">ER_VLAN_30</option>
              <option value="AMBULATORY_VLAN_40">AMBULATORY_VLAN_40</option>
              <option value="CORE_VLAN_1">CORE_VLAN_1</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="ISOLATED">Quarantined</option>
            </select>
          </div>

          {/* Assessment Filter */}
          <div>
            <select
              value={assessmentFilter}
              onChange={(e) => { setAssessmentFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Assessment States</option>
              <option value="NOT_ASSESSED">Not Assessed</option>
              <option value="ASSESSED">Assessed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REMEDIATION_REQUIRED">Remediation Req.</option>
            </select>
          </div>
        </div>

        {/* Sorting options */}
        <div className="flex items-center justify-between pt-2 border-t border-navy-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Sort By:</span>
            <button
              onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }}
              className={`hover:text-white flex items-center gap-1 ${sortField === 'name' ? 'text-mediblue-400 font-semibold' : ''}`}
            >
              Name <ArrowUpDown className="w-3 h-3" />
            </button>
            <span>•</span>
            <button
              onClick={() => { setSortField('securityScore'); setSortAsc(!sortAsc); }}
              className={`hover:text-white flex items-center gap-1 ${sortField === 'securityScore' ? 'text-mediblue-400 font-semibold' : ''}`}
            >
              Score <ArrowUpDown className="w-3 h-3" />
            </button>
            <span>•</span>
            <button
              onClick={() => { setSortField('riskLevel'); setSortAsc(!sortAsc); }}
              className={`hover:text-white flex items-center gap-1 ${sortField === 'riskLevel' ? 'text-mediblue-400 font-semibold' : ''}`}
            >
              Risk <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
          <div>
            Showing {filteredDevices.length} matching medical assets
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Asset & Manufacturer</th>
                <th className="py-3 px-4">Department & Room</th>
                <th className="py-3 px-4">Network / IP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Security Score</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Assessment</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No devices match the specified query and filters.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    onClick={() => handleRowClick(dev.id)}
                    className="hover:bg-navy-800/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono text-mediblue-400 font-semibold">
                      {dev.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{dev.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-500" />
                        {dev.manufacturer || 'Generic'} • {dev.model || dev.deviceType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{dev.department || 'General Ward'}</div>
                      <div className="text-[10px] text-slate-400">{dev.location || dev.patientRoom || 'Station 1'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div>{dev.ipAddress}</div>
                      <div className="text-slate-400 text-[10px]">{dev.networkSegment}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(dev.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getSecurityScoreBadge(dev.securityScore)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskBadge(dev.riskLevel)}`}>
                        {dev.riskLevel?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getAssessmentBadge(dev.assessmentStatus)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page {currentPageNum} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
              disabled={currentPageNum === 1}
              className="px-3 py-1 bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
              disabled={currentPageNum === totalPages}
              className="px-3 py-1 bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-mediblue-400" />
                Register Simulated IoMT Asset
              </h2>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                logAudit('DEVICE_REGISTERED', 'Device', `DEV-${Math.floor(1000 + Math.random()*9000)}`, `Registered ${newDeviceName} (${newDeviceManufacturer}).`);
                setAddModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bedside Pulse Oximeter B-2"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Manufacturer</label>
                  <input
                    type="text"
                    value={newDeviceManufacturer}
                    onChange={(e) => setNewDeviceManufacturer(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Model</label>
                  <input
                    type="text"
                    value={newDeviceModel}
                    onChange={(e) => setNewDeviceModel(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Device Type</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                >
                  <option value="ECG Monitor">ECG Monitor</option>
                  <option value="Infusion Pump">Infusion Pump</option>
                  <option value="Ventilator">Ventilator</option>
                  <option value="Glucose Monitor">Glucose Monitor</option>
                  <option value="Bedside Monitor">Bedside Monitor</option>
                  <option value="Wearable Health Patch">Wearable Health Patch</option>
                  <option value="Defibrillator">Defibrillator</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Department</label>
                <select
                  value={newDeviceDepartment}
                  onChange={(e) => setNewDeviceDepartment(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                >
                  <option value="Intensive Care Unit">Intensive Care Unit</option>
                  <option value="General Medicine Ward">General Medicine Ward</option>
                  <option value="Emergency Department">Emergency Department</option>
                  <option value="Ambulatory & Cardiology">Ambulatory & Cardiology</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Assigned Network Segment</label>
                <select
                  value={newDeviceSegment}
                  onChange={(e) => setNewDeviceSegment(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                >
                  <option value="ICU_VLAN_10">ICU_VLAN_10 (Critical Care)</option>
                  <option value="WARD_VLAN_20">WARD_VLAN_20 (General Ward)</option>
                  <option value="ER_VLAN_30">ER_VLAN_30 (Emergency Room)</option>
                  <option value="AMBULATORY_VLAN_40">AMBULATORY_VLAN_40 (Outpatient)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-navy-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 bg-navy-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-mediblue-600 hover:bg-mediblue-500 text-white font-semibold rounded-xl"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
