import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../constants';

export default function useApi(path, { autoRefresh = false, refreshInterval = 30000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await apiFetch(path);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const payload = await response.json();
      setData(payload);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setData(null);
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, load]);

  return { data, loading, error, reload: load };
}
