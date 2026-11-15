import { useTelemetry } from '../hooks/useTelemetry';

const SOURCES = [
  { key: 'amazon', label: 'Amazon Books' },
  { key: 'indeed', label: 'Indeed Jobs' },
  { key: 'booking', label: 'Booking Hotels' },
  { key: 'news', label: 'News and market feed' },
];

function MetricCard({ label, value, icon }) {
  return (
    <div className="glass-panel border border-slate-800/80 rounded-2xl p-5">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="material-symbols-outlined text-blue-400 text-xl">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-white font-mono">{value}</p>
    </div>
  );
}

export default function OverviewDashboard() {
  const { data, isLoading, error } = useTelemetry();

  if (isLoading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-500">Loading saved data and queue status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-sm text-rose-400">
        <p className="font-semibold">Overview unavailable</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const successRate = data.successRate == null ? '—' : `${data.successRate}%`;
  const memoryUsed = data.systemHealth.memory;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Current saved records and scraper queue status.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          API reachable
        </span>
      </div>

      <section aria-label="Queue and collection totals" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Saved records" value={data.totalHarvested.toLocaleString()} icon="database" />
        <MetricCard label="Running tasks" value={data.activeTasks.toLocaleString()} icon="sync" />
        <MetricCard label="Queued tasks" value={data.queuedTasks.toLocaleString()} icon="schedule" />
        <MetricCard label="Queue success rate" value={successRate} icon="task_alt" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Saved records by source</h2>
          <dl className="space-y-4">
            {SOURCES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <dt className="text-slate-400">{label}</dt>
                <dd className="font-mono font-semibold text-white">
                  {(data.recordsBySource[key] ?? 0).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="glass-panel border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Host memory use</h2>
            <span className="font-mono text-sm text-slate-300">{memoryUsed}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Host memory use"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={memoryUsed}
            className="h-2 w-full bg-slate-950 rounded-full overflow-hidden"
          >
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${memoryUsed}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-3">Memory usage reported by the host operating system.</p>
        </div>
      </section>
    </div>
  );
}
