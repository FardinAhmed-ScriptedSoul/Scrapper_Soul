import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/api.js';

const PAGE_SIZE = 20;

export function useSavedResults() {
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    source: 'all',
    q: '',
    from: '',
    to: '',
    sort: 'newest'
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      const response = await api.get('/results', {
        params: { ...filters, page, limit: PAGE_SIZE }
      });
      if (!response?.success || !Array.isArray(response.data) || !response.pagination) {
        throw new Error('The server returned an invalid saved-results response.');
      }

      setResults(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load saved results.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    // The effect starts asynchronous loading; state updates follow the HTTP response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults();
  }, [fetchResults]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const changePage = (nextPage) => setPage(nextPage);

  return {
    results,
    pagination,
    filters,
    isLoading,
    error,
    applyFilters,
    changePage
  };
}

export default useSavedResults;
