import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useRanking = () => {
  const [rankingTotal,       setRankingTotal]       = useState([]);
  const [rankingSemanal,     setRankingSemanal]     = useState([]);
  const [rankingAmigos,      setRankingAmigos]      = useState([]);
  const [rankingTotalBeers,  setRankingTotalBeers]  = useState([]);
  const [rankingAmigosBeers, setRankingAmigosBeers] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [currentUserId,      setCurrentUserId]      = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      const [totalRes, semanalRes, amigosRes, totalBeersRes, amigosBeersRes] = await Promise.all([
        supabase.rpc("get_ranking_global"),
        supabase.rpc("get_ranking_semanal"),
        supabase.rpc("get_ranking_amigos"),
        supabase.rpc("get_ranking_global_beers"),
        supabase.rpc("get_ranking_amigos_beers"),
      ]);

      setRankingTotal(totalRes.data             || []);
      setRankingSemanal(semanalRes.data         || []);
      setRankingAmigos(amigosRes.data           || []);
      setRankingTotalBeers(totalBeersRes.data   || []);
      setRankingAmigosBeers(amigosBeersRes.data || []);
      setLoading(false);
    };

    load();
  }, []);

  return {
    rankingTotal, rankingSemanal, rankingAmigos,
    rankingTotalBeers, rankingAmigosBeers,
    loading, currentUserId,
  };
};
