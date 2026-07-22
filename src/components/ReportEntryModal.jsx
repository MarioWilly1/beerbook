import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

// Reporte comunitario de una entrada ajena — cae en entry_flags
// (source='community_report') para revisión en AdminPanel > Reportes.
// RLS en la tabla ya impide auto-reportarse y reportar dos veces la
// misma entrada; acá solo se traducen esos casos a mensajes legibles.
const ReportEntryModal = ({ target, onClose }) => {
  const { t } = useTranslation();
  const [reason, setReason]   = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setSending(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    const { error: err } = await supabase.from("entry_flags").insert({
      user_id:     target.user_id,
      beer_id:     target.beer_id,
      source:      "community_report",
      reason:      trimmed,
      reporter_id: session.user.id,
    });

    setSending(false);
    if (err) {
      setError(err.code === "23505" ? t("feed.report.alreadyReported") : t("feed.report.error"));
      return;
    }
    setDone(true);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(5,4,3,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380,
          background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
          padding: "22px 20px",
        }}
      >
        {done ? (
          <>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#f0e4cc" }}>
              🚩 {t("feed.report.sent")}
            </p>
            <button onClick={onClose} style={primaryBtnStyle}>{t("feed.report.close")}</button>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#f0e4cc" }}>
              🚩 {t("feed.report.title")}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#9a7d62" }}>
              {t("feed.report.subtitle", { nombre: target.nombre, beer: target.beer_nombre })}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={t("feed.report.reasonPlaceholder")}
              style={textareaStyle}
              autoFocus
            />
            <div style={{ fontSize: 11, color: "#5a4535", textAlign: "right", margin: "2px 0 12px" }}>
              {reason.length}/300
            </div>
            {error && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#c0392b" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={secondaryBtnStyle}>{t("feed.report.cancel")}</button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || sending}
                style={{ ...primaryBtnStyle, opacity: !reason.trim() || sending ? 0.5 : 1 }}
              >
                {sending ? "…" : t("feed.report.submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const textareaStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  border: "1.5px solid #2e2215", borderRadius: 10, fontSize: 13.5,
  outline: "none", background: "#2a1e0f", color: "#f0e4cc", resize: "none",
  fontFamily: "inherit",
};
const primaryBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #d4af3788",
  background: "#d4af371e", color: "#f0e4cc", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const secondaryBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #2e2215",
  background: "none", color: "#9a7d62", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

export default ReportEntryModal;
