import { useState, useEffect } from 'react';
import api from '../../../api/api';

export function useSettings() {
  const [settings, setSettings] = useState({
    retentionDays: 30,
    maxConcurrency: 16,
    isWebhookEnabled: true,
    apiKey: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load the current infrastructure parameters from backend
  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const data = response?.data || response;
      
      setSettings({
        retentionDays: data?.retentionDays ?? 30,
        maxConcurrency: data?.maxConcurrency ?? 16,
        isWebhookEnabled: data?.isWebhookEnabled ?? true,
        apiKey: data?.apiKey ?? ''
      });
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

  // Action: Post modifications to server variables
  const saveSettings = async (updatedFields) => {
    setIsUpdating(true);
    try {
      const response = await api.put('/settings', updatedFields);
      const freshlySaved = response?.data || response;

      setSettings(prev => ({ ...prev, ...freshlySaved }));
      return freshlySaved;
    } catch (err) {
      console.error('[System Settings Core Save Fault]', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return { settings, setSettings, isLoading, error, isUpdating, saveSettings };
}