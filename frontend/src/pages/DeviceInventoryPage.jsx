import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Server,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Clock,
  Shield,
  Activity
} from 'lucide-react';

export default function DeviceInventoryPage() {
  const { devices, setSelectedDeviceId, setCurrentPage, currentUser, toggleDeviceIsolation, registerDevice, decommissionDevice } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
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
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDeviceMac, setNewDeviceMac] = useState('');
  const [newDeviceFirmware, setNewDeviceFirmware] = useState('1.0.0');
  const [addModalError, setAddModalError] = useState('');
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [decommissionError, setDecommissionError] = useState('');

  const handleDecommission = async (dev) => {
    setDecommissionError('');
    const confirmed = window.confirm(
      `Decommission ${dev.name} (${dev.id})?\n\nThis permanently removes the asset and its completed assessment history from the inventory.`
    );
    if (!confirmed) return;

    try {
      await decommissionDevice(dev.id);
    } catch (err) {
      setDecommissionError(err.message || 'Failed to decommission asset.');
    }
  };

  const handleSaveRegistration = async () => {
    setAddModalError('');

    if (!newDeviceName.trim()) {
      setAddModalError('Asset model name is required.');
      return;
    }
    if (!newDeviceIp.trim()) {
      setAddModalError('IP address is required.');
      return;
    }

    setSavingRegistration(true);
    try {
      const created = await registerDevice({
        name: newDeviceName,
        deviceType: newDeviceType,
        ipAddress: newDeviceIp,
        macAddress: newDeviceMac,
        firmwareVersion: newDeviceFirmware,
        networkSegment: newDeviceSegment,
        department: newDeviceDepartment,
        manufacturer: newDeviceManufacturer,
        model: newDeviceModel,
        riskLevel: 'medium',
        securityScore: 85.0
      });

      setAddModalOpen(false);
      setNewDeviceName('');
      setNewDeviceIp('');
      setNewDeviceMac('');
      setNewDeviceFirmware('1.0.0');
      setAddModalError('');
      setCurrentPageNum(1);
      setSelectedDeviceId(created.id);
    } catch (err) {
      setAddModalError(err.message || 'Failed to register asset.');
    } finally {
      setSavingRegistration(false);
    }
  };

  // Filtered & sorted device dataset
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        dev.name?.toLowerCase().includes(q) ||
        dev.id?.toLowerCase().includes(q) ||
        dev.ipAddress?.includes(q) ||
        dev.deviceType?.toLowerCase().includes(q) ||
        (dev.manufacturer && dev.manufacturer.toLowerCase().includes(q)) ||
        (dev.department && dev.department.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || dev.status?.toUpperCase() === statusFilter;
      const matchRisk = riskFilter === 'ALL' || dev.riskLevel?.toUpperCase() === riskFilter;
      const matchDepartment = departmentFilter === 'ALL' || dev.department === departmentFilter;

      return matchSearch && matchStatus && matchRisk && matchDepartment;
    }).sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [devices, searchQuery, statusFilter, riskFilter, departmentFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage) || 1;
  const paginatedDevices = filteredDevices.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  // Sorting toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleDeviceClick = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCurrentPage('device-detail');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Register Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Device Inventory</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              ({devices.length} registered assets)
            </span>
          </h1>
        </div>

        {currentUser.role === 'Administrator' && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {decommissionError && (
        <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start justify-between gap-3">
          <span>{decommissionError}</span>
          <button
            onClick={() => setDecommissionError('')}
            className="text-red-700 hover:text-red-900 shrink-0"
            aria-label="Dismiss decommission error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Controls & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-5 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPageNum(1); }}
            placeholder="Search by device name, ID, IP address, manufacturer..."
            className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-[#1677FF]/20 transition-swiss font-mono"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPageNum(1); }}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Status: All</option>
            <option value="ONLINE">Status: Online</option>
            <option value="SUSPICIOUS">Status: Suspicious</option>
            <option value="ISOLATED">Status: Quarantined</option>
            <option value="OFFLINE">Status: Offline</option>
          </select>
        </div>

        {/* Risk Filter */}
        <div className="lg:col-span-2">
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setCurrentPageNum(1); }}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Risk: All</option>
            <option value="LOW">Risk: Low</option>
            <option value="MEDIUM">Risk: Medium</option>
            <option value="HIGH">Risk: High</option>
            <option value="CRITICAL">Risk: Critical</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className="lg:col-span-3">
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPageNum(1); }}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Department: All</option>
            <option value="Intensive Care Unit">Intensive Care Unit (ICU)</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Emergency Department">Emergency Department</option>
            <option value="General Ward">General Ward</option>
          </select>
        </div>
      </div>

      {/* 3. Clean Swiss Device Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-medium uppercase text-[11px] tracking-wider select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] transition-swiss"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Device</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">IP Address</th>
                <th
                  onClick={() => handleSort('riskLevel')}
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] transition-swiss"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Risk</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] transition-swiss"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-[#6B7280]">
                    No medical devices match your selected search criteria.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    onClick={() => handleDeviceClick(dev.id)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-swiss group"
                  >
                    {/* Device Name & Hardware */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-[#171717] group-hover:text-[#1677FF] transition-swiss block">
                          {dev.name}
                        </span>
                        <span className="text-[11px] text-[#6B7280] font-mono mt-0.5 block">
                          {dev.id} • {dev.manufacturer} {dev.model}
                        </span>
                      </div>
                    </td>

                    {/* Device Type */}
                    <td className="py-3 px-4 text-[#171717]">
                      <span>{dev.deviceType}</span>
                      <span className="block text-[11px] text-[#9CA3AF]">{dev.department}</span>
                    </td>

                    {/* IP Address & Segment */}
                    <td className="py-3 px-4 font-mono text-[#6B7280]">
                      <span className="text-[#171717] font-medium block">{dev.ipAddress}</span>
                      <span className="text-[10px] text-[#9CA3AF] block">{dev.networkSegment}</span>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3 px-4">
                      <StatusBadge status={dev.riskLevel} size="xs" />
                    </td>

                    {/* Operational Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={dev.status} size="xs" />
                    </td>

                    {/* Last Seen */}
                    <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                      {dev.lastSeen || 'Just now'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDeviceClick(dev.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-[#1677FF] hover:bg-[#E6F4FF] transition-swiss"
                        >
                          Diagnostics
                        </button>

                        {(currentUser.role === 'Administrator' || currentUser.role === 'Security Analyst') && (
                          <button
                            onClick={() => toggleDeviceIsolation(dev.id)}
                            title="Microsegmentation quarantine"
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-swiss ${
                              dev.status === 'isolated'
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                            }`}
                          >
                            {dev.status === 'isolated' ? 'Restore' : 'Quarantine'}
                          </button>
                        )}

                        {currentUser.role === 'Administrator' && (
                          <button
                            onClick={() => handleDecommission(dev)}
                            title="Remove this asset from the inventory (Administrator only)"
                            className="px-2 py-1 rounded text-[11px] font-medium text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-swiss"
                          >
                            Decommission
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280] select-none font-mono">
          <span>
            Showing {filteredDevices.length === 0 ? 0 : (currentPageNum - 1) * itemsPerPage + 1}–{Math.min(currentPageNum * itemsPerPage, filteredDevices.length)} of {filteredDevices.length} assets
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPageNum(p => Math.max(p - 1, 1))}
              disabled={currentPageNum === 1}
              className="p-1 rounded border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 transition-swiss"
            >
              <ChevronLeft className="w-4 h-4 text-[#171717]" />
            </button>
            <span className="tabular-nums">Page {currentPageNum} of {totalPages}</span>
            <button
              onClick={() => setCurrentPageNum(p => Math.min(p + 1, totalPages))}
              disabled={currentPageNum === totalPages}
              className="p-1 rounded border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] disabled:opacity-40 transition-swiss"
            >
              <ChevronRight className="w-4 h-4 text-[#171717]" />
            </button>
          </div>
        </div>
      </div>

      {/* Register Asset Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-[#171717] font-semibold text-sm">
                <Server className="w-4 h-4 text-[#1677FF]" />
                <span>Register Medical Endpoint</span>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6B7280] font-medium mb-1">Asset Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. Philips IntelliVue MX800"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none focus:border-[#1677FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.10.0"
                    value={newDeviceIp}
                    onChange={(e) => setNewDeviceIp(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] font-mono focus:outline-none focus:border-[#1677FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">MAC Address</label>
                  <input
                    type="text"
                    placeholder="auto-generated if blank"
                    value={newDeviceMac}
                    onChange={(e) => setNewDeviceMac(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] font-mono focus:outline-none focus:border-[#1677FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">Firmware Version</label>
                  <input
                    type="text"
                    placeholder="1.0.0"
                    value={newDeviceFirmware}
                    onChange={(e) => setNewDeviceFirmware(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] font-mono focus:outline-none focus:border-[#1677FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={newDeviceDepartment}
                    onChange={(e) => setNewDeviceDepartment(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none focus:border-[#1677FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">Device Class</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none"
                  >
                    <option>Infusion Pump</option>
                    <option>Patient Monitor</option>
                    <option>Mechanical Ventilator</option>
                    <option>Continuous Glucose Monitor</option>
                    <option>EHR Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#6B7280] font-medium mb-1">VLAN Segment</label>
                  <select
                    value={newDeviceSegment}
                    onChange={(e) => setNewDeviceSegment(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none font-mono"
                  >
                    <option>ICU_VLAN_10</option>
                    <option>WARD_VLAN_20</option>
                    <option>ER_VLAN_30</option>
                    <option>AMBULATORY_VLAN_40</option>
                  </select>
                </div>
              </div>

            </div>

            {addModalError && (
              <div className="p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-700">
                {addModalError}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E7EB] flex justify-end gap-2 text-xs">
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRegistration}
                disabled={savingRegistration}
                className="px-3 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingRegistration ? 'Saving…' : 'Save Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
