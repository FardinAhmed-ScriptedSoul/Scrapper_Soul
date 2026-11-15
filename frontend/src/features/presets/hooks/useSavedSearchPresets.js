import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/api.js';

export function useSavedSearchPresets() {
  const [presets, setPresets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchPresets = useCallback(async () => {
    try {
      const response = await api.get('/presets');
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error('The server returned an invalid presets response.');
      }
      setPresets(response.data);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load saved presets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPresets();
  }, [fetchPresets]);

  const savePreset = async (preset, id) => {
    setIsUpdating(true);
    try {
      const response = id
        ? await api.put(`/presets/${id}`, preset)
        : await api.post('/presets', preset);
      if (!response?.success || !response.data) {
        throw new Error('The server did not save the preset.');
      }
      setPresets((current) => id
        ? current.map((item) => item._id === id ? response.data : item)
        : [response.data, ...current]);
      setError(null);
      return response.data;
    } catch (requestError) {
      setError(requestError.message || 'Failed to save the preset.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  const deletePreset = async (id) => {
    setIsUpdating(true);
    try {
      const response = await api.delete(`/presets/${id}`);
      if (!response?.success) throw new Error('The server did not delete the preset.');
      setPresets((current) => current.filter((preset) => preset._id !== id));
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to delete the preset.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  const runPreset = async (id) => {
    setIsUpdating(true);
    try {
      const response = await api.post(`/presets/${id}/run`);
      if (!response?.success || !response.data?.jobId) {
        throw new Error('The server did not queue the preset.');
      }
      setError(null);
      return response.data;
    } catch (requestError) {
      setError(requestError.message || 'Failed to queue the preset.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    presets,
    isLoading,
    isUpdating,
    error,
    savePreset,
    deletePreset,
    runPreset
  };
}

export default useSavedSearchPresets;
