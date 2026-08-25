import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { RAREZA_BADGE } from "../utils/rareza";
import { ACHIEVEMENTS } from "../utils/achievements";
import AvatarFrame from "../components/AvatarFrame";
import EquippedTag from "../components/EquippedTag";
import ChapaIcon from "../components/ChapaIcon";
import { CheckCircleFillIcon, LockIcon } from "@primer/octicons-react";
import { toastError, toastSave } from "../utils/toast";

const ACH_BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

const TiendaPage = () => {
  const { t } = useTranslation();
  const [category, setCategory]   = useState("tag");
  const [items, setItems]         = useState([]);
  const [owned, setOwned]         = useState(new Set());
  const [achievements, setAchievements] = useState(new Set());
  const [profile, setProfile]     = useState(null);
  const [userId, setUserId]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [busySlug, setBusySlug]   = useState(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;
    setUserId(uid);

    const [itemsRes, ownedRes, profileRes, achRes] = await Promise.all([
      supabase.from("cosmetic_items").select("*").eq("active", true),
      supabase.from("user_cosmetics").select("item_slug").eq("user_id", uid),
      supabase.from("profiles").select("chapas, prestige, equipped_tag_slug, equipped_frame_slug, avatar_url, username").eq("id", uid).single(),
      supabase.from("user_achievements").select("slug").eq("user_id", uid),
    ]);

    setItems(itemsRes.data || []);
    setOwned(new Set((ownedRes.data || []).map((r) => r.item_slug)));
    setProfile(profileRes.data);
    setAchievements(new Set((achRes.data || []).map((r) => r.slug)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (slug) => {
    setBusySlug(slug);
    const { error } = await supabase.rpc("purchase_cosmetic", { p_slug: slug });
    setBusySlug(null);
    if (error) { toastError(error.message); return; }
    toastSave(0, false);
    load();
  };

  const handleEquip = async (cat, slug) => {
    setBusySlug(slug || `unequip-${cat}`);
    const { error } = await supabase.rpc("equip_cosmetic", { p_category: cat, p_slug: slug });
    setBusySlug(null);
    if (error) { toastError(error.message); return; }
    load();
  };

  if (loading) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("shop.loading")}</p>;
  if (!userId) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("shop.needLogin")}</p>;

  const visibleItems = items.filter((i) => i.category === category);
  const equippedSlug = category === "tag" ? profile?.equipped_tag_slug : profile?.equipped_frame_slug;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, color: "#f0e4cc" }}>🎖️ {t("shop.title")}</h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
          borderRadius: 999, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
        }}>
          <ChapaIcon size={17} />
          <span style={{ fontWeight: 700, color: "#d4af37", fontSize: 15 }}>
            {(profile?.chapas ?? 0).toLocaleString()} {t("shop.chapas")}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["tag", "frame"].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: c === category ? "1px solid #d4af37" : "1px solid #2e2215",
              background: c === category ? "rgba(212,175,55,0.12)" : "#1c1409",
              color: c === category ? "#d4af37" : "#9a7d62",
            }}
          >
            {c === "tag" ? t("shop.tabTags") : t("shop.tabFrames")}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {visibleItems.map((item) => (
          <ItemCard
            key={item.slug}
            item={item}
            owned={owned.has(item.slug)}
            equipped={equippedSlug === item.slug}
            chapas={profile?.chapas ?? 0}
            prestige={profile?.prestige ?? 0}
            hasAchievement={item.unlock_achievement_slug ? achievements.has(item.unlock_achievement_slug) : true}
            achievementName={item.unlock_achievement_slug ? (ACH_BY_SLUG.get(item.unlock_achievement_slug)?.nombre || item.unlock_achievement_slug) : null}
            profile={profile}
            busy={busySlug === item.slug || busySlug === `unequip-${item.category}`}
            onBuy={() => handleBuy(item.slug)}
            onEquip={() => handleEquip(item.category, item.slug)}
            onUnequip={() => handleEquip(item.category, null)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

const ItemCard = ({
  item, owned, equipped, chapas, hasAchievement, achievementName,
  profile, prestige, busy, onBuy, onEquip, onUnequip, t,
}) => {
  const rb = RAREZA_BADGE[item.rarity] || RAREZA_BADGE.comun;
  const isExclusive = item.cost === 0 && (item.unlock_achievement_slug || item.unlock_min_prestige);
  const meetsGate = item.unlock_achievement_slug ? hasAchievement : (item.unlock_min_prestige ? prestige >= item.unlock_min_prestige : true);
  const canAfford = chapas >= item.cost;

  // Preview con la identidad real del usuario (avatar/nombre propios,
  // estilo "probador" de Rocket League) — si el ítem que se mira es un
  // marco/etiqueta, se previsualiza ESE; el otro slot muestra lo que el
  // usuario ya tiene equipado, para ver el combo completo tal cual
  // quedaría en sidebar/feed/perfil.
  const previewFrameSlug = item.category === "frame" ? item.slug : profile?.equipped_frame_slug;
  const previewTagSlug   = item.category === "tag"   ? item.slug : profile?.equipped_tag_slug;

  return (
    <div style={{
      background: "#1c1409", borderRadius: 14, padding: "16px 18px",
      border: `1px solid ${equipped ? "#d4af37" : rb.border.replace("0.3", "0.4").replace("0.2", "0.3")}`,
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: equipped ? "0 0 0 1px rgba(212,175,55,0.3)" : "none",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "6px 0" }}>
        <AvatarFrame frameSlug={previewFrameSlug} avatarUrl={profile?.avatar_url} nombre={profile?.username} size={56} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f0e4cc", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {profile?.username}
        </p>
        {previewTagSlug && <EquippedTag slug={previewTagSlug} size="sm" />}
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#f0e4cc", fontFamily: "'Playfair Display', serif" }}>
          {t(`shop.item.${item.slug}.label`)}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#9a7d62", lineHeight: 1.4 }}>
          {t(`shop.item.${item.slug}.description`)}
        </p>
      </div>

      <span style={{
        alignSelf: "center", fontSize: 10, fontWeight: 700, padding: "2px 10px",
        borderRadius: 999, color: rb.color, background: rb.bg, border: `1px solid ${rb.border}`,
      }}>
        {t(`rareza.${item.rarity}`)}
      </span>

      {equipped ? (
        <button onClick={onUnequip} disabled={busy} style={{ ...btnBase, background: "rgba(212,175,55,0.15)", color: "#d4af37", border: "1px solid #d4af37" }}>
          <CheckCircleFillIcon size={13} /> {t("shop.equipped")}
        </button>
      ) : owned ? (
        <button onClick={onEquip} disabled={busy} style={{ ...btnBase, background: "#d4af37", color: "#0d0a06", border: "none" }}>
          {t("shop.equipBtn")}
        </button>
      ) : !meetsGate ? (
        <div style={{ ...btnBase, background: "none", border: "1px solid #2e2215", color: "#5a4535", cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <LockIcon size={12} />
          {item.unlock_achievement_slug ? t("shop.lockedAchievement", { name: achievementName }) : t("shop.lockedPrestige", { n: item.unlock_min_prestige })}
        </div>
      ) : isExclusive ? (
        <button onClick={onBuy} disabled={busy} style={{ ...btnBase, background: "#d4af37", color: "#0d0a06", border: "none" }}>
          {t("shop.claimBtn")}
        </button>
      ) : (
        <button
          onClick={onBuy}
          disabled={busy || !canAfford}
          style={{
            ...btnBase,
            background: canAfford ? "#d4af37" : "#2a1e0f",
            color: canAfford ? "#0d0a06" : "#5a4535",
            border: canAfford ? "none" : "1px solid #2e2215",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}
        >
          {t("shop.buyBtn", { cost: item.cost })}
        </button>
      )}
    </div>
  );
};

const btnBase = {
  padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

export default TiendaPage;
