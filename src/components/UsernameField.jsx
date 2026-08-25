import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { sanitizeUsernameInput, usernameFormatError, suggestUsernames } from "../utils/username";

const CHECK_DEBOUNCE_MS = 500;

// Input reusable para el apodo público — usado en Registro,
// AgeVerificationPage (perfiles creados vía OAuth), ChooseUsernamePage
// (gate de usuarios existentes) y Configuración > Perfil (edición).
// Valida formato al tipear (sanitiza caracteres inválidos en vez de
// dejar escribirlos) y chequea disponibilidad contra la base con
// debounce — la validación real e irrefutable es el índice único de
// Postgres (lower(username)), esto es solo feedback inmediato al
// usuario; `onSaved`/el caller siempre debe manejar el error 23505 por
// si dos personas chocan en el mismo instante.
//
// `currentUserId` (opcional): al editar el propio apodo sin cambiarlo,
// no se rechaza a uno mismo como "ya tomado" — se lo pasa como
// p_exclude_user_id a is_username_available.
const UsernameField = ({ value, onChange, currentUserId, onValidityChange, autoFocus, dark }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState("idle"); // idle | checking | available | taken | invalid
  const [suggestions, setSuggestions] = useState([]);
  const checkSeq = useRef(0);

  const formatError = usernameFormatError(value);

  useEffect(() => {
    if (formatError) {
      setStatus("invalid");
      setSuggestions([]);
      onValidityChange && onValidityChange(false);
      return;
    }

    setStatus("checking");
    onValidityChange && onValidityChange(false);
    const mySeq = ++checkSeq.current;

    const timer = setTimeout(async () => {
      const { data: available } = await supabase.rpc("is_username_available", {
        p_username: value,
        p_exclude_user_id: currentUserId || null,
      });
      if (checkSeq.current !== mySeq) return; // el usuario ya siguió tipeando

      if (available) {
        setStatus("available");
        setSuggestions([]);
        onValidityChange && onValidityChange(true);
      } else {
        setStatus("taken");
        onValidityChange && onValidityChange(false);
        const candidates = suggestUsernames(value);
        const results = await Promise.all(
          candidates.map((c) => supabase.rpc("is_username_available", { p_username: c }))
        );
        if (checkSeq.current !== mySeq) return;
        setSuggestions(candidates.filter((_, i) => results[i].data));
      }
    }, CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currentUserId]);

  const statusStyle = {
    checking: { color: "#9a7d62" },
    available: { color: "#2a9d5c" },
    taken: { color: "#c0392b" },
    invalid: { color: "#c0392b" },
    idle: { color: "#9a7d62" },
  }[status];

  const statusMessage =
    status === "checking" ? t("username.checking")
    : status === "available" ? t("username.available")
    : status === "taken" ? t("username.taken")
    : status === "invalid" && value ? t(formatError)
    : t("username.hint");

  return (
    <div>
      <div style={{ position: "relative" }}>
        <span style={{ ...atStyle, color: dark ? "#5a4535" : "#999" }}>@</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(sanitizeUsernameInput(e.target.value))}
          placeholder={t("username.placeholder")}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          className={dark ? undefined : "auth-input"}
          style={dark ? inputStyleDark : inputStyle}
        />
      </div>
      <p style={{ ...hintStyle, ...statusStyle }}>{statusMessage}</p>

      {status === "taken" && suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: "#9a7d62" }}>{t("username.suggestionsIntro")}</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              style={suggestionPillStyle}
            >
              @{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const atStyle = {
  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
  color: "#999", fontSize: 15, pointerEvents: "none",
};
const inputStyle = {
  width: "100%",
  padding: "11px 14px 11px 28px",
  border: "1.5px solid #e0e0e0",
  borderRadius: "10px",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  color: "#111",
  background: "#fff",
};
const inputStyleDark = {
  ...inputStyle,
  border: "1px solid #2e2215",
  color: "#f0e4cc",
  background: "#2a1e0f",
};
const hintStyle = {
  margin: "6px 0 0", fontSize: 12, lineHeight: 1.5,
};
const suggestionPillStyle = {
  padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
  border: "1px solid #d4af37", background: "rgba(212,175,55,0.1)", color: "#8b6b2e",
};

export default UsernameField;
