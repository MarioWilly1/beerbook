import React, { useState } from "react";
import { useRanking } from "../hooks/useRanking";
import { getLevelInfo } from "../utils/xp";
import Avatar from "../components/Avatar";

const MEDAL = ["🥇", "🥈", "🥉"];

const SCOPE_TABS = [
  { key: "total",   label: "🏅 Total histórico" },
  { key: "semanal", label: "📅 Esta semana"      },
  { key: "amigos",  label: "👥 Entre amigos"     },
];

const DIM_OPTIONS = [
  { key: "xp",    label: "⭐ XP Total"             },
  { key: "beers", label: "🍺 Cervezas Verificadas" },
];

const SUBTITLES = {
  xp: {
    total:   "XP histórico acumulado · solo entradas con foto",
    semanal: "Cervezas verificadas nuevas en los últimos 7 días",
    amigos:  "Vos y tus amigos, ordenados por XP total",
  },
  beers: {
    total:  "Quién registró más cervezas verificadas (con foto)",
    amigos: "Quién registró más cervezas verificadas entre tus amigos",
  },
};

const EMPTY_MSGS = {
  xp: {
    total:   "El ranking está vacío.",
    semanal: "Nadie agregó cervezas verificadas esta semana todavía.",
    amigos:  "Agregá amigos para ver el ranking entre amigos.",
  },
  beers: {
    total:  "Nadie tiene cervezas verificadas todavía.",
    amigos: "Ninguno de tus amigos tiene cervezas verificadas todavía.",
  },
};

// ── Row components ────────────────────────────────────────────────────────────

const RankingRowXP = ({ entry, isSelf }) => {
  const pos = Number(entry.rank_pos);
  const { levelName } = getLevelInfo(Number(entry.total_xp));
  return (
    <div style={rowStyle(isSelf, pos)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#888" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: "#111" }}>
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#d4af37", marginLeft: 8 }}>← vos</span>}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>{levelName}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#b8941f" }}>
          ⭐ {Number(entry.total_xp).toLocaleString()} XP
        </div>
        <div style={{ fontSize: 11, color: "#aaa" }}>🍺 {entry.total_beers} verificadas</div>
      </div>
    </div>
  );
};

const RankingRowBeers = ({ entry, isSelf }) => {
  const pos = Number(entry.rank_pos);
  return (
    <div style={rowStyle(isSelf, pos)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#888" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: "#111" }}>
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#d4af37", marginLeft: 8 }}>← vos</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e8449" }}>
          🍺 {entry.total_beers}
        </div>
        <div style={{ fontSize: 11, color: "#aaa" }}>verificadas</div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const Ranking = () => {
  const {
    rankingTotal, rankingSemanal, rankingAmigos,
    rankingTotalBeers, rankingAmigosBeers,
    loading, currentUserId,
  } = useRanking();

  const [scope, setScope] = useState("total");
  const [dim,   setDim]   = useState("xp");

  const handleDimChange = (newDim) => {
    setDim(newDim);
    if (newDim === "beers" && scope === "semanal") setScope("total");
  };

  const list =
    dim === "beers"
      ? (scope === "amigos" ? rankingAmigosBeers : rankingTotalBeers)
      : scope === "total"   ? rankingTotal
      : scope === "semanal" ? rankingSemanal
      : rankingAmigos;

  const selfEntryXP    = rankingTotal.find((e) => e.id === currentUserId);
  const selfEntryBeers = rankingTotalBeers.find((e) => e.id === currentUserId);
  const selfEntry      = dim === "beers" ? selfEntryBeers : selfEntryXP;
  const selfInList     = list.some((e) => e.id === currentUserId);

  const subtitle  = SUBTITLES[dim][scope]     || "";
  const emptyMsg  = EMPTY_MSGS[dim][scope]    || "El ranking está vacío.";
  const RowComp   = dim === "beers" ? RankingRowBeers : RankingRowXP;

  if (loading) return <p style={{ padding: 24 }}>Cargando ranking...</p>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>🏆 Ranking BeerBook</h2>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 20px" }}>{subtitle}</p>

      {/* Dimension switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {DIM_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleDimChange(key)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: dim === key ? "2px solid #b8941f" : "2px solid #e0e0e0",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              background: dim === key ? "#fffbee" : "#fafafa",
              color:      dim === key ? "#b8941f" : "#888",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scope tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SCOPE_TABS.map(({ key, label }) => {
          const disabled = dim === "beers" && key === "semanal";
          const active   = scope === key;
          return (
            <button
              key={key}
              onClick={() => !disabled && setScope(key)}
              disabled={disabled}
              title={disabled ? "No disponible en modo Cervezas Verificadas" : undefined}
              style={{
                padding: "8px 16px", borderRadius: 8,
                border: "none", fontWeight: 600, fontSize: 13,
                cursor: disabled ? "not-allowed" : "pointer",
                background: disabled ? "#f0f0f0" : active ? "#d4af37" : "#f0f0f0",
                color:      disabled ? "#ccc"    : active ? "#111"    : "#666",
                opacity:    disabled ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center", padding: 40 }}>{emptyMsg}</p>
      ) : (
        <>
          {list.map((entry) => (
            <RowComp key={entry.id} entry={entry} isSelf={entry.id === currentUserId} />
          ))}

          {/* Self entry if not visible in list */}
          {scope === "total" && !selfInList && selfEntry && (
            <>
              <div style={{ textAlign: "center", color: "#ccc", margin: "8px 0", fontSize: 13 }}>· · ·</div>
              <RowComp entry={selfEntry} isSelf />
            </>
          )}

          {scope === "total" && !selfInList && !selfEntry && (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
              {dim === "beers"
                ? "Aún no aparecés — subí fotos de tus cervezas para entrar."
                : "Aún no aparecés en el ranking — registrá tu primera cerveza para entrar."}
            </p>
          )}

          {scope === "amigos" && list.length === 1 && (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
              Solo aparecés vos. Invitá amigos para tener más competencia.
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const rowStyle = (isSelf, pos) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  marginBottom: 8,
  borderRadius: 12,
  background: isSelf ? "#fffbee" : "#fff",
  border: isSelf
    ? "2px solid #d4af37"
    : pos <= 3
    ? `2px solid ${["#ffd700", "#c0c0c0", "#cd7f32"][pos - 1]}`
    : "1px solid #eee",
  fontWeight: isSelf ? 700 : 400,
});

export default Ranking;
