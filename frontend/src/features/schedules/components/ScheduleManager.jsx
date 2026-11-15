import { useState } from 'react';
import { useSchedules } from '../hooks/useSchedules.js';
import { CRON_PRESETS } from '../cronPresets.js';

export default function ScheduleManager() {
  const {
    schedules,
    isLoading,
    isUpdating,
    error,
    createSchedule,
    toggleSchedule,
    deleteSchedule
  } = useSchedules();
  const [form, setForm] = useState({
    engine: 'indeed',
    query: '',
    location: '',
    cronExpression: CRON_PRESETS[2].value
  });
  const [feedback, setFeedback] = useState(null);

  const handleCreate = async (event) => {
    event.preventDefault();
    const query = form.query.trim();
    const location = form.location.trim();

    if (!query || (form.engine === 'indeed' && !location)) {
      setFeedback({ type: 'error', message: 'Enter a search query and an Indeed location.' });
      return;
    }

    try {
      await createSchedule({ ...form, query, location });
      setForm((current) => ({ ...current, query: '', location: '' }));
      setFeedback({ type: 'success', message: 'Schedule created.' });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  const handleToggle = async (schedule) => {
    try {
      await toggleSchedule(schedule._id, !schedule.isActive);
      setFeedback({ type: 'success', message: 'Schedule updated.' });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  const handleDelete = async (schedule) => {
    try {
      await deleteSchedule(schedule._id);
      setFeedback({ type: 'success', message: 'Schedule deleted.' });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading schedules...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-slate-900 pb-5">
        <h1 className="text-xl md:text-2xl font-bold text-white">Schedules</h1>
        <p className="text-sm text-slate-400 mt-1">
          Run recurring Amazon book and Indeed job searches. Times use the server's local timezone.
        </p>
      </header>

      {(error || feedback) && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-sm ${
            feedback?.type === 'error' || (error && !feedback)
              ? 'border-rose-900/50 bg-rose-950/30 text-rose-300'
              : 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
          }`}
        >
          {feedback?.message || error}
        </div>
      )}

      <form onSubmit={handleCreate} className="glass-panel space-y-4 rounded-2xl border border-slate-800/80 p-5">
        <h2 className="text-sm font-bold text-white">Create a schedule</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-400">
            <span>Source</span>
            <select
              value={form.engine}
              onChange={(event) => setForm((current) => ({ ...current, engine: event.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-3 py-2 text-slate-200"
            >
              <option value="indeed">Indeed jobs</option>
              <option value="amazon">Amazon books</option>
            </select>
          </label>

          <label className="space-y-1 text-xs text-slate-400">
            <span>Frequency</span>
            <select
              value={form.cronExpression}
              onChange={(event) => setForm((current) => ({ ...current, cronExpression: event.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-3 py-2 text-slate-200"
            >
              {CRON_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs text-slate-400">
            <span>Search query</span>
            <input
              value={form.query}
              onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))}
              maxLength={200}
              required
              className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-3 py-2 text-slate-200"
            />
          </label>

          {form.engine === 'indeed' && (
            <label className="space-y-1 text-xs text-slate-400">
              <span>Location</span>
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                maxLength={200}
                required
                className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-3 py-2 text-slate-200"
              />
            </label>
          )}
        </div>
        <button
          type="submit"
          disabled={isUpdating}
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {isUpdating ? 'Creating...' : 'Create schedule'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white">Your schedules ({schedules.length})</h2>
        {error && schedules.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 p-6 text-sm text-rose-300">
            Schedules could not be loaded.
          </p>
        ) : schedules.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">
            No schedules yet.
          </p>
        ) : schedules.map((schedule) => {
          const unsupported = !['amazon', 'indeed'].includes(schedule.engine);
          return (
            <article key={schedule._id} className="rounded-2xl border border-slate-800 bg-[#0d1117] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {schedule.engine} — {schedule.query}
                    {schedule.location ? ` · ${schedule.location}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {schedule.cronExpression} · Last run:{' '}
                    {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never'}
                    {schedule.lastRunStatus ? ` · ${schedule.lastRunStatus}` : ''}
                  </p>
                  {unsupported && (
                    <p className="mt-1 text-xs text-amber-300">
                      This source is not supported by schedules. Delete this legacy schedule.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isUpdating || unsupported}
                    onClick={() => handleToggle(schedule)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40"
                  >
                    {schedule.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleDelete(schedule)}
                    className="rounded-lg border border-rose-900/50 px-3 py-1.5 text-xs text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
