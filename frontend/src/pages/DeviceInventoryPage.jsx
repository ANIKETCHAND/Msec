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
  X
} from 'lucide-react';

export default function DeviceInventoryPage() {
  const { devices, setSelectedDeviceId, setCurrentPage, currentUser, logAudit } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 5;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('Infusion Pump');
  const [newDeviceSegment, setNewDeviceSegment] = useState('ICU_VLAN_10');

  // Filtered & sorted list
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const matchSearch =
        dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dev.ipAddress.includes(searchQuery) ||
        dev.deviceType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || dev.status.toUpperCase() === statusFilter;
      const matchRisk = riskFilter === 'ALL' || dev.riskLevel.toUpperCase() === riskFilter;
      const matchSegment = segmentFilter === 'ALL' || dev.networkSegment === segmentFilter;

      return matchSearch && matchStatus && matchRisk && matchSegment;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [devices, searchQuery, statusFilter, riskFilter, segmentFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage) || 1;
  const paginatedDevices = filteredDevices.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  const getRiskBadge = (risk) => {
    switch (risk.toLowerCase()) {
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

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-mediblue-400" />
            IoMT Device Inventory
          </h1>
          <p className="text-xs text-slate-400">
            Registered medical equipment, network segmentation, and real-time security posture.
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

      {/* Search & Filters Bar */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, name, or IP..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
            />
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

          {/* Risk Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>

          {/* Network Segment Filter */}
          <div>
            <select
              value={segmentFilter}
              onChange={(e) => { setSegmentFilter(e.target.value); setCurrentPageNum(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
            >
              <option value="ALL">All Network Segments</option>
              <option value="ICU_VLAN_10">ICU_VLAN_10</option>
              <option value="WARD_VLAN_20">WARD_VLAN_20</option>
              <option value="ER_VLAN_30">ER_VLAN_30</option>
              <option value="AMBULATORY_VLAN_40">AMBULATORY_VLAN_40</option>
              <option value="CORE_VLAN_1">CORE_VLAN_1</option>
            </select>
          </div>
        </div>

        {/* Sorting options */}
        <div className="flex items-center justify-between pt-2 border-t border-navy-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Sort By:</span>
            <button
              onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }}
              className={`hover:text-white flex items-center gap-1 ${sortField === 'name' ? 'text-mediblue-400 font-semibold' : ''}`}
            >
              Name <ArrowUpDown className="w-3 h-3" />
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
            Showing {filteredDevices.length} matching devices
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
                <th className="py-3 px-4">Device Name & Type</th>
                <th className="py-3 px-4">Network Segment</th>
                <th className="py-3 px-4">IP / MAC Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
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
                    <td className="py-3.5 px-4 font-mono text-mediblue-400 font-medium">
                      {dev.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{dev.name}</div>
                      <div className="text-[11px] text-slate-400">{dev.deviceType}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-navy-950 text-slate-300 border border-navy-800">
                        {dev.networkSegment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div>{dev.ipAddress}</div>
                      <div className="text-slate-400 text-[10px]">{dev.macAddress}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(dev.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskBadge(dev.riskLevel)}`}>
                        {dev.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {dev.lastSeen}
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
              disabled={currentPageNum === 1}
              onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:hover:bg-navy-800 rounded-lg text-slate-200 transition"
            >
              Previous
            </button>
            <button
              disabled={currentPageNum === totalPages}
              onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-navy-800 hover:bg-navy-700 disabled:opacity-40 disabled:hover:bg-navy-800 rounded-lg text-slate-200 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Register Device Modal (Admin Only) */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-mediblue-400" />
                Register New Synthetic Device
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                logAudit('DEVICE_REGISTERED', 'Device', `DEV-${Math.floor(1000 + Math.random()*9000)}`, `Registered ${newDeviceName}.`);
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
                  <option value="Wearable Sensor">Wearable Sensor</option>
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
