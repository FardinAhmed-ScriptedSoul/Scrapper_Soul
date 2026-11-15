import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/api.js';

export function useFeedStatus() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/feeds');
      if (!response?.success || !Array.isArray(response.data?.sources)) {
        throw new Error('The server returned invalid feed status data.');
      }
      setStatus(response.data);
      setStatusError(null);
    } catch (requestError) {
      setStatusError(requestError.message || 'Failed to load feed status.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, [fetchStatus]);

  const refreshFeeds = async () => {
    setIsRefreshing(true);
    setMessage(null);
    setRefreshError(null);
    try {
      const response = await api.post('/feeds/refresh');
      if (!response?.success) throw new Error('The server did not start a feed refresh.');
      setMessage(response.message || 'Feed refresh started.');
      await fetchStatus();
    } catch (requestError) {
      setRefreshError(requestError.message || 'Failed to start feed refresh.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    status,
    isLoading,
    isRefreshing,
    error: refreshError || statusError,
    message,
    refreshFeeds
  };
}

export default useFeedStatus;
