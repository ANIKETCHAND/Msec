import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Network,
  Server,
  Activity,
  Shield,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function NetworkTopologyPage() {
  const { devices, setSelectedDeviceId, setCurrentPage } = useApp();
  const [selectedDevice, setSelectedDevice] = useState(devices[0] || null);

  const segments = [
    {
      id: 'CORE_VLAN_1',
      name: 'Core Security & Aggregation VLAN 1',
      subnet: '192.168.1.0/24',
      type: 'Infrastructure',
      description: 'MediShield IDS Sensors, SIEM engine, and hospital boundary firewall.'
    },
    {
      id: 'ICU_VLAN_10',
      name: 'Critical Care ICU VLAN 10',
      subnet: '192.168.10.0/24',
      type: 'Life-Support Critical',
      description: 'High-acuity mechanical ventilators, patient vital monitors, and smart infusion pumps.'
    },
    {
      id: 'WARD_VLAN_20',
      name: 'General Inpatient Ward VLAN 20',
      subnet: '192.168.20.0/24',
      type: 'Clinical Inpatient',
      description: 'Continuous glucose monitors, standard telemetry beds, and infusion gateways.'
    },
    {
      id: 'ER_VLAN_30',
      name: 'Emergency Department VLAN 30',
      subnet: '192.168.30.0/24',
      type: 'Acute Trauma & ER',
      description: 'Defibrillators, crash cart telemetry, and triage physiological monitors.'
    },
    {
      id: 'AMBULATORY_VLAN_40',
      name: 'Ambulatory & Outpatient VLAN 40',
      subnet: '192.168.40.0/24',
      type: 'Wireless IoT',
      description: 'Wearable health sensors and ambulatory telemetry patches.'
    }
  ];

  const navigateToDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCurrentPage('device-detail');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Hospital IoMT Network Topology</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              (Clinical VLAN Microsegmentation)
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Logical subnets, clinical device boundaries, and microsegmentation firewall ACLs.
          </p>
        </div>
      </div>

      {/* Safety Scope Notice Banner */}
      <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#171717]">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>
            <strong>MICROSEGMENTATION ACL ENFORCEMENT:</strong> Hospital VLANs are isolated to prevent lateral reconnaissance between ICU life-support and external medical networks.
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#F59E0B] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 w-max font-semibold">
          DEFENSIVE ARCHITECTURE
        </span>
      </div>

      {/* 2. Main Grid: VLAN Subnets (Left 8 cols) & Endpoint Inspector (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: VLAN Segments List */}
        <div className="lg:col-span-8 space-y-4">
          {segments.map((seg) => {
            const segDevices = devices.filter(d => d.networkSegment === seg.id);

            return (
              <div
                key={seg.id}
                className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1677FF]" />
                    <span className="font-semibold text-[#171717] text-xs sm:text-sm">{seg.name}</span>
                    <span className="font-mono text-[11px] text-[#6B7280] bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#E5E7EB]">
                      {seg.subnet}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#6B7280] tabular-nums">
                    {segDevices.length} Endpoints
                  </span>
                </div>

                <p className="text-xs text-[#6B7280]">{seg.description}</p>

                {/* Endpoints in this VLAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {segDevices.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-[#9CA3AF] bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                      Gateway firewall aggregation node only. No active endpoint hosts.
                    </div>
                  ) : (
                    segDevices.map((dev) => {
                      const isSelected = selectedDevice?.id === dev.id;
                      return (
                        <div
                          key={dev.id}
                          onClick={() => setSelectedDevice(dev)}
                          className={`p-3 rounded border cursor-pointer transition-swiss ${
                            isSelected
                              ? 'border-[#1677FF] bg-[#E6F4FF]/30 shadow-xs'
                              : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#171717] truncate">{dev.name}</span>
                            <StatusBadge status={dev.status} size="xs" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280] mt-1.5">
                            <span>{dev.ipAddress}</span>
                            <span>Score: {Math.round(dev.securityScore ?? 85)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Endpoint Diagnostics */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 sticky top-4">
          <div className="pb-3 border-b border-[#F3F4F6]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Endpoint Inspector
            </span>
            <h3 className="text-base font-semibold text-[#171717] mt-1">
              {selectedDevice ? selectedDevice.name : 'Select Device'}
            </h3>
          </div>

          {selectedDevice ? (
            <div className="space-y-3 text-xs">
              <div className="space-y-2 p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Asset ID:</span>
                  <span className="font-semibold text-[#171717]">{selectedDevice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">IPv4 Address:</span>
                  <span className="font-semibold text-[#1677FF]">{selectedDevice.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">VLAN Subnet:</span>
                  <span className="text-[#171717]">{selectedDevice.networkSegment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Security Score:</span>
                  <span className="font-bold text-[#10B981]">{Math.round(selectedDevice.securityScore ?? 85)}/100</span>
                </div>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[11px] mb-1 font-medium">Department & Clinical Owner</span>
                <p className="text-[#171717]">{selectedDevice.department} &bull; {selectedDevice.owner || 'Clinical Engineering'}</p>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[11px] mb-1 font-medium">Manufacturer & Firmware</span>
                <p className="text-[#171717]">{selectedDevice.manufacturer} {selectedDevice.model} (v{selectedDevice.firmwareVersion || '2.4.1'})</p>
              </div>

              <button
                onClick={() => navigateToDevice(selectedDevice.id)}
                className="w-full py-2 px-3 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-swiss shadow-xs mt-2"
              >
                <span>View Full Diagnostics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] py-8 text-center">Click a node to inspect its topology posture.</p>
          )}
        </div>
      </div>
    </div>
  );
}
