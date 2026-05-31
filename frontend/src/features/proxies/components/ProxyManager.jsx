import React, { useState } from 'react';
import { useProxies } from '../hooks/useProxies';

export default function ProxyManager() {
  const { proxyList, isLoading, error, isPinging, pingBackboneRelay, bulkIngestProxies } = useProxies();
  const [inputPool, setInputPool] = useState('142.250.190.46:8080\n172.217.16.142:3128');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState({ type: '', msg: '' });

  const handleBulkIngest = async () => {
    setIsIngesting(true);
    setIngestFeedback({ type: '', msg: '' });
    try {
      await bulkIngestProxies(inputPool);
      setIngestFeedback({ type: 'success', msg: 'Cluster endpoints successfully appended and mounted.' });
      setInputPool(''); // Clear field on full integration success
      setTimeout(() => setIngestFeedback({ type: '', msg: '' }), 4000);
    } catch (err) {
      setIngestFeedback({ type: 'error', msg: err.message });
    } finally {
      setIsIngesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center font-mono">
        <div className="w-8 h-8 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-3"></div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">Querying Proxy Relays...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl font-mono text-xs text-rose-400 flex items-start gap-3">
        <span className="material-symbols-outlined text-lg">dangerous</span>
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Backbone Tunnel Error</p>
          <p className="opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.4s_ease-out]">
      
      {/* View Header Meta Status Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">Proxy Network Infrastructure</h1>
          <p className="text-xs text-slate-400 mt-1">Configure geo-distributed backconnect rotating arrays, check endpoint responses, and monitor ban rates.</p>
        </div>
        <button 
          onClick={pingBackboneRelay}
          disabled={isPinging}
          className="bg-blue-950/40 hover:bg-blue-950/60 text-blue-400 border border-blue-900/50 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${isPinging ? 'animate-spin' : ''}`}>sync_alt</span>
          {isPinging ? 'Pinging Relays...' : 'Ping Backbone Relay'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Area: Live Interactive Table of Active Proxies */}
        <div className="lg:col-span-2 glass-panel border border-slate-800/80 rounded-2xl p-6 overflow-hidden">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-base">hub</span>
              Active Cluster Endpoints
            </h2>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase font-sans text-[10px] tracking-wider bg-slate-950/20">
                  <th className="py-3 px-6">Proxy Endpoint Address</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {proxyList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 italic font-sans">
                      No proxies mounted in the current allocation. Input addresses below to initialize.
                    </td>
                  </tr>
                ) : (
                  proxyList.map((p) => {
                    const latencyVal = parseInt(p.latency || '0');
                    return (
                      <tr key={p.id || p._id} className="hover:bg-slate-900/20 transition-colors group">
                        <td className="py-3.5 px-6 font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                          {p.ip || p.address}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{p.type || 'SOCKS5'}</td>
                        <td className="py-3.5 px-4 text-slate-300">{p.location || 'Global Pool'}</td>
                        <td className={`py-3.5 px-4 font-bold ${
                          p.status === 'Slow' || latencyVal > 200 ? 'text-amber-500' : 
                          p.status === 'Throttled' || latencyVal === 0 ? 'text-slate-600' : 
                          'text-emerald-400'
                        }`}>
                          {p.latency || '0ms'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border ${
                            p.status === 'Healthy' || (latencyVal > 0 && latencyVal <= 200) ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' :
                            p.status === 'Slow' || latencyVal > 200 ? 'bg-amber-950/30 text-amber-400 border-amber-900/30' :
                            'bg-rose-950/30 text-rose-400 border-rose-900/30'
                          }`}>
                            {p.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column Area: Bulk Import Node Array Text Panel */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-900 pb-4">
              <span className="material-symbols-outlined text-amber-400 text-base">input</span>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Bulk Proxy Ingestion</h2>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Target Node Ingestion List (IP:PORT)
              </label>
              <textarea
                value={inputPool}
                disabled={isIngesting}
                onChange={(e) => setInputPool(e.target.value)}
                className="w-full h-44 bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all resize-none custom-scrollbar disabled:opacity-50"
                placeholder="127.0.0.1:8080"
              />
            </div>

            {/* Ingestion Feedback Message Container Box */}
            {ingestFeedback.msg && (
              <div className={`p-2.5 rounded-xl border font-mono text-[10px] flex items-center gap-2 animate-[fadeIn_0.15s_ease-out] ${
                ingestFeedback.type === 'success' 
                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' 
                  : 'bg-rose-950/30 border-rose-900/40 text-rose-400'
              }`}>
                <span className="material-symbols-outlined text-sm shrink-0">
                  {ingestFeedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <p className="leading-normal">{ingestFeedback.msg}</p>
              </div>
            )}

            <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Automatic Rotation Interval</span>
                <span className="text-slate-300 font-mono">Every 5 Requests</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tunnel Protocol Handshake</span>
                <span className="text-slate-300 font-mono">SOCKS5 / HTTP IPV4</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleBulkIngest}
            disabled={isIngesting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-[#0b141c] font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-md transition-all mt-6 disabled:opacity-50 disabled:cursor-wait"
          >
            {isIngesting ? 'Mounting Array Endpoints...' : 'Mount Proxy Gateways'}
          </button>
        </div>

      </div>

    </div>
  );
}