import { useState, useCallback } from 'react';
import api from '../../../api/api.js';

export const useScrappers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);

  // --- 1. Amazon Inventory Scraper Execution Pipeline ---
  const runAmazonScraper = useCallback(async (searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/scrape/amazon', {
        params: { query: searchQuery }
      });
      const dataArray = response?.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.data?.error || err.message || "Amazon cluster automation fault.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- 2. Indeed Jobs Scraper Execution Pipeline ---
  const runIndeedScraper = useCallback(async (role, location) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/scrape/indeed', {
        params: { role, location }
      });
      const dataArray = response?.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.data?.error || err.message || "Indeed target aggregation error.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- 3. Booking Engine Scraper Execution Pipeline ---
  const runBookingScraper = useCallback(async (destination, checkIn, checkOut) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/scrape/booking', {
        params: { destination, checkIn, checkOut }
      });
      const dataArray = response?.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.data?.error || err.message || "Booking timeline verification rejected.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- 4. Live News Feed Ingestion Pipeline ---
  const fetchNewsFeed = useCallback(async (categoryName) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/feed', {
        params: { category: categoryName }
      });
      const dataArray = response?.data || [];
      setNewsFeed(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.data?.error || err.message || "Failed to sync platform news intelligence maps.";
      setError(msg);
      setNewsFeed([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    results,
    newsFeed,
    runAmazonScraper,
    runIndeedScraper,
    runBookingScraper,
    fetchNewsFeed,
    setResults
  };
};