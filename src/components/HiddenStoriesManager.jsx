import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import Avatar from "./Avatar";

const HiddenStoriesManager = ({ currentUserId }) => {
  const { t } = useTranslation();
  const [friends,    setFriends]    = useState([]);
  const [hiddenSet,  setHiddenSet]  = useState(new Set());
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState(null); // userId en transición

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    // IDs de amigos (friendships es bidireccional, row = user_id → friend_id)
    const { data: friendships } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", currentUserId);

    const friendIds = (friendships || []).map((f) => f.friend_id);

    if (friendIds.length === 0) {
      setFriends([]);
      setHiddenSet(new Set());
      setLoading(false);
      return;
    }

    // Perfiles + lista ocultos en paralelo
    const [{ data: profiles }, { data: hidden }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombre, avatar_url")
        .in("id", friendIds),
      supabase
        .from("story_hidden_from")
        .select("hidden_user_id")
        .eq("owner_id", currentUserId),
    ]);

    setFriends(profiles || []);
    setHiddenSet(new Set((hidden || []).map((h) => h.hidden_user_id)));
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const toggleHidden = async (friendId) => {
    if (toggling) return;
    setToggling(friendId);

    const isHidden = hiddenSet.has(friendId);

    // Actualización optimista
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (isHidden) next.delete(friendId);
      else next.add(friendId);
      return next;
    });

    if (isHidden) {
      await supabase
        .from("story_hidden_from")
        .delete()
        .eq("owner_id", currentUserId)
        .eq("hidden_user_id", friendId);
    } else {
      await supabase
        .from("story_hidden_from")
        .insert({ owner_id: currentUserId, hidden_user_id: friendId });
    }

    setToggling(null);
  };

  if (loading) {
    return <p style={{ color: "#5a4535", fontSize: 13, margin: 0 }}>
      {t("settings.privacy.hiddenStories.loading")}
    </p>;
  }

  if (friends.length === 0) {
    return (
      <div style={emptyStyle}>
        <p style={{ color: "#5a4535", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          {t("settings.privacy.hiddenStories.noFriends")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {friends.map((friend) => {
        const isHidden = hiddenSet.has(friend.id);
        return (
          <div key={friend.id} style={rowStyle}>
            <Avatar avatarUrl={friend.avatar_url} nombre={friend.nombre} size={36} />
            <span style={{ flex: 1, fontSize: 14, color: "#f0e4cc", marginLeft: 10 }}>
              {friend.nombre}
            </span>
            <button
              onClick={() => toggleHidden(friend.id)}
              disabled={!!toggling}
              style={{
                ...toggleBtnBase,
                background:  isHidden ? "rgba(139,32,32,0.2)"   : "#2a1e0f",
                border:      `1px solid ${isHidden ? "#8b2020" : "#2e2215"}`,
                color:       isHidden ? "#c07a3f"                : "#9a7d62",
                opacity:     toggling === friend.id ? 0.5 : 1,
              }}
            >
              {isHidden
                ? t("settings.privacy.hiddenStories.show")
                : t("settings.privacy.hiddenStories.hide")}
            </button>
          </div>
        );
      })}

      {hiddenSet.size > 0 && (
        <p style={{ fontSize: 12, color: "#5a4535", marginTop: 12, lineHeight: 1.5 }}>
          {t("settings.privacy.hiddenStories.note", { count: hiddenSet.size })}
        </p>
      )}
    </div>
  );
};

const rowStyle = {
  display:       "flex",
  alignItems:    "center",
  padding:       "10px 0",
  borderBottom:  "1px solid #2e2215",
};

const toggleBtnBase = {
  padding:      "5px 14px",
  borderRadius: 20,
  fontSize:     12,
  fontWeight:   600,
  cursor:       "pointer",
  transition:   "all 0.15s",
  whiteSpace:   "nowrap",
};

const emptyStyle = {
  padding:      "14px 16px",
  background:   "#1c1409",
  borderRadius: 8,
  border:       "1px solid #2e2215",
};

export default HiddenStoriesManager;
