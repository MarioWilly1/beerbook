import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

export const useChat = (conversationId) => {
  const [messages, setMessages]         = useState([]);
  const [otherUser, setOtherUser]       = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading]           = useState(true);
  const profilesRef                     = useRef({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id;

    // Load messages and participants in parallel
    const [{ data: msgs }, { data: parts }] = await Promise.all([
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, type, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100),
      supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId),
    ]);

    const participantIds = (parts || []).map((p) => p.user_id);

    // Batch-fetch profiles (avoids PostgREST join cache issues)
    if (participantIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nombre, avatar_url")
        .in("id", participantIds);
      (profiles || []).forEach((p) => { profilesRef.current[p.id] = p; });
      const other = (profiles || []).find((p) => p.id !== me);
      setOtherUser(other || null);
    }

    setMessages((msgs || []).map((m) => ({ ...m, sender: profilesRef.current[m.sender_id] || null })));
    setLoading(false);

    // Mark as read on open
    await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    load();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const msg = payload.new;
        let sender = profilesRef.current[msg.sender_id];
        if (!sender) {
          const { data } = await supabase
            .from("profiles")
            .select("id, nombre, avatar_url")
            .eq("id", msg.sender_id)
            .single();
          if (data) { profilesRef.current[data.id] = data; sender = data; }
        }
        const enriched = { ...msg, sender };
        setMessages((prev) => {
          if (prev.some((m) => m.id === enriched.id)) return prev;
          return [...prev, enriched];
        });
        // Mark as read while the chat is open
        supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId, load]);

  const sendMessage = useCallback(async (content) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !content.trim()) return false;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      type: "text",
      content: content.trim(),
    });
    return !error;
  }, [conversationId]);

  return { messages, otherUser, currentUserId, loading, sendMessage };
};
