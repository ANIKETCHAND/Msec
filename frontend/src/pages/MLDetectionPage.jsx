import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Brain,
  Cpu,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Table as TableIcon,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function MLDetectionPage() {
  const { mlMetrics, logAudit } = useApp();

  // Confusion matrix is driven by the backend evaluation report when available so
  // the displayed sample count and cells match the reported metrics.
  const confusionLabels = mlMetrics.confusionLabels || ['Normal', 'DoS', 'Recon', 'Auth'];
  const confusionRows = (mlMetrics.confusionMatrix || []).map((row) => ({
    actual: row.actual,
    cells: row.cells || [row.predNormal, row.predDoS, row.predRecon, row.predAuth]
  }));
  const testSampleCount =
    mlMetrics.testSamples ||
    confusionRows.reduce(
      (sum, row) => sum + row.cells.reduce((a, b) => a + (Number(b) || 0), 0),
      0
    );

  // Interactive Live Sample Inference State
  const [packetRate, setPacketRate] = useState(140);
  const [packetSize, setPacketSize] = useState(520);
  const [synRatio, setSynRatio] = useState(0.08);
  const [portEntropy, setPortEntropy] = useState(1.2);
  const [predictionResult, setPredictionResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleRunInference = async () => {
    setEvaluating(true);
    try {
      const res = await api.evaluateDetection({
        device_id: "DEV-SIM-FLOW",
        packet_rate: Number(packetRate),
        packet_size: Number(packetSize),
        syn_ratio: Number(synRatio),
        port_entropy: Number(portEntropy),
        failed_auth_count: 0
      });

      setPredictionResult({
        classification: res.predicted_class,
        confidence: res.confidence,
        isAnomaly: res.is_anomaly,
        detectionType: res.detection_type,
        ruleTriggered: res.rule_triggered,
        modelVersion: res.model_version,
        suggestedAction: res.suggested_action,
        timestamp: new Date().toLocaleTimeString()
      });

      logAudit(
        'ML_INFERENCE_RUN',
        'MLPipeline',
        res.model_version || mlMetrics.modelName,
        `Evaluated flow sample via API. Prediction: ${res.predicted_class} (${(res.confidence * 100).toFixed(1)}%). Detection Type: ${res.detection_type}.`
      );
    } catch (err) {
      console.warn("Live API inference failed, using offline fallback:", err.message);
      let classification = "Benign";
      let isAnomaly = false;

      if (synRatio > 0.6 || packetRate > 800) {
        classification = "DoS_SYN_Flood";
        isAnomaly = true;
      } else if (portEntropy > 3.0) {
        classification = "Port_Scan";
        isAnomaly = true;
      } else if (packetRate > 400 && packetSize < 200) {
        classification = "Brute_Force";
        isAnomaly = true;
      }

      setPredictionResult({
        classification: `${classification} (Offline Fallback)`,
        confidence: 0.0,
        isAnomaly,
        detectionType: "Client Heuristic Fallback",
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Machine Learning Intrusion Detection
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
              CICIoMT2024
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Supervised Random Forest classification trained on University of New Brunswick IoMT telemetry dataset.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Model Loaded ({mlMetrics.version})
          </span>
        </div>
      </div>

      {/* Model Spec Grid */}
      <div className="bg-white border border-neutral-200 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-neutral-500 text-[11px]">Algorithm</span>
          <div className="text-sm font-semibold text-neutral-900 mt-0.5">{mlMetrics.modelName}</div>
          <span className="text-[10px] text-neutral-400">100 Estimators • Group-split</span>
        </div>
        <div>
          <span className="text-neutral-500 text-[11px]">Dataset Provenance</span>
          <div className="text-sm font-semibold text-neutral-900 mt-0.5">{mlMetrics.dataset}</div>
          <span className="text-[10px] text-neutral-400">UNB Lab • 46 Flow Features</span>
        </div>
        <div>
          <span className="text-neutral-500 text-[11px]">Evaluated Accuracy</span>
          <div className="text-sm font-semibold text-neutral-900 mt-0.5">{mlMetrics.accuracy}%</div>
          <span className="text-[10px] text-neutral-400">Weighted F1: {mlMetrics.f1Score}%</span>
        </div>
        <div>
          <span className="text-neutral-500 text-[11px]">Classification Scope</span>
          <div className="text-sm font-semibold text-neutral-900 mt-0.5">Multiclass (4 Classes)</div>
          <span className="text-[10px] text-neutral-400">Normal, DoS, Recon, Brute-Force</span>
        </div>
      </div>

      {/* Feature Importance & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Feature Importances */}
        <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-neutral-600" />
              Feature Importance Distribution
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Top predictive network flow attributes according to Gini importance.</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mlMetrics.featureImportance} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 0.35]} />
                <YAxis dataKey="feature" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} width={130} />
                <Tooltip
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Importance']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '4px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="importance" fill="#1677FF" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Confusion Matrix */}
        <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-neutral-600" />
                  Test Set Confusion Matrix
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">Actual ground truth vs predicted classifications.</p>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">N = {testSampleCount.toLocaleString()} Flows</span>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded">
              <table className="w-full text-center text-xs">
                <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-medium">Actual \ Pred</th>
                    {confusionLabels.map((label) => (
                      <th key={label} className="py-2.5 px-3 font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-700 font-mono text-xs">
                  {confusionRows.map((row, i) => (
                    <tr key={`${row.actual}-${i}`} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3 text-left font-sans font-medium text-neutral-900">{row.actual}</td>
                      {row.cells.map((value, j) => (
                        <td
                          key={j}
                          className={`py-2.5 px-3 ${i === j ? 'bg-emerald-50 text-emerald-800 font-semibold' : ''}`}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600 space-y-1 mt-3">
            <div className="flex items-center gap-1.5 text-neutral-800 font-medium">
              <Info className="w-3.5 h-3.5 text-neutral-600" />
              Evaluation Methodology
            </div>
            <p className="leading-relaxed">
              Model evaluated using cross-device group-splits to prevent identity overfitting. Precision is {mlMetrics.precision}% and recall is {mlMetrics.recall}%.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Single-Flow Classifier Simulator */}
      <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-600" />
            Interactive Flow Inference Simulator
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Adjust synthetic telemetry attributes below to test model response in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Packet Rate:</span>
              <span className="font-mono text-neutral-900 font-medium">{packetRate} pkts/s</span>
            </div>
            <input
              type="range"
              min="10"
              max="1500"
              step="10"
              value={packetRate}
              onChange={(e) => setPacketRate(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <span className="text-[10px] text-neutral-400">Normal range: 50–200 pkts/s</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Avg Packet Size:</span>
              <span className="font-mono text-neutral-900 font-medium">{packetSize} bytes</span>
            </div>
            <input
              type="range"
              min="64"
              max="1500"
              step="32"
              value={packetSize}
              onChange={(e) => setPacketSize(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <span className="text-[10px] text-neutral-400">Normal range: 400–800 bytes</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">SYN Flag Ratio:</span>
              <span className="font-mono text-neutral-900 font-medium">{(synRatio * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={synRatio}
              onChange={(e) => setSynRatio(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <span className="text-[10px] text-neutral-400">High SYN triggers DoS alert</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Port Entropy:</span>
              <span className="font-mono text-neutral-900 font-medium">{portEntropy.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={portEntropy}
              onChange={(e) => setPortEntropy(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <span className="text-[10px] text-neutral-400">High entropy indicates port scanning</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPacketRate(120); setPacketSize(540); setSynRatio(0.05); setPortEntropy(1.1); }}
              className="px-2.5 py-1 text-xs bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded"
            >
              Preset: Normal
            </button>
            <button
              onClick={() => { setPacketRate(1100); setPacketSize(120); setSynRatio(0.85); setPortEntropy(1.4); }}
              className="px-2.5 py-1 text-xs bg-white hover:bg-neutral-50 text-red-700 border border-neutral-300 rounded"
            >
              Preset: SYN Flood
            </button>
            <button
              onClick={() => { setPacketRate(280); setPacketSize(320); setSynRatio(0.20); setPortEntropy(4.2); }}
              className="px-2.5 py-1 text-xs bg-white hover:bg-neutral-50 text-amber-700 border border-neutral-300 rounded"
            >
              Preset: Recon Scan
            </button>
          </div>

          <button
            onClick={handleRunInference}
            disabled={evaluating}
            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-swiss disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {evaluating ? "Evaluating Tensor..." : "Execute Model Inference"}
          </button>
        </div>

        {/* Prediction Output Card */}
        {predictionResult && (
          <div className={`
            p-4 rounded border flex flex-col sm:flex-row items-center justify-between gap-4 transition-swiss
            ${predictionResult.isAnomaly
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }
          `}>
            <div className="flex items-center gap-3">
              {predictionResult.isAnomaly ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-semibold">
                  Predicted Class: <span className={predictionResult.isAnomaly ? 'text-red-700' : 'text-emerald-700'}>{predictionResult.classification}</span>
                </div>
                <div className="text-[11px] text-neutral-600 mt-0.5">
                  Model Confidence: <strong>{(predictionResult.confidence * 100).toFixed(1)}%</strong> • Version: {predictionResult.modelVersion || mlMetrics.version}
                  {predictionResult.detectionType && <span className="ml-1">• Engine: <span className="font-medium text-neutral-800">{predictionResult.detectionType}</span></span>}
                  {predictionResult.ruleTriggered && <span className="text-amber-800 block text-[10px] mt-0.5 font-medium">Rule: {predictionResult.ruleTriggered}</span>}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-neutral-500">
              Evaluated: {predictionResult.timestamp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
