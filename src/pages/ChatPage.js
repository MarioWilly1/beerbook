import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChat } from "../hooks/useChat";
import { useChatPhoto } from "../hooks/useChatPhoto";
import Avatar from "../components/Avatar";
import ChatBeerPicker from "../components/ChatBeerPicker";

function formatMsgTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Bubble: foto ─────────────────────────────────────────────────────────────
const PhotoBubble = ({ url, isMe, time }) => {
  const [err, setErr] = useState(false);
  return (
    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
      {err ? (
        <div style={bubbleStyle(isMe)}>
          <span style={{ fontSize: 13 }}>📷</span>
        </div>
      ) : (
        <img
          src={url}
          alt=""
          onError={() => setErr(true)}
          style={{
            maxWidth: "100%",
            maxHeight: 260,
            borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            display: "block",
            objectFit: "cover",
          }}
        />
      )}
      <span style={{ fontSize: 10, color: "#5a4535", marginTop: 2, padding: "0 2px" }}>{time}</span>
    </div>
  );
};

// ── Bubble: cerveza ───────────────────────────────────────────────────────────
const BeerBubble = ({ content, isMe, time }) => {
  let beer = {};
  try { beer = JSON.parse(content); } catch {}
  return (
    <div style={{ ...bubbleStyle(isMe), padding: 0, overflow: "hidden", maxWidth: "72%" }}>
      {beer.photo_url && (
        <img
          src={beer.photo_url}
          alt=""
          style={{ width: "100%", maxHeight: 130, objectFit: "cover", display: "block" }}
        />
      )}
      <div style={{ padding: beer.photo_url ? "8px 12px 6px" : "10px 12px 6px" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? "#0d0a06" : "#f0e4cc", display: "block" }}>
          🍺 {beer.nombre || "Cerveza"}
        </span>
        {(beer.estilo || beer.pais) && (
          <span style={{ fontSize: 11, color: isMe ? "rgba(13,10,6,0.6)" : "#9a7d62", display: "block", marginTop: 2 }}>
            {[beer.estilo, beer.pais].filter(Boolean).join(" · ")}
          </span>
        )}
        <span style={{ fontSize: 10, color: isMe ? "rgba(13,10,6,0.5)" : "#5a4535", marginTop: 4, display: "block", textAlign: "right" }}>
          {time}
        </span>
      </div>
    </div>
  );
};

