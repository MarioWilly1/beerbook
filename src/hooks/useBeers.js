import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export const useBeers = () => {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // `silent` — usado por el pull-to-refresh nativo: refresca los datos sin
  // tocar `loading`, así la lista actual queda visible en vez de tapada por
  // el estado de carga inicial.
  const fetchBeers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('beers_new')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setBeers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBeers(); }, [fetchBeers]);

  return { beers, loading, error, refetch: fetchBeers };
};
