import { useState } from 'react';
import { useSavedResults } from '../hooks/useSavedResults.js';

const SOURCE_LABELS = {
  amazon: 'Amazon',
  indeed: 'Indeed',
  booking: 'Booking.com',
  news: 'News'
};

const resultKey = (result) => `${result.source}:${result._id}`;

const formatDate = (date) => {
  if (!date) return 'Unknown date';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? 'Unknown date'
    : parsedDate.toLocaleDateString();
};

export default function SavedResults() {
  const {
    results,
    pagination,
    isLoading,
    error,
    applyFilters,
    changePage
  } = useSavedResults();
  const [draftFilters, setDraftFilters] = useState({
    source: 'all',
    q: '',
    from: '',
    to: '',
    sort: 'newest'
  });
  const [selected, setSelected] = useState(() => new Set());

  const updateFilter = (field, value) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    setSelected(new Set());
    applyFilters(draftFilters);
  };

  const toggleResult = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePage = () => {
    const keys = results.map(resultKey);
    const allSelected = keys.length > 0 && keys.every((key) => selected.has(key));
    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((key) => {
        if (allSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const exportSelected = () => {
    const selectedResults = results.filter((result) => selected.has(resultKey(result)));
    const columns = ['source', 'title', 'date', 'summary', 'url', 'details'];
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = selectedResults.map((result) => [
      SOURCE_LABELS[result.source] || result.source,
      result.title,
      result.date,
      result.summary,
      result.url,
      JSON.stringify(result.fields || {})
    ]);
    const csv = [
      columns.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(','))
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'saved-results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const pageKeys = results.map(resultKey);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.has(key));

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Library</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Saved results</h1>
          <p className="mt-2 text-sm text-slate-400">
            Browse records already stored from your searches and the shared news feed.
          </p>
        </div>
        <button
          type="button"
          onClick={exportSelected}
          disabled={selected.size === 0}
          className="rounded-lg border border-blue-800 bg-blue-950/40 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export selected ({selected.size})
        </button>
      </header>

      <form
        onSubmit={submitFilters}
        className="grid gap-3 rounded-xl border border-slate-800 bg-[#0d1117] p-4 md:grid-cols-6"
      >
        <label className="text-xs text-slate-400 md:col-span-2">
          Search
          <input
            value={draftFilters.q}
            onChange={(event) => updateFilter('q', event.target.value)}
            maxLength={100}
            placeholder="Title, company, destination..."
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-xs text-slate-400">
          Source
          <select
            value={draftFilters.source}
            onChange={(event) => updateFilter('source', event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">All sources</option>
            <option value="amazon">Amazon</option>
            <option value="indeed">Indeed</option>
            <option value="booking">Booking.com</option>
            <option value="news">News</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            value={draftFilters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            value={draftFilters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Apply filters
          </button>
        </div>
        <label className="text-xs text-slate-400 md:col-span-2">
          Sort by date
          <select
            value={draftFilters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </form>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <p className="text-sm text-slate-300">
            {pagination.total} stored {pagination.total === 1 ? 'record' : 'records'}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                changePage(pagination.page - 1);
              }}
              disabled={pagination.page <= 1 || isLoading}
              className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {pagination.totalPages === 0 ? 0 : pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                changePage(pagination.page + 1);
              }}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">Loading saved records...</p>
        ) : results.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            No saved records match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all records on this page"
                      checked={allPageSelected}
                      onChange={togglePage}
                      className="accent-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Saved</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {results.map((result) => (
                  <tr key={resultKey(result)} className="align-top text-slate-300">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${result.title}`}
                        checked={selected.has(resultKey(result))}
                        onChange={() => toggleResult(resultKey(result))}
                        className="accent-blue-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-400">
                      {SOURCE_LABELS[result.source] || result.source}
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      <p className="font-semibold text-white">{result.title}</p>
                      {result.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{result.summary}</p>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-xs text-slate-400">
                      {Object.entries(result.fields || {})
                        .filter(([, value]) => value !== null && value !== undefined && value !== '')
                        .slice(0, 3)
                        .map(([label, value]) => (
                          <p key={label} className="truncate">
                            <span className="text-slate-500">{label}: </span>
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        ))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                      {formatDate(result.date)}
                    </td>
                    <td className="px-4 py-4">
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Open
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
