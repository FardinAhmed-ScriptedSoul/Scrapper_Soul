import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/api.js';

export function useSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/schedules');
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error('The server returned an invalid schedules response.');
      }
      setSchedules(response.data);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load schedules.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (schedule) => {
    setIsUpdating(true);
    try {
      const response = await api.post('/dashboard/schedules', schedule);
      if (!response?.success || !response.data) {
        throw new Error('The server did not create the schedule.');
      }
      setSchedules((current) => [response.data, ...current]);
      setError(null);
      return response.data;
    } catch (requestError) {
      setError(requestError.message || 'Failed to create schedule.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSchedule = async (id, isActive) => {
    setIsUpdating(true);
    try {
      const response = await api.put(`/dashboard/schedules/${id}`, { isActive });
      if (!response?.success || !response.data) {
        throw new Error('The server did not update the schedule.');
      }
      setSchedules((current) => current.map((schedule) =>
        schedule._id === id ? response.data : schedule
      ));
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to update schedule.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSchedule = async (id) => {
    setIsUpdating(true);
    try {
      const response = await api.delete(`/dashboard/schedules/${id}`);
      if (!response?.success) {
        throw new Error('The server did not delete the schedule.');
      }
      setSchedules((current) => current.filter((schedule) => schedule._id !== id));
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to delete schedule.');
      throw requestError;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    schedules,
    isLoading,
    isUpdating,
    error,
    refreshSchedules: fetchSchedules,
    createSchedule,
    toggleSchedule,
    deleteSchedule
  };
}
