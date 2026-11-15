import { useState } from 'react';
import api from '../../../api/api.js';
import { CRON_PRESETS } from '../../schedules/cronPresets.js';
import { useSavedSearchPresets } from '../hooks/useSavedSearchPresets.js';

const EMPTY_FORM = {
  name: '',
  engine: 'amazon',
  query: '',
  location: '',
  checkIn: '',
  checkOut: ''
};

const SOURCE_LABELS = {
  amazon: 'Amazon Books',
  indeed: 'Indeed Jobs',
  booking: 'Booking.com'
};

export default function SavedSearchPresets() {
  const {
    presets,
    isLoading,
    isUpdating,
    error,
    savePreset,
    deletePreset,
    runPreset
  } = useSavedSearchPresets();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [cronByPreset, setCronByPreset] = useState({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      await savePreset(form, editingId);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setFeedback({ type: 'success', message: 'Search preset saved.' });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  const handleEdit = (preset) => {
    setForm({
      name: preset.name,
      engine: preset.engine,
      query: preset.query,
      location: preset.location || '',
      checkIn: preset.checkIn || '',
      checkOut: preset.checkOut || ''
    });
    setEditingId(preset._id);
    setFeedback(null);
  };

  const handleDelete = async (preset) => {
    if (!window.confirm(`Delete the "${preset.name}" preset?`)) return;
    try {
      await deletePreset(preset._id);
      if (editingId === preset._id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setFeedback({ type: 'success', message: 'Search preset deleted.' });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  const handleRun = async (preset) => {
    try {
      const queued = await runPreset(preset._id);
      setFeedback({ type: 'success', message: `Search queued as job ${queued.jobId}.` });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message });
    }
  };

  const handleSchedule = async (preset) => {
    setIsScheduling(true);
    try {
      const response = await api.post('/dashboard/schedules', {
        engine: preset.engine,
        query: preset.query,
        location: preset.location,
        cronExpression: cronByPreset[preset._id] || CRON_PRESETS[2].value
      });
      if (!response?.success || !response.data) {
        throw new Error('The server did not create the schedule.');
      }
      setFeedback({ type: 'success', message: `Schedule created from "${preset.name}".` });
    } catch (requestError) {
      setFeedback({ type: 'error', message: requestError.message || 'Failed to create schedule.' });
    } finally {
      setIsScheduling(false);
    }
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Search tools</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Saved search presets</h1>
        <p className="mt-2 text-sm text-slate-400">
          Save common searches, queue them when needed, or create supported recurring schedules.
        </p>
      </header>

      {(error || feedback) && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback?.type === 'error' || (error && !feedback)
              ? 'border-rose-900/70 bg-rose-950/30 text-rose-300'
              : 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          {feedback?.message || error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-800 bg-[#0d1117] p-5">
        <h2 className="text-sm font-bold text-white">{editingId ? 'Edit preset' : 'Create a preset'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-400">
            Name
            <input
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              maxLength={80}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Source
            <select
              value={form.engine}
              onChange={(event) => setForm({ ...EMPTY_FORM, engine: event.target.value, name: form.name })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="amazon">Amazon Books</option>
              <option value="indeed">Indeed Jobs</option>
              <option value="booking">Booking.com</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400 sm:col-span-2">
            {form.engine === 'indeed' ? 'Job title or role' : form.engine === 'booking' ? 'Destination' : 'Search query'}
            <input
              value={form.query}
              onChange={(event) => setField('query', event.target.value)}
              maxLength={200}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          {form.engine === 'indeed' && (
            <label className="space-y-1 text-xs text-slate-400 sm:col-span-2">
              Location
              <input
                value={form.location}
                onChange={(event) => setField('location', event.target.value)}
                maxLength={200}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
          )}
          {form.engine === 'booking' && (
            <>
              <label className="space-y-1 text-xs text-slate-400">
                Check-in
                <input
                  type="date"
                  value={form.checkIn}
                  onChange={(event) => setField('checkIn', event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Check-out
                <input
                  type="date"
                  value={form.checkOut}
                  onChange={(event) => setField('checkOut', event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {editingId ? 'Save changes' : 'Save preset'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Your presets ({presets.length})</h2>
        {isLoading ? (
          <p className="rounded-xl border border-slate-800 p-6 text-sm text-slate-400">Loading presets...</p>
        ) : presets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">
            No saved presets yet.
          </p>
        ) : presets.map((preset) => (
          <article key={preset._id} className="space-y-4 rounded-xl border border-slate-800 bg-[#0d1117] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{preset.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {SOURCE_LABELS[preset.engine]}: {preset.query}
                  {preset.location ? ` · ${preset.location}` : ''}
                  {preset.checkIn ? ` · ${preset.checkIn} to ${preset.checkOut}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleRun(preset)}
                  className="rounded-lg border border-blue-900/60 px-3 py-1.5 text-xs text-blue-300 disabled:opacity-50"
                >
                  Run now
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleEdit(preset)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleDelete(preset)}
                  className="rounded-lg border border-rose-900/60 px-3 py-1.5 text-xs text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>

            {preset.engine === 'booking' ? (
              <p className="text-xs text-slate-500">Recurring Booking schedules are not supported.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                <label className="text-xs text-slate-500">
                  Repeat
                  <select
                    value={cronByPreset[preset._id] || CRON_PRESETS[2].value}
                    onChange={(event) => setCronByPreset((current) => ({
                      ...current,
                      [preset._id]: event.target.value
                    }))}
                    className="ml-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                  >
                    {CRON_PRESETS.map((cronPreset) => (
                      <option key={cronPreset.value} value={cronPreset.value}>{cronPreset.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isScheduling}
                  onClick={() => handleSchedule(preset)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
                >
                  Create schedule
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
