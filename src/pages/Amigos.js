import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { useFriends } from "../hooks/useFriends";
import { checkSocialAchievements } from "../utils/achievements";
import { useUserStats } from "../hooks/useUserStats";
import Avatar from "../components/Avatar";

const Amigos = () => {
  const { t } = useTranslation();
  const { friends, sentRequests, receivedRequests, loading, sendRequest, acceptRequest, rejectRequest, removeFriend } = useFriends();
  const { refetch: refetchStats } = useUserStats();
  const [searchTerm, setSearchTerm]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [actionMsg, setActionMsg]       = useState("");

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    const { data } = await supabase.rpc("search_users", { search_term: searchTerm.trim() });
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  const getUserStatus = (userId) => {
    if (friends.some((f) => f.id === userId))          return "friend";
    if (sentRequests.some((r) => r.id === userId))     return "sent";
    if (receivedRequests.some((r) => r.id === userId)) return "received";
    return "none";
  };

  const handleSend = async (userId) => {
    await sendRequest(userId);
    flash(t("friends.requestSent"));
  };

  const handleAccept = async (fromUserId) => {
    await acceptRequest(fromUserId);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const newAch = await checkSocialAchievements(session.user.id);
      if (newAch.length > 0) {
        let msg = `${t("friends.achievementUnlocked")}\n`;
        newAch.forEach((a) => { msg += `${a.emoji} ${a.nombre} (+${a.xpBonus} XP)\n`; });
        alert(msg.trim());
        refetchStats();
      }
    }
    flash(t("friends.nowFriends"));
  };

  const handleReject = async (fromUserId) => {
    await rejectRequest(fromUserId);
    flash(t("friends.requestRejected"));
  };

  const handleRemove = async (friendId) => {
    if (!window.confirm(t("friends.confirmRemove"))) return;
    await removeFriend(friendId);
    flash(t("friends.friendRemoved"));
  };

  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  if (loading) return <p style={{ padding: 24 }}>{t("friends.loading")}</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>👥 {t("friends.title")}</h2>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px" }}>
        {t("friends.count", { count: friends.length })}
      </p>

      {actionMsg && <div style={flashStyle}>{actionMsg}</div>}

      {/* Solicitudes recibidas */}
      {receivedRequests.length > 0 && (
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>
            {t("friends.receivedRequests")}
            <span style={badgeStyle}>{receivedRequests.length}</span>
          </h3>
          {receivedRequests.map((req) => (
            <div key={req.id} style={rowStyle}>
              <Avatar avatarUrl={req.avatar_url} nombre={req.nombre} size={36} />
              <span style={{ flex: 1, fontWeight: 600 }}>{req.nombre}</span>
              <button onClick={() => handleAccept(req.id)} style={btnGreen}>{t("friends.accept")}</button>
              <button onClick={() => handleReject(req.id)} style={btnGray}>{t("friends.reject")}</button>
            </div>
          ))}
        </section>
      )}

      {/* Buscador */}
      <section style={sectionStyle}>
        <h3 style={sectionTitle}>{t("friends.searchTitle")}</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("friends.searchPlaceholder")}
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={searching} style={btnGold}>
            {searching ? "..." : t("friends.searchBtn")}
          </button>
        </div>

        {searchResults.length === 0 && searchTerm && !searching && (
          <p style={{ color: "#bbb", fontSize: 13 }}>{t("friends.noResults", { term: searchTerm })}</p>
        )}

        {searchResults.map((user) => {
          const status = getUserStatus(user.id);
          return (
            <div key={user.id} style={rowStyle}>
              <Avatar avatarUrl={user.avatar_url} nombre={user.nombre} size={36} />
              <span style={{ flex: 1, fontWeight: 600 }}>{user.nombre}</span>
              {status === "friend"   && <span style={chipGreen}>✓ {t("friends.statusFriends")}</span>}
              {status === "sent"     && <span style={chipGray}>{t("friends.statusSent")}</span>}
              {status === "received" && <button onClick={() => handleAccept(user.id)} style={btnGreen}>{t("friends.accept")}</button>}
              {status === "none"     && <button onClick={() => handleSend(user.id)} style={btnGold}>{t("friends.addBtn")}</button>}
            </div>
          );
        })}
      </section>

      {/* Mis amigos */}
      <section style={sectionStyle}>
        <h3 style={sectionTitle}>{t("friends.myFriends")}</h3>
        {friends.length === 0 ? (
          <p style={{ color: "#bbb", fontSize: 13 }}>{t("friends.empty")}</p>
        ) : (
          friends.map((f) => (
            <div key={f.id} style={rowStyle}>
              <Avatar avatarUrl={f.avatar_url} nombre={f.nombre} size={36} />
              <span style={{ flex: 1, fontWeight: 600 }}>{f.nombre}</span>
              <button onClick={() => handleRemove(f.id)} style={btnDanger}>{t("friends.removeBtn")}</button>
            </div>
          ))
        )}
      </section>

      {/* Solicitudes enviadas */}
      {sentRequests.length > 0 && (
        <section style={{ ...sectionStyle, opacity: 0.7 }}>
          <h3 style={sectionTitle}>{t("friends.sentRequests", { count: sentRequests.length })}</h3>
          {sentRequests.map((r) => (
            <div key={r.id} style={rowStyle}>
              <Avatar avatarUrl={r.avatar_url} nombre={r.nombre} size={36} />
              <span style={{ flex: 1, fontWeight: 600 }}>{r.nombre}</span>
              <span style={chipGray}>{t("friends.pending")}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

const sectionStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px", marginBottom: 20 };
const sectionTitle = { margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#333", display: "flex", alignItems: "center", gap: 8 };
const rowStyle     = { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f5f5f5" };
const inputStyle   = { flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 };
const flashStyle   = { background: "#d5f5e3", border: "1px solid #2ecc71", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 14, color: "#1e8449" };
const badgeStyle   = { background: "#e74c3c", color: "#fff", borderRadius: "50%", fontSize: 11, fontWeight: 700, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const chipGreen    = { fontSize: 12, color: "#1e8449", fontWeight: 600, background: "#d5f5e3", padding: "3px 10px", borderRadius: 20 };
const chipGray     = { fontSize: 12, color: "#888", background: "#f5f5f5", padding: "3px 10px", borderRadius: 20 };
const btnGold      = { padding: "6px 14px", background: "#d4af37", color: "#111", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" };
const btnGreen     = { padding: "6px 14px", background: "#1e8449", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" };
const btnGray      = { padding: "6px 14px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" };
const btnDanger    = { padding: "6px 14px", background: "#fde8e8", color: "#c0392b", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" };

export default Amigos;
