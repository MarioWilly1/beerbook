import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

// Ranking dentro de una liga de Prestigio (league = valor de profiles.prestige
// a mirar). Se refetchea cada vez que cambia la liga seleccionada.
export const useRanking = (league) => {
  const [rankingTotal,       setRankingTotal]       = useState([]);
  const [rankingSemanal,     setRankingSemanal]     = useState([]);
  const [rankingAmigos,      setRankingAmigos]      = useState([]);
  const [rankingTotalBeers,  setRankingTotalBeers]  = useState([]);
  const [rankingAmigosBeers, setRankingAmigosBeers] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [currentUserId,      setCurrentUserId]      = useState(null);

  useEffect(() => {
    if (league == null) return;

    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      const [totalRes, semanalRes, amigosRes, totalBeersRes, amigosBeersRes] = await Promise.all([
        supabase.rpc("get_ranking_global",       { p_prestige: league }),
        supabase.rpc("get_ranking_semanal",      { p_prestige: league }),
        supabase.rpc("get_ranking_amigos",       { p_prestige: league }),
        supabase.rpc("get_ranking_global_beers", { p_prestige: league }),
        supabase.rpc("get_ranking_amigos_beers", { p_prestige: league }),
      ]);

      setRankingTotal(totalRes.data             || []);
      setRankingSemanal(semanalRes.data         || []);
      setRankingAmigos(amigosRes.data           || []);
      setRankingTotalBeers(totalBeersRes.data   || []);
      setRankingAmigosBeers(amigosBeersRes.data || []);
      setLoading(false);
    };

    load();
  }, [league]);

  return {
    rankingTotal, rankingSemanal, rankingAmigos,
    rankingTotalBeers, rankingAmigosBeers,
    loading, currentUserId,
  };
};

// Qué ligas de Prestigio existen realmente (con gente adentro), para el
// selector — evita ofrecer una liga vacía.
export const useLeagues = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_active_prestige_leagues").then(({ data }) => {
      setLeagues(data || []);
      setLoading(false);
    });
  }, []);

  return { leagues, loading };
};
