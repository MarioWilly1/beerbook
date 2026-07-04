import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateStory } from "../hooks/useCreateStory";

const BG_COLORS = [
  "#1c1409", "#0f1a2e", "#0f2a18", "#2a0a0a",
  "#1a0f2e", "#2a1a0a", "#0a2a2a", "#1a2a0a",
];

const StoryCreator = ({ currentUserId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [mode,         setMode]         = useState("photo"); // "photo" | "text"
  const [file,         setFile]         = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [textContent,  setTextContent]  = useState("");
  const [textBg,       setTextBg]       = useState(BG_COLORS[0]);

  const { createStory, uploading, error, setError } = useCreateStory(currentUserId, onSuccess);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setError(t("stories.creator.errorSize"));
      return;
    }
    setError("");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = () => {
    if (mode === "photo") {
      createStory({ type: "photo", file });
    } else {
      createStory({ type: "text", textContent, textBg });
    }
  };

  const canSubmit = mode === "photo" ? !!file : textContent.trim().length > 0;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f0e4cc" }}>
            {t("stories.creator.title")}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Selector de modo */}
        <div style={modeTabsStyle}>
          <button
            onClick={() => setMode("photo")}
            style={{ ...modeTabStyle, ...(mode === "photo" ? modeTabActiveStyle : {}) }}
          >
            📷 {t("stories.creator.tabPhoto")}
          </button>
          <button
            onClick={() => setMode("text")}
            style={{ ...modeTabStyle, ...(mode === "text" ? modeTabActiveStyle : {}) }}
          >
            ✏️ {t("stories.creator.tabText")}
          </button>
        </div>

        {/* ── Modo foto ── */}
        {mode === "photo" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {!previewUrl ? (
              <button
                onClick={() => fileInputRef.current.click()}
                style={uploadZoneStyle}
              >
                <span style={{ fontSize: 40 }}>📷</span>
                <span style={{ fontSize: 13, color: "#9a7d62", marginTop: 8 }}>
                  {t("stories.creator.choosePhoto")}
                </span>
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                <img
                  src={previewUrl}
                  alt="preview"
                  style={{ width: "100%", borderRadius: 10, maxHeight: 340, objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  style={clearPhotoBtn}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Modo texto ── */}
        {mode === "text" && (
          <>
            {/* Preview */}
            <div
              style={{
                background:     textBg,
                borderRadius:   10,
                minHeight:      180,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                padding:        "20px 24px",
                marginBottom:   12,
                border:         "1px solid #2e2215",
              }}
            >
              {textContent.trim()
                ? <p style={previewTextStyle}>{textContent}</p>
                : <span style={{ color: "rgba(240,228,204,0.2)", fontSize: 13 }}>
                    {t("stories.creator.textPlaceholder")}
                  </span>
              }
            </div>

            {/* Input */}
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={200}
              placeholder={t("stories.creator.textPlaceholder")}
              style={textareaStyle}
              rows={3}
              autoFocus
            />
            <div style={{ fontSize: 11, color: "#5a4535", textAlign: "right", marginBottom: 12 }}>
              {textContent.length}/200
            </div>

            {/* Selector de color de fondo */}
            <p style={colorLabelStyle}>{t("stories.creator.bgColor")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextBg(c)}
                  style={{
                    width:        32,
                    height:       32,
                    borderRadius: "50%",
                    background:   c,
                    border:       textBg === c
                      ? "3px solid #d4af37"
                      : "3px solid #2e2215",
                    cursor:       "pointer",
                    padding:      0,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {/* Publicar */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || uploading}
          style={{ ...submitBtnStyle, opacity: (!canSubmit || uploading) ? 0.5 : 1 }}
        >
          {uploading
            ? t("stories.creator.publishing")
            : t("stories.creator.publish")}
        </button>
      </div>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const overlayStyle = {
  position:       "fixed",
  inset:          0,
  background:     "rgba(0,0,0,0.85)",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  zIndex:         9999,
  padding:        20,
};

const modalStyle = {
  background:   "#1c1409",
  border:       "1px solid #2e2215",
  borderRadius: 16,
  padding:      24,
  width:        "100%",
  maxWidth:     420,
  maxHeight:    "90dvh",
  overflowY:    "auto",
  boxShadow:    "0 24px 64px rgba(0,0,0,0.7)",
};

const headerStyle = {
  display:        "flex",
  justifyContent: "space-between",
  alignItems:     "center",
  marginBottom:   20,
};

const closeBtnStyle = {
  background: "none",
  border:     "none",
  fontSize:   20,
  cursor:     "pointer",
  color:      "#5a4535",
  lineHeight: 1,
  padding:    "2px 6px",
};

const modeTabsStyle = {
  display:       "flex",
  gap:           8,
  marginBottom:  20,
};

const modeTabStyle = {
  flex:         1,
  padding:      "8px 12px",
  borderRadius: 8,
  border:       "1px solid #2e2215",
  background:   "#0d0a06",
  color:        "#5a4535",
  fontSize:     13,
  fontWeight:   600,
  cursor:       "pointer",
};

const modeTabActiveStyle = {
  background:  "rgba(212,175,55,0.15)",
  border:      "1px solid rgba(212,175,55,0.4)",
  color:       "#d4af37",
};

const uploadZoneStyle = {
  width:          "100%",
  minHeight:      180,
  display:        "flex",
  flexDirection:  "column",
  alignItems:     "center",
  justifyContent: "center",
  background:     "#0d0a06",
  border:         "2px dashed #2e2215",
  borderRadius:   10,
  cursor:         "pointer",
  marginBottom:   16,
};

const clearPhotoBtn = {
  position:   "absolute",
  top:        8,
  right:      8,
  background: "rgba(13,10,6,0.75)",
  border:     "1px solid #8b2020",
  borderRadius: "50%",
  color:      "#c07a3f",
  width:      28,
  height:     28,
  display:    "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor:     "pointer",
  fontSize:   12,
};

const previewTextStyle = {
  fontSize:   20,
  fontWeight: 700,
  color:      "#f0e4cc",
  textAlign:  "center",
  lineHeight: 1.4,
  margin:     0,
  fontFamily: "'Playfair Display', serif",
  wordBreak:  "break-word",
};

const textareaStyle = {
  width:        "100%",
  background:   "#0d0a06",
  border:       "1px solid #2e2215",
  borderRadius: 8,
  color:        "#f0e4cc",
  fontSize:     14,
  padding:      "10px 12px",
  resize:       "none",
  outline:      "none",
  fontFamily:   "Inter, sans-serif",
  boxSizing:    "border-box",
  marginBottom: 4,
};

const colorLabelStyle = {
  margin:        "0 0 8px",
  fontSize:      11,
  fontWeight:    700,
  color:         "#5a4535",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const errorStyle = {
  background:    "#2a0a0a",
  border:        "1px solid #8b2020",
  borderRadius:  8,
  padding:       "10px 14px",
  marginBottom:  12,
  fontSize:      13,
  color:         "#c07a3f",
};

const submitBtnStyle = {
  width:        "100%",
  padding:      "12px",
  background:   "#d4af37",
  color:        "#0d0a06",
  border:       "none",
  borderRadius: 10,
  fontWeight:   700,
  fontSize:     15,
  cursor:       "pointer",
};

export default StoryCreator;
