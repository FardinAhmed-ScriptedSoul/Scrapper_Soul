import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/api.js';

export function useTelemetry(pollInterval = 4000) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/telemetry');
      if (!response?.success || !response.recordsBySource || !response.systemHealth) {
        throw new Error('The server returned incomplete overview data.');
      }

      setData(response);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load overview data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, pollInterval);
    return () => clearInterval(intervalId);
  }, [fetchTelemetry, pollInterval]);

  return { data, isLoading, error, refresh: fetchTelemetry };
}

export default useTelemetry;
