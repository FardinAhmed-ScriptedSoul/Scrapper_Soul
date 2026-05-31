import React from 'react';
import { useTelemetry } from '../hooks/useTelemetry';

export default function OverviewDashboard() {
  // Mount telemetry hook to pull direct backend feeds every 4 seconds
  const { data, isLoading, error } = useTelemetry(4000);

  // Loading state boundary handler
  if (isLoading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center font-mono">
        <div className="w-8 h-8 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-3"></div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">Streaming Cluster Data...</p>
      </div>
    );
  }

  // Error state boundary handler
  if (error) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl font-mono text-xs text-rose-400 flex items-start gap-3">
        <span className="material-symbols-outlined text-lg">dangerous</span>
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Telemetry Connection Failure</p>
          <p className="opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.4s_ease-out]">
      
      {/* Top Banner Greeting Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">System Mainframe Overview</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time analytical telemetry streams and active node cluster performance metrics.</p>
        </div>
        <div className="flex items-center space-x-3 text-xs bg-slate-900/60 border border-slate-800 p-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
          <span className="text-slate-300 font-mono tracking-wider">CORE CORE_ENG_CONNECTED</span>
        </div>
      </div>

      {/* Analytics Counter Grid Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Harvested Items */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Extractions</span>
            <span className="material-symbols-outlined text-blue-400 text-xl">layers</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">{(data?.totalHarvested ?? 0).toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">trending_up</span> Live syncing incoming packets
            </span>
          </div>
        </div>

        {/* Metric 2: Active Handshakes */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Engines</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">bolt</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">{data?.activeTasks} / 16</h3>
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live engine workloads
            </span>
          </div>
        </div>

        {/* Metric 3: Extraction Integrity */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Success Integrity</span>
            <span className="material-symbols-outlined text-purple-400 text-xl">verified_user</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">{data?.successRate}%</h3>
            <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">tune</span> Optimal routing parameters
            </span>
          </div>
        </div>

        {/* Metric 4: Tunnel Bandwidth */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Throughput</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">router</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">{data?.bandwidth}</h3>
            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">speed</span> Connection tunnel rate
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Main Content Block Split Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Main System Live Pipeline Feed */}
        <div className="lg:col-span-2 glass-panel border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-900 pb-4 mb-4">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-base">wysiwyg</span>
                Live Telemetry Tunnel Pipeline
              </h2>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest">STREAM: ACTIVE</span>
            </div>
            
            <div className="space-y-2 font-mono text-xs">
              {data?.liveLogs && data.liveLogs.length > 0 ? (
                data.liveLogs.map((log, index) => (
                  <div key={log.id || index} className="flex items-start space-x-3 p-2 rounded-xl bg-slate-950/30 border border-slate-900/50 hover:bg-slate-900/20 transition-colors">
                    <span className="text-slate-600 shrink-0">{log.time}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0 ${
                      log.type === 'SUCCESS' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                      log.type === 'EXTRACT' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/30' :
                      'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {log.type}
                    </span>
                    <p className="text-slate-300 truncate">{log.msg}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600 italic py-2">No active socket stream events piped to pipeline buffer.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between items-center text-[11px] text-slate-500">
            <span>Pipelines monitored across 3 geographic clusters</span>
            <button className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none outline-none font-semibold">
              Flush Buffer Cache
            </button>
          </div>
        </div>

        {/* Right 1 Column: Mini Component Operational Status Node Panel */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-900 pb-4 mb-4">
              <span className="material-symbols-outlined text-amber-400 text-base">dns</span>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Extraction Health</h2>
            </div>

            <div className="space-y-4">
              {/* Row 1: Memory */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Partition Memory (RAM)</span>
                  <span className="font-mono text-slate-200">{data?.systemHealth?.memory ?? 0}% Used</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-950 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${data?.systemHealth?.memory ?? 0}%` }}></div>
                </div>
              </div>

              {/* Row 2: CPU Heat Load */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Node Allocation Capacity</span>
                  <span className="font-mono text-slate-200">{data?.systemHealth?.cpu ?? 0}% Loaded</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-950 overflow-hidden">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${data?.systemHealth?.cpu ?? 0}%` }}></div>
                </div>
              </div>

              {/* Row 3: Concurrency Limit */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Proxy Rotation Throttles</span>
                  <span className="font-mono text-slate-200">{data?.systemHealth?.throttleFaults ?? 0}% Faults</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-950 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${data?.systemHealth?.throttleFaults ?? 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 flex items-center space-x-3 mt-6">
            <span className="material-symbols-outlined text-blue-400 text-lg">shield</span>
            <div className="text-[11px]">
              <p className="font-bold text-white">SSL Encrypted Tunnel</p>
              <p className="text-slate-500">AES-256 integrity check passing.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}