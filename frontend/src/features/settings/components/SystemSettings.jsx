
import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

const CRON_PRESETS = [
  { label: 'Every 6 hours',  value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Once daily (9am)', value: '0 9 * * *' },
  { label: 'Twice weekly',   value: '0 9 * * 1,4' },
  { label: 'Weekly Monday',  value: '0 9 * * 1' },
];

export default function SystemSettings() {
  const {
    settings, setSettings,
    schedules,
    isLoading, error,
    isUpdating,
    saveSettings,
    createSchedule,
    toggleSchedule,
    deleteSchedule
  } = useSettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [feedback, setFeedback]     = useState({ type: '', msg: '' });

  // New schedule form state
  const [newSched, setNewSched] = useState({
    engine: 'indeed', query: '', location: '', cronExpression: '0 9 * * *'
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleUpdateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCommitSettings = async () => {
    setFeedback({ type: '', msg: '' });
    try {
      await saveSettings(settings);
      setFeedback({ type: 'success', msg: 'Configuration committed to database.' });
      setTimeout(() => setFeedback({ type: '', msg: '' }), 4000);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to save settings.' });
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSched.query.trim()) return alert('Query is required.');
    setIsCreating(true);
    try {
      await createSchedule(newSched);
      setNewSched({ engine: 'indeed', query: '', location: '', cronExpression: '0 9 * * *' });
      setFeedback({ type: 'success', msg: 'Schedule created and cron registered.' });
      setTimeout(() => setFeedback({ type: '', msg: '' }), 4000);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to create schedule.' });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center font-mono">
        <div className="w-8 h-8 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-3"></div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">Reading Configuration Map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl font-mono text-xs text-rose-400 flex items-start gap-3">
        <span className="material-symbols-outlined text-lg">dangerous</span>
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Configuration Read Fault</p>
          <p className="opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.4s_ease-out]">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">System Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Configure infrastructure parameters, security tokens, and auto-scrape schedules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Engine Tuning */}
          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="material-symbols-outlined text-blue-400 text-base">tune</span>
              Engine Partition Tuning
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block">Max Concurrency Bound</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range" min="1" max="64"
                    value={settings.maxConcurrency}
                    disabled={isUpdating}
                    onChange={(e) => handleUpdateField('maxConcurrency', parseInt(e.target.value))}
                    className="flex-1 accent-blue-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-blue-400 px-2.5 py-1 rounded-lg shrink-0">
                    {settings.maxConcurrency} Workers
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block">Data Log Retention Cache</label>
                <select
                  value={settings.retentionDays}
                  disabled={isUpdating}
                  onChange={(e) => handleUpdateField('retentionDays', parseInt(e.target.value))}
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value={7}>7 Days Rotation</option>
                  <option value={30}>30 Days Rotation</option>
                  <option value={90}>90 Days Rotation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="material-symbols-outlined text-purple-400 text-base">security</span>
              Security & Access Tokens
            </h2>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 block">Mainframe REST API Key</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-base">key</span>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  disabled={isUpdating}
                  onChange={(e) => handleUpdateField('apiKey', e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl py-2.5 pl-9 pr-10 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">{showApiKey ? "visibility" : "visibility_off"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Auto-Scrape Scheduler ── */}
          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="material-symbols-outlined text-emerald-400 text-base">schedule</span>
              Auto-Scrape Scheduler
            </h2>

            {/* New schedule form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest">Engine</label>
                <select
                  value={newSched.engine}
                  onChange={(e) => setNewSched(p => ({ ...p, engine: e.target.value }))}
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500"
                >
                  <option value="indeed">Indeed Jobs</option>
                  <option value="amazon">Amazon Books</option>
                  <option value="booking">Booking Hotels</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest">Frequency</label>
                <select
                  value={newSched.cronExpression}
                  onChange={(e) => setNewSched(p => ({ ...p, cronExpression: e.target.value }))}
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500"
                >
                  {CRON_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest">Search Query *</label>
                <input
                  type="text"
                  value={newSched.query}
                  onChange={(e) => setNewSched(p => ({ ...p, query: e.target.value }))}
                  placeholder="e.g. ML Engineer"
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest">Location (Indeed only)</label>
                <input
                  type="text"
                  value={newSched.location}
                  onChange={(e) => setNewSched(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. remote / onsite"
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleCreateSchedule}
              disabled={isCreating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              {isCreating ? 'Registering Cron...' : 'Create Auto-Scrape Schedule'}
            </button>

            {/* Active schedules list */}
            {schedules.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Active Schedules ({schedules.length})</p>
                {schedules.map(s => (
                  <div key={s._id} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-900 rounded-xl text-xs font-mono">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{s.engine} — "{s.query}" {s.location ? `/ ${s.location}` : ''}</p>
                      <p className="text-slate-500">{s.cronExpression} · Last run: {s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleSchedule(s._id, !s.isActive)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${s.isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-[#0b141c] transition-all ${s.isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => deleteSchedule(s._id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="material-symbols-outlined text-amber-400 text-base">notifications_active</span>
              Event Webhooks
            </h2>

            <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-200">Webhook Streaming</p>
                <p className="text-[10px] text-slate-500">Pipe finished job arrays</p>
              </div>
              <button
                onClick={() => handleUpdateField('isWebhookEnabled', !settings.isWebhookEnabled)}
                disabled={isUpdating}
                className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 cursor-pointer disabled:opacity-40 ${settings.isWebhookEnabled ? 'bg-blue-500' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-[#0b141c] shadow-md transform transition-all duration-200 ${settings.isWebhookEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {feedback.msg && (
              <div className={`p-2.5 rounded-xl border font-mono text-[10px] flex items-center gap-2 animate-[fadeIn_0.15s_ease-out] ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
                  : 'bg-rose-950/30 border-rose-900/40 text-rose-400'
              }`}>
                <span className="material-symbols-outlined text-sm shrink-0">
                  {feedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <p className="leading-tight">{feedback.msg}</p>
              </div>
            )}

            <div className="space-y-1 text-[11px] text-slate-500 font-mono leading-relaxed">
              <p>• Trigger: <span className="text-slate-400">task.completed</span></p>
              <p>• Retries: <span className="text-slate-400">3 structural attempts</span></p>
            </div>
          </div>

          <button
            onClick={handleCommitSettings}
            disabled={isUpdating}
            className="w-full bg-blue-500 hover:bg-blue-600 text-[#0b141c] font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-md transition-all mt-8 disabled:opacity-50 disabled:cursor-wait"
          >
            {isUpdating ? 'Synchronizing Cluster...' : 'Commit Configuration Set'}
          </button>
        </div>

      </div>
    </div>
  );
}
