import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Network,
  Server,
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Cpu,
  Wifi,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function NetworkTopologyPage() {
  const { devices, setSelectedDeviceId, setCurrentPage, securityEvents } = useApp();
  const [selectedDevice, setSelectedDevice] = useState(devices[0] || null);

  const segments = [
    {
      id: 'CORE_VLAN_1',
      name: 'Core Security & Aggregation VLAN 1',
      subnet: '192.168.1.0/24',
      type: 'Infrastructure',
      description: 'MediShield IDS Sensors, SIEM, and hospital boundary firewall.'
    },
    {
      id: 'ICU_VLAN_10',
      name: 'Critical Care ICU VLAN 10',
      subnet: '192.168.10.0/24',
      type: 'High Priority Life-Support',
      description: 'High-acuity ventilators, 12-lead ECG monitors, and infusion pumps.'
    },
    {
      id: 'WARD_VLAN_20',
      name: 'General Ward VLAN 20',
      subnet: '192.168.20.0/24',
      type: 'Clinical Inpatient',
      description: 'Continuous glucose monitors, standard infusion devices, telemetry beds.'
    },
    {
      id: 'ER_VLAN_30',
      name: 'Emergency Department VLAN 30',
      subnet: '192.168.30.0/24',
      type: 'Acute Trauma & ER',
      description: 'Mobile defibrillators and triage vital sign monitors.'
    },
    {
      id: 'AMBULATORY_VLAN_40',
      name: 'Ambulatory & Outpatient VLAN 40',
      subnet: '192.168.40.0/24',
      type: 'Wireless IoT',
      description: 'Wearable health patches, mobile Holter monitors.'
    }
  ];

  const getDeviceStatusColor = (dev) => {
    if (dev.status === 'isolated') return 'border-purple-500/60 bg-purple-500/10 text-purple-400';
    if (dev.status === 'suspicious') return 'border-amber-500/60 bg-amber-500/10 text-amber-400';
    if (dev.riskLevel === 'critical') return 'border-red-500/60 bg-red-500/10 text-red-400';
    return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400';
  };

  const handleDeviceClick = (dev) => {
    setSelectedDevice(dev);
  };

  const navigateToDevice = (deviceId) => {
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
              <Network className="w-5 h-5 text-mediblue-400" />
              Hospital IoMT Network Topology & VLAN Segmentation
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mediblue-500/10 text-mediblue-400 border border-mediblue-500/30">
              Microsegmentation Map
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time visual map of clinical VLAN subnets, device endpoints, and boundary microsegmentation posture.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-3 bg-navy-900 border border-navy-700/80 rounded-2xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-emerald-400">ISOLATION ENFORCEMENT:</strong> Network segments are strictly segregated to prevent lateral movement of malware or unauthorized command injection between clinical wards.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
          SIMULATION — NO REAL DEVICE CONTROL
        </span>
      </div>

      {/* Main Grid: VLAN Segments + Selected Device Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: VLAN Map */}
        <div className="lg:col-span-2 space-y-4">
          {segments.map(seg => {
            const segDevices = devices.filter(d => d.networkSegment === seg.id);
            return (
              <div
                key={seg.id}
                className="bg-navy-900 border border-navy-800 rounded-2xl p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-mediblue-400" />
                    <span className="font-bold text-white text-xs">{seg.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                      {seg.subnet}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {segDevices.length} Assets Online
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {segDevices.length === 0 ? (
                    <div className="col-span-full py-3 text-center text-slate-500 text-xs">
                      Gateway routing node only. No active endpoint devices.
                    </div>
                  ) : (
                    segDevices.map(dev => {
                      const isSelected = selectedDevice?.id === dev.id;
                      const devAlerts = securityEvents.filter(e => e.deviceId === dev.id && e.status === 'open');
                      return (
                        <div
                          key={dev.id}
                          onClick={() => handleDeviceClick(dev)}
                          className={`
                            p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2
                            ${isSelected ? 'ring-2 ring-mediblue-500 bg-navy-950 border-mediblue-500' : 'bg-navy-950/80 hover:bg-navy-800/50 border-navy-800'}
                          `}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-white text-xs truncate max-w-[140px]">{dev.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{dev.ipAddress}</div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${getDeviceStatusColor(dev)}`}>
                              {dev.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-navy-800/60 text-[10px]">
                            <span className="text-slate-400">
                              Score: <strong className="text-mediblue-400 font-mono">{Math.round(dev.securityScore || 85)}</strong>
                            </span>
                            {devAlerts.length > 0 && (
                              <span className="text-red-400 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> {devAlerts.length}
                              </span>
                            )}
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

        {/* Right Col: Selected Device Inspector */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4 shadow-xl h-fit sticky top-6">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-mediblue-400" />
              Node Inspector
            </h2>
            {selectedDevice && (
              <span className="font-mono text-[10px] text-mediblue-400 bg-mediblue-500/10 px-2 py-0.5 rounded border border-mediblue-500/30">
                {selectedDevice.id}
              </span>
            )}
          </div>

          {selectedDevice ? (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-bold text-white text-base">{selectedDevice.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {selectedDevice.manufacturer || 'IoMT Hardware'} • {selectedDevice.model || selectedDevice.deviceType}
                </p>
              </div>

              <div className="space-y-2 bg-navy-950 p-3.5 rounded-xl border border-navy-800 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-white font-medium">{selectedDevice.department || 'Intensive Care Unit'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-slate-300">{selectedDevice.location || selectedDevice.patientRoom || 'Bed 01'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-mediblue-400">{selectedDevice.ipAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="font-mono text-slate-400">{selectedDevice.macAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">VLAN Segment:</span>
                  <span className="font-mono text-slate-200">{selectedDevice.networkSegment}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Security Posture Score:</span>
                  <span className="font-mono font-bold text-emerald-400">{Math.round(selectedDevice.securityScore || 85)}/100</span>
                </div>
              </div>

              <button
                onClick={() => navigateToDevice(selectedDevice.id)}
                className="w-full py-2 bg-mediblue-600 hover:bg-mediblue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-mediblue-600/20 transition"
              >
                Open Full Asset Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select an asset on the network map to inspect its VLAN parameters and telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
