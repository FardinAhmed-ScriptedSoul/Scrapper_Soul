import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/api';

export function useProxies() {
  const [proxyList, setProxyList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProxies = useCallback(async () => {
    try {
      // 🚀 FIX: Path now targets your versioned dashboard subrouter prefix
      const response = await api.get('/dashboard/proxies');
      const data = response?.data?.data || response?.data || [];
      setProxyList(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to map proxies.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  return { proxyList, isLoading, error, refreshProxies: fetchProxies };
}