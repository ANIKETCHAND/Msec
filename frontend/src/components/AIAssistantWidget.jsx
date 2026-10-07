import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  X,
  Send,
  Shield,
  Bot,
  User,
  AlertTriangle,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

export default function AIAssistantWidget() {
  const { devices, securityEvents, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am MediShield AI, your IoMT defensive security assistant. I can help analyze device postures, explain medical CVE vulnerabilities, or recommend clinical microsegmentation rules. How can I assist you today?"
    }
  ]);
  const [typing, setTyping] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setTyping(true);

    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();

      // Guardrail against offensive prompt injection
      if (lower.includes('exploit') || lower.includes('hack') || lower.includes('attack') || lower.includes('shutdown') || lower.includes('crack')) {
        reply = "⚠️ **DEFENSIVE SECURITY POLICY:** MediShield strictly prohibits offensive exploitation, credential attacks, or medical device shutdown. For safety-critical IoMT systems, our guidance focuses on defense-in-depth: enforcing VLAN isolation, disabling legacy plaintext protocols (HTTP, Telnet), and tunnel encryption for HL7 telemetry.";
      } else if (lower.includes('ventilator') || lower.includes('vent')) {
        reply = "🏥 **Ventilator Posture Guidance (DEV-VENT-502):** Critical care ventilators use proprietary telemetry and Modbus/TCP (Port 502). Because native Modbus lacks authentication, the device must remain on a dedicated ICU VLAN with firewall ACLs permitting communication only with central clinical monitoring servers.";
      } else if (lower.includes('infusion') || lower.includes('pump')) {
        reply = "💉 **Smart Infusion Pump Security (DEV-PUMP-204):** Common vulnerabilities in wireless infusion pumps involve plaintext HTTP portals (Port 80) or unauthenticated battery status leaks (CVE-2020-25165). Recommended remediation: enforce HTTPS with trusted enterprise PKI certificates and restrict management ports to biomedical IT subnets.";
      } else if (lower.includes('posture') || lower.includes('score')) {
        const avgScore = Math.round(devices.reduce((acc, d) => acc + (d.securityScore || 85), 0) / (devices.length || 1));
        reply = `📊 **Institutional IoMT Posture Overview:** Currently tracking ${devices.length} registered medical assets with an average security score of **${avgScore}/100**. ${securityEvents.filter(e => e.status === 'open').length} security alerts are active. Devices with scores below 60 require immediate assessment and network quarantine.`;
      } else if (lower.includes('hl7') || lower.includes('hipaa') || lower.includes('privacy')) {
        reply = "🔒 **Clinical Privacy & HL7 Protection:** Cleartext HL7 v2 telemetry over MLLP (Port 2575) exposes patient vitals and health records in violation of HIPAA Security Rule. MediShield protects these feeds using AES-256-GCM authenticated encryption and SHA-256 data integrity verification.";
      } else {
        reply = `🔍 **MediShield IoMT Advisor:** I analyzed your query regarding *"${userText}"*. In hospital IoT environments, always adhere to NIST SP 800-53 and FDA Pre-Market Cybersecurity Guidelines: maintain strict asset inventories, continuous behavioral telemetry monitoring, and rapid defensive microsegmentation.`;
      }

      setMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
      setTyping(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-2.5 bg-gradient-to-r from-mediblue-600 to-indigo-600 hover:from-mediblue-500 hover:to-indigo-500 text-white rounded-full font-semibold text-xs flex items-center gap-2 shadow-2xl shadow-indigo-600/30 transition transform hover:scale-105"
      >
        <Sparkles className="w-4 h-4" />
        MediShield AI Assistant
      </button>

      {/* Assistant Modal Window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-full max-w-md bg-navy-900 border border-navy-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[540px]">
          {/* Header */}
          <div className="p-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-mediblue-500/20 text-mediblue-400 rounded-xl">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  MediShield AI Assistant
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Defensive Only
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">IoMT Clinical Cyber Threat Advisor</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-mediblue-600/20 border border-mediblue-500/30 text-mediblue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-mediblue-600 text-white rounded-tr-none'
                      : 'bg-navy-950 text-slate-200 border border-navy-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2.5 items-center text-slate-400 text-[11px] italic">
                <Bot className="w-4 h-4 text-mediblue-400 animate-pulse" />
                MediShield AI is evaluating clinical knowledgebase...
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="p-2 border-t border-navy-800/80 bg-navy-950/60 flex items-center gap-1.5 overflow-x-auto text-[10px]">
            <button
              onClick={() => setInput('What are the risks of Modbus on ICU ventilators?')}
              className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-800 whitespace-nowrap"
            >
              Ventilator Risks
            </button>
            <button
              onClick={() => setInput('How does MediShield protect infusion pumps?')}
              className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-800 whitespace-nowrap"
            >
              Infusion Pumps
            </button>
            <button
              onClick={() => setInput('What is our current average posture score?')}
              className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-800 whitespace-nowrap"
            >
              Posture Summary
            </button>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-navy-950 border-t border-navy-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about IoMT posture, CVEs, or mitigation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-mediblue-600 hover:bg-mediblue-500 disabled:opacity-40 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
