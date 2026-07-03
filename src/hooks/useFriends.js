import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useFriends = () => {
  const [friends, setFriends]                   = useState([]);
  const [sentRequests, setSentRequests]         = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading]                   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;

    const [fsRes, sentRes, rcvRes] = await Promise.all([
      supabase.from("friendships").select("friend_id").eq("user_id", uid),
      supabase.from("friendship_requests").select("receiver_id").eq("sender_id", uid),
      supabase.from("friendship_requests").select("sender_id, created_at").eq("receiver_id", uid),
    ]);

    const friendIds   = (fsRes.data   || []).map((r) => r.friend_id);
    const receiverIds = (sentRes.data || []).map((r) => r.receiver_id);
    const senderData  = rcvRes.data   || [];
    const senderIds   = senderData.map((r) => r.sender_id);

    const allIds = [...new Set([...friendIds, ...receiverIds, ...senderIds])];
    let profileMap = {};
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, nombre, avatar_url").in("id", allIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    const resolve = (id) => ({
      id,
      nombre:     profileMap[id]?.nombre     || "Usuario",
      avatar_url: profileMap[id]?.avatar_url || null,
    });

    setFriends(friendIds.map(resolve));
    setSentRequests(receiverIds.map(resolve));
    setReceivedRequests(
      senderData.map((r) => ({ ...resolve(r.sender_id), created_at: r.created_at }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendRequest = async (toUserId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("friendship_requests").insert({
      sender_id: session.user.id,
      receiver_id: toUserId,
    });
    await load();
  };

  const acceptRequest = async (fromUserId) => {
    await supabase.rpc("accept_friend_request", { p_sender_id: fromUserId });
    await load();
    return fromUserId;
  };

  const rejectRequest = async (fromUserId) => {
    await supabase.rpc("reject_friend_request", { p_sender_id: fromUserId });
    await load();
  };

  const removeFriend = async (friendId) => {
    await supabase.rpc("remove_friend", { p_friend_id: friendId });
    await load();
  };

  return {
    friends, sentRequests, receivedRequests, loading,
    refetch: load, sendRequest, acceptRequest, rejectRequest, removeFriend,
  };
};
