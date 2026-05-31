import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/api.js';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/tasks');
      const resData = response?.data || response;
      setTasks(resData?.data || resData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to sync extraction task queues from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const controlTask = async (id, action) => {
    try {
      const response = await api.post('/dashboard/tasks/control', { jobId: id, action });
      const resData = response?.data || response;
      if (resData.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('[Task Control Fault Intercepted]', err);
      throw err;
    }
  };

  const exportTaskCSV = async (task) => {
    try {
      const engineRouteMap = {
        amazon:  `/scrape/amazon?query=${encodeURIComponent(task.query || '')}`,
        indeed:  `/scrape/indeed?role=${encodeURIComponent(task.query || '')}&location=${encodeURIComponent(task.location || '')}`,
        booking: `/scrape/booking?destination=${encodeURIComponent(task.query || '')}`
      };
      const route = engineRouteMap[task.engine];
      if (!route) return;

      const response = await api.get(route);
      const items = response?.data?.data || response?.data || [];
      if (items.length === 0) return alert('No data to export.');

      const headers = Object.keys(items[0]).join(',');
      const rows = items.map(item =>
        Object.values(item).map(v =>
          typeof v === 'string' ? `"${v.replace(/\"/g, '\"\"')}"` : v
        ).join(',')
      ).join('\n');
      const csv = `${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${task.engine}_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV Export failure:', err);
      alert('Failed to construct data file.');
    }
  };

  return { tasks, isLoading, error, refreshTasks: fetchTasks, controlTask, exportTaskCSV };
}

export default useTasks; // 🚀 Double safety fallback export