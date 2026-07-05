import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChat } from "../hooks/useChat";
import Avatar from "../components/Avatar";

function formatMsgTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ChatPage = () => {
  const { id }                    = useParams();
  const navigate                  = useNavigate();
  const { t }                     = useTranslation();
  const { messages, otherUser, currentUserId, loading, sendMessage } = useChat(id);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const messagesEndRef             = useRef(null);
  const inputRef                   = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const val = text.trim();
    if (!val || sending) return;
    setSending(true);
    setText("");
    await sendMessage(val);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => navigate("/chats")} style={backBtnStyle}>←</button>
        {otherUser && <Avatar avatarUrl={otherUser.avatar_url} nombre={otherUser.nombre} size={36} />}
        <span style={{ fontWeight: 700, fontSize: 15, color: "#f0e4cc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {otherUser?.nombre || "…"}
        </span>
      </div>

      {/* Messages */}
      <div style={messagesAreaStyle}>
        {loading ? (
          <p style={{ color: "#9a7d62", textAlign: "center", padding: 24 }}>{t("chat.loading")}</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#5a4535", padding: "40px 20px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13 }}>{t("chat.noMessages")}</p>
            <p style={{ margin: 0, fontSize: 12 }}>{t("chat.sendFirstMessage")}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe    = msg.sender_id === currentUserId;
            const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 4 }}>
                {showAvatar && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, marginLeft: 4 }}>
                    <Avatar avatarUrl={msg.sender?.avatar_url} nombre={msg.sender?.nombre || "?"} size={20} />
                    <span style={{ fontSize: 11, color: "#9a7d62" }}>{msg.sender?.nombre}</span>
                  </div>
                )}
                <div style={bubbleStyle(isMe)}>
                  <span style={{ fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>{msg.content}</span>
                  <span style={{ fontSize: 10, color: isMe ? "rgba(13,10,6,0.55)" : "#5a4535", marginTop: 2, display: "block", textAlign: "right" }}>
                    {formatMsgTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={inputAreaStyle}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.typeMessage")}
          style={inputStyle}
          disabled={sending}
          autoComplete="off"
        />
        <button onClick={handleSend} disabled={!text.trim() || sending} style={sendBtnStyle(!!text.trim() && !sending)}>
          ➤
        </button>
      </div>
    </div>
  );
};

const pageStyle = {
  display: "flex", flexDirection: "column",
  height: "calc(100vh - 56px)", margin: "-28px", overflow: "hidden",
};

const headerStyle = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 16px",
  background: "#1c1409", borderBottom: "1px solid #2e2215",
  flexShrink: 0,
};

const backBtnStyle = {
  background: "none", border: "none", color: "#d4af37", fontSize: 20,
  cursor: "pointer", padding: "0 8px 0 0", lineHeight: 1, flexShrink: 0,
};

const messagesAreaStyle = {
  flex: 1, overflowY: "auto", padding: "16px 16px 8px",
  display: "flex", flexDirection: "column",
};

const bubbleStyle = (isMe) => ({
  maxWidth: "72%",
  background: isMe ? "#d4af37" : "#2a1e0f",
  color:      isMe ? "#0d0a06" : "#f0e4cc",
  border:     isMe ? "none"    : "1px solid #2e2215",
  borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
  padding: "8px 12px",
  marginBottom: 2,
});

const inputAreaStyle = {
  display: "flex", gap: 8, padding: "12px 16px",
  background: "#1c1409", borderTop: "1px solid #2e2215",
  flexShrink: 0,
};

const inputStyle = {
  flex: 1, padding: "10px 14px",
  background: "#2a1e0f", color: "#f0e4cc",
  border: "1px solid #2e2215", borderRadius: 24,
  fontSize: 14, outline: "none",
};

const sendBtnStyle = (active) => ({
  width: 42, height: 42, borderRadius: "50%", border: "none",
  background: active ? "#d4af37" : "#2a1e0f",
  color: active ? "#0d0a06" : "#5a4535",
  fontSize: 16, cursor: active ? "pointer" : "default",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, transition: "background 0.15s, color 0.15s",
});

export default ChatPage;
