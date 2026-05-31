import { useState, useEffect } from 'react';
import api from '../../../api/api.js';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to load tasks from the database
  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      // Extract array based on your standard API response structure
      setTasks(response?.data || response || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to sync extraction task queues from server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Action: Modify a running task state (pause, resume, kill)
  const controlTask = async (id, action) => {
    try {
      const response = await api.post(`/tasks/${id}/control`, { action });
      const updatedTask = response?.data || response;

      // Optimistically update the local component state tree
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === id ? { ...task, ...updatedTask } : task))
      );
      return updatedTask;
    } catch (err) {
      console.error(`[Task Controller Fault] Action: ${action} on ID: ${id}`, err);
      throw err;
    }
  };

  // Action: Deploy a brand-new scraper workflow
  const deployTask = async (taskConfig) => {
    try {
      const response = await api.post('/tasks/deploy', taskConfig);
      const newTask = response?.data || response;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      throw err;
    }
  };

  return { tasks, isLoading, error, controlTask, deployTask, refreshTasks: fetchTasks };
}