import { useState } from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true;

const BACKEND_BASE_URL = 'http://localhost:3000';

export const useScrappers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [currentEngine, setCurrentEngine] = useState('amazon');

  // --- 1. Amazon Inventory Scraper Execution Pipeline ---
  const runAmazonScraper = async (searchQuery) => {
    setIsLoading(true);
    setError(null);
    setCurrentEngine('amazon'); // Synchronous tracking alignment
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/v1/scrape/amazon`, {
        params: { query: searchQuery }
      });
      const dataArray = response.data.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.response?.data?.error || "Amazon cluster automation fault.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Indeed Jobs Scraper Execution Pipeline ---
  const runIndeedScraper = async (role, location) => {
    setIsLoading(true);
    setError(null);
    setCurrentEngine('indeed'); // Synchronous tracking alignment
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/v1/scrape/indeed`, {
        params: { role, location }
      });
      const dataArray = response.data.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.response?.data?.error || "Indeed target aggregation error.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. Booking Engine Scraper Execution Pipeline ---
  const runBookingScraper = async (destination, checkIn, checkOut) => {
    setIsLoading(true);
    setError(null);
    setCurrentEngine('booking'); // Synchronous tracking alignment
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/v1/scrape/booking`, {
        params: { destination, checkIn, checkOut }
      });
      const dataArray = response.data.data || [];
      setResults(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.response?.data?.error || "Booking timeline verification rejected.";
      setError(msg);
      setResults([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. Live News Feed Ingestion Pipeline ---
  const fetchNewsFeed = async (categoryName) => {
    setIsLoading(true);
    setError(null);
    setCurrentEngine('news'); // Synchronous tracking alignment
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/v1/feed`, {
        params: { category: categoryName }
      });
      const dataArray = response.data.data || [];
      setNewsFeed(dataArray);
      return dataArray;
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to sync platform news intelligence maps.";
      setError(msg);
      setNewsFeed([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    results,
    newsFeed,
    currentEngine,
    setCurrentEngine,
    runAmazonScraper,
    runIndeedScraper,
    runBookingScraper,
    fetchNewsFeed,
    setResults,
    setNewsFeed
  };
};