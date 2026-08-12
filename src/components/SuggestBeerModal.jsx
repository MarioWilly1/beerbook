import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { supabase } from "../services/supabase";
import { XIcon } from "@primer/octicons-react";

// Extraído de Dashboard.js para poder reutilizarlo también desde
// QuickRegisterModal.jsx (cuando no se encuentra la cerveza escaneada/
// buscada) sin duplicar el formulario.
const SuggestBeerModal = ({ onClose, t, prefillNombre = "" }) => {
  const [nombre, setNombre]   = useState(prefillNombre);
  const [estilo, setEstilo]   = useState("");
  const [pais, setPais]       = useState("");
  const [reason, setReason]   = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSend = useCallback(async () => {
    if (!nombre.trim()) { setError(t("suggest.errorNombre")); return; }
    setSending(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("nombre").eq("id", user.id).single();
    await supabase.from("beer_suggestions").insert({
      user_id:            user.id,
      sugerida_por_nombre: profile?.nombre || null,
      nombre:             nombre.trim(),
      estilo:             estilo.trim() || null,
      pais:               pais.trim()   || null,
      reason:             reason.trim() || null,
    });
    setSent(true);
    setSending(false);
  }, [nombre, estilo, pais, reason, t]);

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  };
  const modalStyle = {
    background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
    padding: 28, width: "100%", maxWidth: 440,
  };
  const inputStyle = {
    width: "100%", padding: "9px 12px", marginBottom: 14, borderRadius: 8,
    background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62",
    textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
  };

  // Portal a document.body — mismo motivo que BarcodeScanner.jsx: se abre
  // desde adentro del contenido de una pestaña nativa, donde un transform
  // de GSAP puede romper position:fixed.
  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "'Playfair Display', serif", color: "#f0e4cc", fontSize: 20 }}>
            💡 {t("suggest.title")}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a4535", cursor: "pointer", lineHeight: 1, display: "flex" }}><XIcon size={20} /></button>
        </div>
        <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          {t("suggest.subtitle")}
        </p>

        {sent ? (
          <p style={{ color: "#4caf50", fontWeight: 600, fontSize: 15, textAlign: "center", padding: "20px 0" }}>
            ✓ {t("suggest.sent")}
          </p>
        ) : (
          <>
            <label style={labelStyle}>{t("suggest.nombreLabel")} *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 100))} placeholder={t("suggest.nombrePlaceholder")} style={inputStyle} />
            {error && <p style={{ color: "#c07a3f", fontSize: 12, margin: "-10px 0 10px" }}>{error}</p>}

            <label style={labelStyle}>{t("suggest.estiloLabel")}</label>
            <input value={estilo} onChange={(e) => setEstilo(e.target.value.slice(0, 80))} placeholder={t("suggest.estiloPlaceholder")} style={inputStyle} />

            <label style={labelStyle}>{t("suggest.paisLabel")}</label>
            <input value={pais} onChange={(e) => setPais(e.target.value.slice(0, 80))} placeholder={t("suggest.paisPlaceholder")} style={inputStyle} />

            <label style={labelStyle}>{t("suggest.reasonLabel")}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 400))}
              placeholder={t("suggest.reasonPlaceholder")}
              rows={3}
              maxLength={400}
              style={{ ...inputStyle, resize: "none", fontFamily: "Inter, sans-serif", marginBottom: 4 }}
              spellCheck="true"
              autoCorrect="on"
              autoCapitalize="sentences"
            />
            <div style={{ fontSize: 11, color: reason.length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", marginBottom: 20 }}>
              {reason.length}/400
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: sending ? "#2a1e0f" : "#d4af37",
                color: sending ? "#5a4535" : "#0d0a06",
                fontWeight: 700, fontSize: 15,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? t("suggest.sending") : t("suggest.sendBtn")}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SuggestBeerModal;
