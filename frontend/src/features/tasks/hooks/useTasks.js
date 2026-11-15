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
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const params = new URLSearchParams();
    if (task.engine === 'amazon') {
      params.set('query', task.query);
    } else if (task.engine === 'indeed') {
      params.set('role', task.query);
      params.set('location', task.location);
    } else if (task.engine === 'booking' && task.checkIn && task.checkOut) {
      params.set('destination', task.query);
      params.set('checkIn', task.checkIn);
      params.set('checkOut', task.checkOut);
    } else {
      throw new Error('This task does not have enough search details to export.');
    }

    const response = await api.get(`/scrape/${task.engine}?${params.toString()}`);
    const items = response?.data;
    if (!Array.isArray(items)) throw new Error('The server returned an invalid dataset.');
    if (items.length === 0) throw new Error('No saved data is available for this task.');

    const columns = Object.keys(items[0]);
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
      columns.map(escapeCell).join(','),
      ...items.map((item) => columns.map((column) => escapeCell(item[column])).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${task.engine}_export_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return { tasks, isLoading, error, refreshTasks: fetchTasks, controlTask, exportTaskCSV };
}

export default useTasks; // 🚀 Double safety fallback export