import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/api.js';

const DEFAULT_PREFERENCES = {
  enabled: false,
  events: { completed: true, failed: true }
};

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await api.get('/notifications/preferences');
      if (!response?.success || !response.data?.events) {
        throw new Error('The server returned invalid notification preferences.');
      }
      setPreferences(response.data);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load notification preferences.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreferences();
  }, [loadPreferences]);

  const updateEvent = (eventName, checked) => {
    setPreferences((current) => ({
      ...current,
      events: { ...current.events, [eventName]: checked }
    }));
    setSaved(false);
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSaved(false);
    try {
      const response = await api.put('/notifications/preferences', preferences);
      if (!response?.success || !response.data) {
        throw new Error('The server did not save notification preferences.');
      }
      setPreferences(response.data);
      setError(null);
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || 'Failed to save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Preferences</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Job notifications</h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose whether to receive email when one of your queued scraper jobs finishes.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Notification preferences saved.
        </div>
      )}

      {isLoading ? (
        <p className="rounded-xl border border-slate-800 bg-[#0d1117] p-6 text-sm text-slate-400">
          Loading notification preferences...
        </p>
      ) : (
        <form onSubmit={savePreferences} className="space-y-5 rounded-xl border border-slate-800 bg-[#0d1117] p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(event) => {
                setPreferences((current) => ({ ...current, enabled: event.target.checked }));
                setSaved(false);
              }}
              className="mt-1 accent-blue-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">Email me about my jobs</span>
              <span className="mt-1 block text-xs text-slate-500">
                Notifications are off until you opt in. Messages go to the email address on your account.
              </span>
            </span>
          </label>

          <div className={`space-y-3 border-l border-slate-800 pl-6 ${preferences.enabled ? '' : 'opacity-50'}`}>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.events.completed}
                disabled={!preferences.enabled}
                onChange={(event) => updateEvent('completed', event.target.checked)}
                className="accent-blue-500"
              />
              Job completed successfully
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.events.failed}
                disabled={!preferences.enabled}
                onChange={(event) => updateEvent('failed', event.target.checked)}
                className="accent-blue-500"
              />
              Job failed after its retry attempts
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save preferences'}
          </button>
        </form>
      )}
    </section>
  );
}
