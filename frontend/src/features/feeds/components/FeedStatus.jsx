import { useFeedStatus } from '../hooks/useFeedStatus.js';

const formatDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const statusClass = (status) => {
  if (status === 'success') return 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300';
  if (status === 'failed') return 'border-rose-900/60 bg-rose-950/30 text-rose-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
};

export default function FeedStatus() {
  const { status, isLoading, isRefreshing, error, message, refreshFeeds } = useFeedStatus();

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Content pipeline</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Feed status</h1>
          <p className="mt-2 text-sm text-slate-400">
            Actual configured RSS, market-data, and OSINT sources and their latest synchronization results.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshFeeds}
          disabled={isRefreshing || status?.isRunning}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status?.isRunning ? 'Sync in progress...' : isRefreshing ? 'Starting...' : 'Refresh feeds'}
        </button>
      </header>

      <p className="text-xs text-slate-500">
        Manual refresh is limited to one request per 15 minutes. Automatic synchronization also runs in the background.
      </p>

      {message && (
        <div role="status" className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="rounded-xl border border-slate-800 bg-[#0d1117] p-6 text-sm text-slate-400">
          Loading feed status...
        </p>
      ) : !status ? (
        <p className="rounded-xl border border-slate-800 bg-[#0d1117] p-6 text-sm text-slate-400">
          Feed source status is unavailable.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {status.sources.map((source) => (
            <article key={source.id} className="space-y-4 rounded-xl border border-slate-800 bg-[#0d1117] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-white">{source.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{source.provider} · {source.category}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClass(source.status)}`}>
                  {source.status === 'unknown' ? 'Not run yet' : source.status}
                </span>
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs text-blue-400 hover:text-blue-300"
              >
                {source.url}
              </a>

              <dl className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-xs">
                <div>
                  <dt className="text-slate-500">Last attempt</dt>
                  <dd className="mt-1 text-slate-300">{formatDate(source.lastFinishedAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last success</dt>
                  <dd className="mt-1 text-slate-300">{formatDate(source.lastSuccessAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Items fetched</dt>
                  <dd className="mt-1 text-slate-300">{source.lastItemCount ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">New records</dt>
                  <dd className="mt-1 text-slate-300">{source.lastNewCount ?? '—'}</dd>
                </div>
              </dl>

              {source.lastError && (
                <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">
                  {source.lastError}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
