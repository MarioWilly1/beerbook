import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useTotalUnread = () => {
  const [totalUnread, setTotalUnread] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_conversations");
    if (data) {
      setTotalUnread(data.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("unread-badge-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  return totalUnread;
};
