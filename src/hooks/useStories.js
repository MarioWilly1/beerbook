import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

// Genera una signed URL de 1 hora para una foto de historia privada
export const getSignedStoryUrl = async (photoPath) => {
  const { data, error } = await supabase.storage
    .from("stories")
    .createSignedUrl(photoPath, 3600);
  if (error) return null;
  return data.signedUrl;
};

export const useStories = () => {
  const [myGroup,       setMyGroup]       = useState(null);
  const [friendGroups,  setFriendGroups]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const seenIds = useRef(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async (uid) => {
    if (!uid) return;
    setLoading(true);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Stories + perfil propio en paralelo
    //    Sin embedded join "profiles(...)" para evitar dependencia del schema cache
    const [
      { data: rows, error: storiesErr },
      { data: myProfile },
    ] = await Promise.all([
      supabase
        .from("stories")
        .select("id, user_id, type, photo_path, text_content, text_bg, created_at")
        .gt("created_at", cutoff)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("nombre, avatar_url")
        .eq("id", uid)
        .single(),
    ]);

    if (storiesErr) {
      console.error("[useStories] stories query error:", storiesErr.message, storiesErr);
    }

    // 2. Perfiles de todos los autores en un solo query batch
    const uniqueUserIds = [...new Set((rows || []).map((r) => r.user_id))];
    const profilesMap = {};
    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, nombre, avatar_url")
        .in("id", uniqueUserIds);
      if (profilesErr) {
        console.error("[useStories] profiles query error:", profilesErr.message);
      }
      (profiles || []).forEach((p) => { profilesMap[p.id] = p; });
    }

    // 3. Qué historias ya vio el usuario actual
    const storyIds = (rows || []).map((r) => r.id);
    const localSeen = new Set(seenIds.current);
    if (storyIds.length > 0) {
      const { data: myViews } = await supabase
        .from("story_views")
        .select("story_id")
        .in("story_id", storyIds)
        .eq("viewer_id", uid);
      (myViews || []).forEach((v) => localSeen.add(v.story_id));
      seenIds.current = localSeen;
    }

    // 4. Agrupar por user_id
    const groups = {};
    for (const row of rows || []) {
      const profile = profilesMap[row.user_id];
      if (!groups[row.user_id]) {
        groups[row.user_id] = {
          userId:    row.user_id,
          nombre:    profile?.nombre     || "?",
          avatarUrl: profile?.avatar_url || null,
          stories:   [],
        };
      }
      groups[row.user_id].stories.push(row);
    }

    // 5. hasUnseen por grupo
    for (const g of Object.values(groups)) {
      g.hasUnseen = g.stories.some((s) => !localSeen.has(s.id));
    }

    // 6. Grupo propio
    const mine = groups[uid] ?? {
      userId:    uid,
      nombre:    myProfile?.nombre     || "Yo",
      avatarUrl: myProfile?.avatar_url || null,
      stories:   [],
      hasUnseen: false,
    };

    // 7. Grupos de amigos: no vistos primero, luego por historia más reciente
    const friends = Object.values(groups)
      .filter((g) => g.userId !== uid)
      .sort((a, b) => {
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
        const aT = a.stories.at(-1)?.created_at ?? "";
        const bT = b.stories.at(-1)?.created_at ?? "";
        return bT.localeCompare(aT);
      });

    setMyGroup(mine);
    setFriendGroups(friends);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUserId) load(currentUserId);
  }, [currentUserId, load]);

  const markSeen = useCallback(async (storyId, storyOwnerId) => {
    if (seenIds.current.has(storyId) || !currentUserId) return;
    seenIds.current.add(storyId);

    const updateGroup = (g) => {
      if (!g.stories.some((s) => s.id === storyId)) return g;
      return { ...g, hasUnseen: g.stories.some((s) => !seenIds.current.has(s.id)) };
    };
    setMyGroup((prev)      => prev ? updateGroup(prev) : prev);
    setFriendGroups((prev) => prev.map(updateGroup));

    // No registrar vista propia (no contamina el contador "visto por")
    if (storyOwnerId !== currentUserId) {
      await supabase
        .from("story_views")
        .insert({ story_id: storyId, viewer_id: currentUserId });
    }
  }, [currentUserId]);

  return {
    myGroup,
    friendGroups,
    loading,
    currentUserId,
    markSeen,
    reload: () => load(currentUserId),
  };
};
