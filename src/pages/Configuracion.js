import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { useBadges } from "../hooks/useBadges";
import { TIER_META } from "../utils/badges";
import Avatar from "../components/Avatar";
import AvatarSelector from "../components/AvatarSelector";
import HiddenStoriesManager from "../components/HiddenStoriesManager";
import HiddenEntriesManager from "../components/HiddenEntriesManager";
import Onboarding from "../components/Onboarding";
import { getWorldCountries, findCountryByName } from "../utils/worldCountries";

const TABS = [
  { key: "perfil",       icon: "👤", tKey: "settings.tabs.profile"     },
  { key: "privacidad",   icon: "🔒", tKey: "settings.tabs.privacy"     },
  { key: "preferencias", icon: "🎛", tKey: "settings.tabs.preferences" },
  { key: "ayuda",        icon: "🆘", tKey: "settings.tabs.support"     },
];

const LANGUAGES = [
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
];

const Toggle = ({ value, onChange, label, description }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 0", borderBottom: "1px solid #2e2215" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: "#f0e4cc", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#9a7d62", lineHeight: 1.5 }}>{description}</div>
    </div>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 26, borderRadius: 13, border: "none",
        cursor: "pointer", background: value ? "#2a6b3a" : "#2a1e0f",
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: value ? 25 : 3, width: 20, height: 20,
        borderRadius: "50%", background: value ? "#f0e4cc" : "#5a4535",
        display: "block", transition: "left 0.2s",
      }} />
    </button>
  </div>
);

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
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { badges } = useBadges();
  const unlockedBadges = badges.filter((b) => b.currentTier);

  const countryOptions = useMemo(() => getWorldCountries(i18n.language), [i18n.language]);
  // Si el valor ya guardado (texto libre histórico) no matchea ningún país
  // de la lista actual, se agrega como opción extra para no perderlo ni
  // mostrar el select vacío — queda seleccionada hasta que el usuario elija otra.
  const unmatchedPais = pais && !findCountryByName(pais, i18n.language) ? pais : null;

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
    return <p style={{ padding: 24, color: "#9a7d62" }}>{t("settings.loading")}</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 24px" }}>⚙️ {t("settings.pageTitle")}</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "2px solid #2e2215", overflowX: "auto" }}>
        {TABS.map(({ key, icon, tKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 22px", border: "none", background: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 14,
              color: tab === key ? "#d4af37" : "#5a4535",
              borderBottom: tab === key ? "3px solid #d4af37" : "3px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}
          >
            {icon} {t(tKey)}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === "perfil" && (
        <div>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: 16, background: "#1c1409", borderRadius: 12, border: "1px solid #2e2215" }}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowAvatarSelector(true)}>
              <Avatar avatarUrl={localProfile?.avatar_url} nombre={localProfile?.nombre} size={64} />
              <span style={{ position: "absolute", bottom: 0, right: 0, background: "#d4af37", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                ✏️
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f0e4cc" }}>{localProfile?.nombre || "—"}</div>
              <button
                onClick={() => setShowAvatarSelector(true)}
                style={{ fontSize: 12, color: "#d4af37", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}
              >
                {t("settings.profile.changeAvatar")}
              </button>
            </div>
          </div>

          {/* Nombre */}
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
              style={{ ...inputStyle, borderColor: nombreError ? "#8b2020" : "#2e2215" }}
              autoCapitalize="words"
              spellCheck="false"
              autoCorrect="off"
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 11, color: "#8b2020" }}>{nombreError}</span>
              <span style={{ fontSize: 11, color: nombre.length >= 28 ? "#8b2020" : "#5a4535" }}>
                {nombre.length}/30
              </span>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t("settings.profile.bioLabel")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder={t("settings.profile.bioPlaceholder")}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              spellCheck="true"
              autoCorrect="on"
              autoCapitalize="sentences"
            />
            <div style={{ fontSize: 11, color: bio.length >= 180 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
              {bio.length}/200
            </div>
          </div>

          {/* País */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>{t("settings.profile.countryLabel")}</label>
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t("settings.profile.countryPlaceholder")}</option>
              {unmatchedPais && <option value={unmatchedPais}>{unmatchedPais}</option>}
              {countryOptions.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Insignias destacadas */}
          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>
              {t("settings.profile.featuredBadgesLabel")}{" "}
              <span style={{ fontWeight: 400, color: "#5a4535", textTransform: "none" }}>
                {t("settings.profile.featuredBadgesCount", { count: featuredBadges.length })}
              </span>
            </label>
            {unlockedBadges.length === 0 ? (
              <p style={{ color: "#5a4535", fontSize: 13, margin: "8px 0" }}>
                {t("settings.profile.noBadgesHint")}
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {unlockedBadges.map((badge) => {
                  const selected = featuredBadges.includes(badge.slug);
                  const disabled = !selected && featuredBadges.length >= 3;
                  const tierColor = TIER_META[badge.currentTier].color;
                  return (
                    <button
                      key={badge.slug}
                      onClick={() => !disabled && toggleFeaturedBadge(badge.slug)}
                      title={
                        disabled
                          ? t("settings.profile.maxBadgesHint")
                          : `${t(`badge.${badge.slug}.name`)} · ${t(`badge.tier.${badge.currentTier}`)}`
                      }
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", borderRadius: 20,
                        border: `2px solid ${selected ? tierColor : "#2e2215"}`,
                        background: selected ? "rgba(255,255,255,0.05)" : "#2a1e0f",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.35 : 1,
                        fontWeight: selected ? 700 : 400,
                        fontSize: 13, transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{badge.icon}</span>
                      <span style={{ color: selected ? tierColor : "#9a7d62" }}>{t(`badge.${badge.slug}.name`)}</span>
                      {selected && <span style={{ fontSize: 11, color: "#2a6b3a" }}>✓</span>}
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
              background: saved ? "#2a6b3a" : "#d4af37",
              color: saved ? "#f0e4cc" : "#0d0a06",
              opacity: saving ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {saved ? t("settings.profile.savedBtn") : saving ? t("settings.profile.savingBtn") : t("settings.profile.saveBtn")}
          </button>
        </div>
      )}

      {/* Tab: Privacidad */}
      {tab === "privacidad" && (
        <div>
          <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>
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
          <p style={{ fontSize: 12, color: "#5a4535", marginTop: 20, lineHeight: 1.5 }}>
            {t("settings.privacy.note")}
          </p>

          {/* Ocultar historias de amigos específicos */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #2e2215" }}>
            <div style={{ fontWeight: 700, color: "#f0e4cc", marginBottom: 4, fontSize: 15 }}>
              🫣 {t("settings.privacy.hiddenStories.title")}
            </div>
            <p style={{ fontSize: 13, color: "#9a7d62", margin: "0 0 14px", lineHeight: 1.5 }}>
              {t("settings.privacy.hiddenStories.description")}
            </p>
            {session && <HiddenStoriesManager currentUserId={session.user.id} />}
          </div>

          {/* Ocultar cervezas de amigos específicos */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #2e2215" }}>
            <div style={{ fontWeight: 700, color: "#f0e4cc", marginBottom: 4, fontSize: 15 }}>
              🙈 {t("settings.privacy.hiddenEntries.title")}
            </div>
            <p style={{ fontSize: 13, color: "#9a7d62", margin: "0 0 14px", lineHeight: 1.5 }}>
              {t("settings.privacy.hiddenEntries.description")}
            </p>
            {session && <HiddenEntriesManager currentUserId={session.user.id} />}
          </div>
        </div>
      )}

      {/* Tab: Preferencias */}
      {tab === "preferencias" && (
        <div>
          <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>
            {t("settings.prefs.audioNote")}
          </p>
          <Toggle
            value={soundsOn}
            onChange={handleSoundsToggle}
            label={t("settings.prefs.audioTitle")}
            description={t(soundsOn ? "settings.prefs.audioOn" : "settings.prefs.audioOff")}
          />

          {/* Selector de idioma */}
          <div style={{ paddingTop: 24 }}>
            <div style={{ fontWeight: 600, color: "#f0e4cc", marginBottom: 10 }}>
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
                      border: `2px solid ${active ? "#d4af37" : "#2e2215"}`,
                      background: active ? "rgba(212,175,55,0.12)" : "#2a1e0f",
                      fontWeight: active ? 700 : 400,
                      color: active ? "#d4af37" : "#9a7d62",
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
            <p style={{ fontSize: 12, color: "#5a4535", marginTop: 10 }}>
              {t("settings.prefs.languageNote")}
            </p>
          </div>

          {/* Volver a ver la introducción animada */}
          <div style={{ paddingTop: 24, marginTop: 24, borderTop: "1px solid #2e2215" }}>
            <div style={{ fontWeight: 600, color: "#f0e4cc", marginBottom: 10 }}>
              {t("settings.prefs.onboardingTitle")}
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "1px solid #2e2215",
                background: "#2a1e0f", color: "#d4af37", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("settings.prefs.onboardingBtn")}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Ayuda y Soporte */}
      {tab === "ayuda" && session && <SupportTab session={session} t={t} />}

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

      {showOnboarding && session && (
        <Onboarding
          userId={session.user.id}
          onFinish={() => {
            setShowOnboarding(false);
            if (onProfileChange) onProfileChange({ onboarding_visto: true });
          }}
        />
      )}
    </div>
  );
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
};
const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1px solid #2e2215",
  borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#2a1e0f", color: "#f0e4cc",
};

// ── Tab Ayuda y Soporte ───────────────────────────────────────────────────────
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

const SupportTab = ({ session, t }) => {
  const [subject, setSubject]     = useState("");
  const [message, setMessage]     = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [tickets, setTickets]     = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setTicketsLoading(false);
  }, [session.user.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (!error) {
      setSubject("");
      setMessage("");
      setSent(true);
      await loadTickets();
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  };

  return (
    <div>
      <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        {t("settings.support.description")}
      </p>

      {/* Formulario */}
      <div style={{ background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t("settings.support.subjectLabel")}</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 120))}
            placeholder={t("settings.support.subjectPlaceholder")}
            style={inputStyle}
            disabled={sending}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t("settings.support.messageLabel")}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
            placeholder={t("settings.support.messagePlaceholder")}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
            disabled={sending}
            spellCheck="true"
            autoCorrect="on"
            autoCapitalize="sentences"
          />
          <div style={{ fontSize: 11, color: message.length > 900 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
            {message.length}/1000
          </div>
        </div>
        {sent ? (
          <p style={{ color: "#4caf50", fontWeight: 600, fontSize: 14, margin: 0 }}>
            ✓ {t("settings.support.sent")}
          </p>
        ) : (
          <button
            onClick={handleSend}
            disabled={!subject.trim() || !message.trim() || sending}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: !subject.trim() || !message.trim() || sending ? "#2a1e0f" : "#d4af37",
              color: !subject.trim() || !message.trim() || sending ? "#5a4535" : "#0d0a06",
              fontWeight: 700, fontSize: 14,
              cursor: !subject.trim() || !message.trim() || sending ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {sending ? t("settings.support.sending") : t("settings.support.sendBtn")}
          </button>
        )}
      </div>

      {/* Historial */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#f0e4cc" }}>
          {t("settings.support.historyTitle")}
        </h3>
        {ticketsLoading ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("settings.loading")}</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>{t("settings.support.historyEmpty")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tickets.map((tk) => (
              <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                  background: tk.status === "open" ? "rgba(212,175,55,0.12)" : "rgba(42,107,58,0.18)",
                  color: tk.status === "open" ? "#d4af37" : "#4caf50",
                }}>
                  {tk.status === "open" ? t("settings.support.statusOpen") : t("settings.support.statusResolved")}
                </span>
                <span style={{ flex: 1, color: "#f0e4cc", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tk.subject}
                </span>
                <span style={{ fontSize: 12, color: "#5a4535", flexShrink: 0 }}>
                  {fmtDate(tk.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;
