import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useBeers = () => {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBeers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('beers_new')
          .select('*')
          .order('nombre', { ascending: true });

        if (error) throw error;
        setBeers(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBeers();
  }, []);

  return { beers, loading, error };
};