// ── Bubble: respuesta a historia ──────────────────────────────────────────────
const StoryReplyBubble = ({ content, isMe, time, t }) => {
  let data = {};
  try { data = JSON.parse(content); } catch {}
  const [imgErr, setImgErr] = useState(false);

  const hasPhoto = data.story_type === "photo" && data.story_photo_url && !imgErr;
  const hasText  = data.story_type === "text" && data.story_text;

  return (
    <div style={{ ...bubbleStyle(isMe), padding: 0, overflow: "hidden", maxWidth: "72%" }}>
      {/* Preview de la historia */}
      <div style={{ position: "relative", borderBottom: `1px solid ${isMe ? "rgba(13,10,6,0.2)" : "#2e2215"}` }}>
        {hasPhoto ? (
          <img
            src={data.story_photo_url}
            alt=""
            onError={() => setImgErr(true)}
            style={{ width: "100%", maxHeight: 110, objectFit: "cover", display: "block" }}
          />
        ) : hasText ? (
          <div style={{
            background: data.story_bg || "#1c1409",
            minHeight: 60, padding: "14px 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 12, color: "#f0e4cc", fontFamily: "'Playfair Display', serif", textAlign: "center" }}>
              {data.story_text}
            </span>
          </div>
        ) : (
          <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", minHeight: 40 }}>
            <span style={{ fontSize: 12, color: isMe ? "rgba(13,10,6,0.5)" : "#5a4535", fontStyle: "italic" }}>
              {t("chat.storyExpired")}
            </span>
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "rgba(0,0,0,0.45)",
          padding: "3px 8px",
          fontSize: 10, color: "rgba(240,228,204,0.85)",
        }}>
          📖 {t("chat.storyReplyLabel", { nombre: data.owner_nombre || "?" })}
        </div>
      </div>
      {/* Texto de respuesta */}
      {data.text && (
        <div style={{ padding: "8px 12px 2px" }}>
          <span style={{ fontSize: 14, lineHeight: 1.4, wordBreak: "break-word", color: isMe ? "#0d0a06" : "#f0e4cc" }}>
            {data.text}
          </span>
        </div>
      )}
      <div style={{ padding: "2px 12px 6px", textAlign: "right" }}>
        <span style={{ fontSize: 10, color: isMe ? "rgba(13,10,6,0.5)" : "#5a4535" }}>{time}</span>
      </div>
    </div>
  );
};

// ── Página principal del chat ─────────────────────────────────────────────────
const ChatPage = () => {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { t }           = useTranslation();
  const { messages, otherUser, currentUserId, loading, sendMessage } = useChat(id);
  const { uploadChatPhoto, uploading: uploadingPhoto } = useChatPhoto();

  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [showBeerPicker, setShowBeerPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const photoInputRef  = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const val = text.trim();
    if (!val || sending) return;
    setSending(true);
    setText("");
    await sendMessage(val, "text");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !currentUserId) return;
    if (file.size > 10 * 1024 * 1024) return;
    const url = await uploadChatPhoto(file, currentUserId);
    if (url) await sendMessage(url, "photo");
  };

  const handleBeerSelect = async (beer) => {
    setShowBeerPicker(false);
    const content = JSON.stringify({
      id: beer.id,
      nombre: beer.nombre,
      estilo: beer.estilo || null,
      pais: beer.pais || null,
      photo_url: beer.user_photo_url || beer.foto_url || null,
    });
    await sendMessage(content, "beer");
  };

  const renderMessage = (msg) => {
    const isMe = msg.sender_id === currentUserId;
    const time = formatMsgTime(msg.created_at);
    switch (msg.type) {
      case "photo":
        return <PhotoBubble url={msg.content} isMe={isMe} time={time} />;
      case "beer":
        return <BeerBubble content={msg.content} isMe={isMe} time={time} />;
      case "story_reply":
        return <StoryReplyBubble content={msg.content} isMe={isMe} time={time} t={t} />;
      default:
        return (
          <div style={bubbleStyle(isMe)}>
            <span style={{ fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>{msg.content}</span>
            <span style={{ fontSize: 10, color: isMe ? "rgba(13,10,6,0.55)" : "#5a4535", marginTop: 2, display: "block", textAlign: "right" }}>
              {time}
            </span>
          </div>
        );
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
            const isMe       = msg.sender_id === currentUserId;
            const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 4 }}>
                {showAvatar && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, marginLeft: 4 }}>
                    <Avatar avatarUrl={msg.sender?.avatar_url} nombre={msg.sender?.nombre || "?"} size={20} />
                    <span style={{ fontSize: 11, color: "#9a7d62" }}>{msg.sender?.nombre}</span>
                  </div>
                )}
                {renderMessage(msg)}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={inputAreaStyle}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handlePhotoChange}
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          title={t("chat.sendPhoto")}
          style={attachBtnStyle}
        >
          {uploadingPhoto ? "⏳" : "📷"}
        </button>
        <button
          onClick={() => setShowBeerPicker(true)}
          title={t("chat.shareBeer")}
          style={attachBtnStyle}
        >
          🍺
        </button>
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
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={sendBtnStyle(!!text.trim() && !sending)}
        >
          ➤
        </button>
      </div>

      {showBeerPicker && (
        <ChatBeerPicker
          onSelect={handleBeerSelect}
          onClose={() => setShowBeerPicker(false)}
        />
      )}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
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
  display: "flex", gap: 6, padding: "10px 12px",
  background: "#1c1409", borderTop: "1px solid #2e2215",
  flexShrink: 0, alignItems: "center",
};
const attachBtnStyle = {
  width: 38, height: 38, borderRadius: "50%", border: "1px solid #2e2215",
  background: "#2a1e0f", color: "#d4af37",
  fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, padding: 0,
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
