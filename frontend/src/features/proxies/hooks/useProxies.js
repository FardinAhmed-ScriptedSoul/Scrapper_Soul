import { useState, useEffect } from 'react';
import api from '../../../api/api';

export function useProxies() {
  const [proxyList, setProxyList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // Sync current proxy endpoints pool from the node cluster
  const fetchProxies = async () => {
    try {
      const response = await api.get('/proxies');
      setProxyList(response?.data || response || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to establish clear communication with the proxy backbone cluster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  // Action: Trigger real-time network ping test flush across endpoints
  const pingBackboneRelay = async () => {
    setIsPinging(true);
    try {
      const response = await api.post('/proxies/ping-all');
      const updatedList = response?.data || response;
      
      // Update local matrix values with fresh latency calculations
      if (Array.isArray(updatedList)) {
        setProxyList(updatedList);
      } else {
        // Fallback: reload whole pool if response structure varies
        await fetchProxies();
      }
    } catch (err) {
      console.error('[Proxy Backbone Interception Failure]', err);
      alert(`Mainframe warning: Network ping flush interrupted. ${err.message}`);
    } finally {
      setIsPinging(false);
    }
  };

  // Action: Bulk append proxy string list into storage matrix
  const bulkIngestProxies = async (rawTextPool) => {
    try {
      // Split clean IP entries by line breaks, removing blank rows
      const formattedArray = rawTextPool
        .split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

      if (formattedArray.length === 0) {
        throw new Error('Ingestion canceled: Input data buffer is empty.');
      }

      const response = await api.post('/proxies/bulk-ingest', { proxies: formattedArray });
      const currentPool = response?.data || response;
      
      setProxyList(currentPool);
      return currentPool;
    } catch (err) {
      throw err;
    }
  };

  return { proxyList, isLoading, error, isPinging, pingBackboneRelay, bulkIngestProxies };
}