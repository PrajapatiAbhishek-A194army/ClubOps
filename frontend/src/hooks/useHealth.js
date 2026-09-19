import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

export function useHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await checkHealth();
      setHealth(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return { health, loading, error, refetch: fetchHealth };
}
