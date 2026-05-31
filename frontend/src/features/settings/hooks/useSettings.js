
import { useState, useEffect } from 'react';
import api from '../../../api/api';

export function useSettings() {
  const [settings, setSettings] = useState({
    retentionDays: 30,
    maxConcurrency: 16,
    isWebhookEnabled: true,
    apiKey: ''
  });
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/dashboard/settings');
      const resData = response?.data || response;
      const current = resData?.current || resData;

      const schedResponse = await api.get('/dashboard/schedules');
      const schedData = schedResponse?.data || schedResponse;
      
      setSettings({
        retentionDays: current?.retentionDays ?? 30,
        maxConcurrency: current?.maxConcurrency ?? 16,
        isWebhookEnabled: current?.isWebhookEnabled ?? true,
        apiKey: current?.apiKey ?? ''
      });
      
      setSchedules(schedData?.data || schedData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to retrieve cluster configuration parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (updatedFields) => {
    setIsUpdating(true);
    try {
      const response = await api.put('/dashboard/settings', updatedFields);
      const resData = response?.data || response;
      const current = resData?.current || resData;

      setSettings({
        retentionDays: current?.retentionDays ?? 30,
        maxConcurrency: current?.maxConcurrency ?? 16,
        isWebhookEnabled: current?.isWebhookEnabled ?? true,
        apiKey: current?.apiKey ?? ''
      });
    } catch (err) {
      console.error('Settings save failure:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const createSchedule = async ({ engine, query, location, cronExpression }) => {
    setIsUpdating(true);
    try {
      const response = await api.post('/dashboard/schedules', { engine, query, location, cronExpression });
      const newSchedule = response?.data?.data || response?.data;
      setSchedules(prev => [newSchedule, ...prev]);
      return newSchedule;
    } catch (err) {
      console.error('[useSettings] createSchedule fault:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSchedule = async (id, isActive) => {
    try {
      const response = await api.put(`/dashboard/schedules/${id}`, { isActive });
      const updated = response?.data?.data || response?.data;
      setSchedules(prev => prev.map(s => s._id === id ? updated : s));
    } catch (err) {
      console.error('[useSettings] toggleSchedule fault:', err);
      throw err;
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await api.delete(`/dashboard/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('[useSettings] deleteSchedule fault:', err);
      throw err;
    }
  };

  return {
    settings,
    setSettings,
    schedules,
    isLoading,
    error,
    isUpdating,
    saveSettings,
    createSchedule,
    toggleSchedule,
    deleteSchedule
  };
}

export default useSettings; // 🚀 Double safety fallback export