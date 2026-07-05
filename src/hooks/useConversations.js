import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error) {
      console.error("[useConversations] get_my_conversations:", error);
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Refresh list when any new message arrives in our conversations (RLS filters to ours)
    const channel = supabase
      .channel("convs-list-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [load]);

  return { conversations, loading, reload: load };
};
