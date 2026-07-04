import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { useBadges } from "../hooks/useBadges";
import { TIER_META } from "../utils/badges";
import Avatar from "../components/Avatar";
import AvatarSelector from "../components/AvatarSelector";

const TABS = [
  { key: "perfil",       icon: "👤", tKey: "settings.tabs.profile"     },
  { key: "privacidad",   icon: "🔒", tKey: "settings.tabs.privacy"     },
  { key: "preferencias", icon: "🎛", tKey: "settings.tabs.preferences" },
];

const LANGUAGES = [
  { code: "es", label: "Español",  flag: "🇦🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
];

// ── Toggle component ──────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label, description }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 0", borderBottom: "1px solid #f0f0f0" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: "#111", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{description}</div>
    </div>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 26, borderRadius: 13, border: "none",
        cursor: "pointer", background: value ? "#1e8449" : "#ccc",
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: value ? 25 : 3, width: 20, height: 20,
        borderRadius: "50%", background: "#fff",
        display: "block", transition: "left 0.2s",
      }} />
    </button>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Configuracion = ({ onProfileChange }) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState("perfil");
  const [session, setSession] = useState(null);
  const [localProfile, setLocalProfile] = useState(null);

  const [nombre, setNombre]     = useState("");
  const [nombreError, setNombreError] = useState("");
  const [bio, setBio]           = useState("");
  const [pais, setPais]         = useState("");
  const [featuredBadges, setFeaturedBadges] = useState([]);
  const [perfilPublico, setPerfilPublico]   = useState(true);
  const [aparecer, setAparecer]             = useState(true);
  const [soundsOn, setSoundsOn]             = useState(
    localStorage.getItem("sounds_enabled") === "true"
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const { badges } = useBadges();
  const unlockedBadges = badges.filter((b) => b.currentTier);

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      setSession(s);
      const { data } = await supabase
        .from("profiles")
        .select("nombre, avatar_url, bio, pais_origen, featured_badges, perfil_publico, aparecer_en_ranking")
        .eq("id", s.user.id)
        .single();
      if (data) {
        setLocalProfile(data);
        setNombre(data.nombre || "");
        setBio(data.bio || "");
        setPais(data.pais_origen || "");
        setFeaturedBadges(data.featured_badges || []);
        setPerfilPublico(data.perfil_publico ?? true);
        setAparecer(data.aparecer_en_ranking ?? true);
      }
    };
    load();
  }, []);

  const handleSavePerfil = async () => {
    if (!session) return;
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      setNombreError(t("settings.profile.errorEmpty"));
      return;
    }
    if (trimmedNombre.length < 2) {
      setNombreError(t("settings.profile.errorMinLength"));
      return;
    }
    setNombreError("");
    setSaving(true);
    await supabase.from("profiles").update({
      nombre: trimmedNombre,
      bio: bio.trim() || null,
      pais_origen: pais.trim() || null,
      featured_badges: featuredBadges,
    }).eq("id", session.user.id);
    setNombre(trimmedNombre);
    setLocalProfile((p) => ({ ...p, nombre: trimmedNombre }));
    if (onProfileChange) onProfileChange({ nombre: trimmedNombre });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSoundsToggle = (v) => {
    setSoundsOn(v);
    localStorage.setItem("sounds_enabled", v ? "true" : "false");
  };

  const handleLanguageChange = async (lang) => {
    await i18n.changeLanguage(lang);
    if (session) {
      await supabase.from("profiles")
        .update({ preferred_language: lang })
        .eq("id", session.user.id);
    }
  };

  const handlePrivacyToggle = async (field, value) => {
    if (!session) return;
    await supabase.from("profiles").update({ [field]: value }).eq("id", session.user.id);
    if (field === "perfil_publico") setPerfilPublico(value);
    if (field === "aparecer_en_ranking") setAparecer(value);
  };

  const toggleFeaturedBadge = (slug) => {
    if (featuredBadges.includes(slug)) {
      setFeaturedBadges((prev) => prev.filter((s) => s !== slug));
    } else if (featuredBadges.length < 3) {
      setFeaturedBadges((prev) => [...prev, slug]);
    }
  };

  if (!localProfile && !session) {
    return <p style={{ padding: 24 }}>{t("settings.loading")}</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 24px" }}>⚙️ {t("settings.pageTitle")}</h2>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "2px solid #f0f0f0" }}>
        {TABS.map(({ key, icon, tKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 22px", border: "none", background: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 14,
              color: tab === key ? "#b8941f" : "#888",
              borderBottom: tab === key ? "3px solid #d4af37" : "3px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}
          >
            {icon} {t(tKey)}
          </button>
        ))}
      </div>

      {/* ── Tab: Perfil ───────────────────────────────────────────────── */}
      {tab === "perfil" && (
        <div>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: 16, background: "#fafafa", borderRadius: 12, border: "1px solid #f0f0f0" }}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowAvatarSelector(true)}>
              <Avatar avatarUrl={localProfile?.avatar_url} nombre={localProfile?.nombre} size={64} />
              <span style={{ position: "absolute", bottom: 0, right: 0, background: "#d4af37", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                ✏️
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{localProfile?.nombre || "—"}</div>
              <button
                onClick={() => setShowAvatarSelector(true)}
                style={{ fontSize: 12, color: "#b8941f", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}
              >
                {t("settings.profile.changeAvatar")}
              </button>
            </div>
          </div>

          {/* Nombre de usuario */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t("settings.profile.usernameLabel")}</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                if (e.target.value.length <= 30) setNombre(e.target.value);
                if (nombreError) setNombreError("");
              }}
              placeholder={t("settings.profile.usernamePlaceholder")}
              style={{ ...inputStyle, borderColor: nombreError ? "#c0392b" : "#e0e0e0" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 11, color: "#c0392b" }}>{nombreError}</span>
              <span style={{ fontSize: 11, color: nombre.length >= 28 ? "#c0392b" : "#bbb" }}>
                {nombre.length}/30
              </span>
            </div>
          </div>

          {/* Biografía */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t("settings.profile.bioLabel")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder={t("settings.profile.bioPlaceholder")}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: 11, color: bio.length >= 180 ? "#c0392b" : "#bbb", textAlign: "right", marginTop: 3 }}>
              {bio.length}/200
            </div>
          </div>

          {/* País de origen */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>{t("settings.profile.countryLabel")}</label>
            <input
              type="text"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder={t("settings.profile.countryPlaceholder")}
              style={inputStyle}
            />
          </div>

          {/* Insignias destacadas */}
          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>
              {t("settings.profile.featuredBadgesLabel")}{" "}
              <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>
                {t("settings.profile.featuredBadgesCount", { count: featuredBadges.length })}
              </span>
            </label>
            {unlockedBadges.length === 0 ? (
              <p style={{ color: "#bbb", fontSize: 13, margin: "8px 0" }}>
                {t("settings.profile.noBadgesHint")}
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {unlockedBadges.map((badge) => {
                  const selected = featuredBadges.includes(badge.slug);
                  const disabled = !selected && featuredBadges.length >= 3;
                  const tierColor = TIER_META[badge.currentTier].color;
                  const tierBg    = TIER_META[badge.currentTier].bg;
                  return (
                    <button
                      key={badge.slug}
                      onClick={() => !disabled && toggleFeaturedBadge(badge.slug)}
                      title={
                        disabled
                          ? t("settings.profile.maxBadgesHint")
                          : `${badge.nombre} · ${TIER_META[badge.currentTier].label}`
                      }
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", borderRadius: 20,
                        border: `2px solid ${selected ? tierColor : "#e0e0e0"}`,
                        background: selected ? tierBg : "#fafafa",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.35 : 1,
                        fontWeight: selected ? 700 : 400,
                        fontSize: 13, transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{badge.icon}</span>
                      <span style={{ color: selected ? tierColor : "#666" }}>{badge.nombre}</span>
                      {selected && <span style={{ fontSize: 11, color: "#1e8449" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSavePerfil}
            disabled={saving}
            style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
              background: saved ? "#1e8449" : "#d4af37",
              color: saved ? "#fff" : "#111",
              opacity: saving ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {saved ? t("settings.profile.savedBtn") : saving ? t("settings.profile.savingBtn") : t("settings.profile.saveBtn")}
          </button>
        </div>
      )}

      {/* ── Tab: Privacidad ───────────────────────────────────────────── */}
      {tab === "privacidad" && (
        <div>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>
            {t("settings.privacy.intro")}
          </p>
          <Toggle
            value={perfilPublico}
            onChange={(v) => handlePrivacyToggle("perfil_publico", v)}
            label={t("settings.privacy.publicProfileLabel")}
            description={t(perfilPublico ? "settings.privacy.publicProfileOn" : "settings.privacy.publicProfileOff")}
          />
          <Toggle
            value={aparecer}
            onChange={(v) => handlePrivacyToggle("aparecer_en_ranking", v)}
            label={t("settings.privacy.rankingLabel")}
            description={t(aparecer ? "settings.privacy.rankingOn" : "settings.privacy.rankingOff")}
          />
          <p style={{ fontSize: 12, color: "#ccc", marginTop: 20, lineHeight: 1.5 }}>
            {t("settings.privacy.note")}
          </p>
        </div>
      )}

      {/* ── Tab: Preferencias ─────────────────────────────────────────── */}
      {tab === "preferencias" && (
        <div>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>
            {t("settings.prefs.audioNote")}
          </p>
          <Toggle
            value={soundsOn}
            onChange={handleSoundsToggle}
            label={t("settings.prefs.audioTitle")}
            description={t(soundsOn ? "settings.prefs.audioOn" : "settings.prefs.audioOff")}
          />

          {/* ── Selector de idioma ── */}
          <div style={{ paddingTop: 24 }}>
            <div style={{ fontWeight: 600, color: "#111", marginBottom: 10 }}>
              {t("settings.prefs.languageTitle")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {LANGUAGES.map(({ code, label, flag }) => {
                const active = i18n.language?.startsWith(code);
                return (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 10,
                      border: `2px solid ${active ? "#d4af37" : "#e0e0e0"}`,
                      background: active ? "#fffbee" : "#fafafa",
                      fontWeight: active ? 700 : 400,
                      color: active ? "#8b6b2e" : "#555",
                      cursor: "pointer",
                      fontSize: 14,
                      transition: "all 0.15s",
                    }}
                  >
                    {flag} {label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "#ccc", marginTop: 10 }}>
              {t("settings.prefs.languageNote")}
            </p>
          </div>
        </div>
      )}

      {/* Avatar selector modal */}
      {showAvatarSelector && session && (
        <AvatarSelector
          profile={localProfile}
          session={session}
          onSave={(url) => {
            setLocalProfile((p) => ({ ...p, avatar_url: url }));
            setShowAvatarSelector(false);
          }}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </div>
  );
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#555",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
};
const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0",
  borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fafafa",
};

export default Configuracion;
