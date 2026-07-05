import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConversations } from "../hooks/useConversations";
import Avatar from "../components/Avatar";

function formatTime(ts) {
  if (!ts) return "";
  const d    = new Date(ts);
  const now  = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days < 7)  return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

const Chats = () => {
  const { t }                   = useTranslation();
  const navigate                = useNavigate();
  const { conversations, loading } = useConversations();

  if (loading) return <p style={{ color: "#9a7d62", padding: 8 }}>{t("chat.loading")}</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px", fontFamily: "'Playfair Display', serif", color: "#f0e4cc" }}>
        💬 {t("chat.title")}
      </h2>
      <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 24px" }}>
        {t("chat.subtitle")}
      </p>

      {conversations.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>💬</p>
          <p style={{ margin: 0, fontWeight: 600, color: "#f0e4cc" }}>{t("chat.empty")}</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9a7d62" }}>{t("chat.emptyHint")}</p>
        </div>
      ) : (
        <div style={listStyle}>
          {conversations.map((conv) => (
            <ConvRow key={conv.conversation_id} conv={conv} onClick={() => navigate(`/chats/${conv.conversation_id}`)} t={t} />
          ))}
        </div>
      )}
    </div>
  );
};

const ConvRow = ({ conv, onClick, t }) => {
  const hasUnread = Number(conv.unread_count) > 0;
  let preview = "";
  if (conv.last_message) {
    preview = conv.last_message_type === "photo" ? t("chat.lastMessagePhoto") : conv.last_message;
    if (preview.length > 60) preview = preview.slice(0, 60) + "…";
  } else {
    preview = t("chat.noMessages");
  }

  return (
    <div onClick={onClick} style={rowStyle}>
      <Avatar avatarUrl={conv.other_avatar_url} nombre={conv.other_nombre || "?"} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontWeight: hasUnread ? 700 : 600, color: "#f0e4cc", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conv.other_nombre || t("chat.unknownUser")}
          </span>
          <span style={{ fontSize: 11, color: "#5a4535", flexShrink: 0, marginLeft: 8 }}>
            {formatTime(conv.last_message_at)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 13,
            color: hasUnread ? "#d4af37" : "#9a7d62",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontWeight: hasUnread ? 600 : 400,
            flex: 1,
          }}>
            {preview}
          </span>
          {hasUnread && (
            <span style={unreadBadge}>{conv.unread_count > 9 ? "9+" : conv.unread_count}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const listStyle   = { background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12, overflow: "hidden" };
const rowStyle    = {
  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
  cursor: "pointer", borderBottom: "1px solid #2e2215", transition: "background 0.15s",
};
const emptyStyle  = { textAlign: "center", padding: "60px 20px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12 };
const unreadBadge = {
  background: "#d4af37", color: "#0d0a06", borderRadius: "50%", minWidth: 20, height: 20,
  fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0,
};

export default Chats;
