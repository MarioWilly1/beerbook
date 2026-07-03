import React, { useState } from "react";
import { useRanking } from "../hooks/useRanking";
import { getLevelInfo } from "../utils/xp";

const MEDAL = ["🥇", "🥈", "🥉"];

const TABS = [
  { key: "total",   label: "🏅 Total histórico" },
  { key: "semanal", label: "📅 Esta semana"      },
  { key: "amigos",  label: "👥 Entre amigos"     },
];

const RankingRow = ({ entry, isSelf }) => {
  const pos = Number(entry.rank_pos);
  const { levelName } = getLevelInfo(Number(entry.total_xp));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
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
      }}
    >
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#888" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>

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
        <div style={{ fontSize: 11, color: "#aaa" }}>🍺 {entry.total_beers}</div>
      </div>
    </div>
  );
};

const Ranking = () => {
  const { rankingTotal, rankingSemanal, rankingAmigos, loading, currentUserId } = useRanking();
  const [tab, setTab] = useState("total");

  const list =
    tab === "total"   ? rankingTotal   :
    tab === "semanal" ? rankingSemanal :
    rankingAmigos;

  const selfEntry  = rankingTotal.find((e) => e.id === currentUserId);
  const selfInList = list.some((e) => e.id === currentUserId);

  const emptyMsg =
    tab === "semanal" ? "Nadie agregó cervezas esta semana todavía." :
    tab === "amigos"  ? "Agregá amigos para ver el ranking entre amigos." :
    "El ranking está vacío.";

  const subtitle =
    tab === "total"   ? "XP histórico total" :
    tab === "semanal" ? "Cervezas nuevas en los últimos 7 días" :
    "Vos y tus amigos, ordenados por XP";

  if (loading) return <p style={{ padding: 24 }}>Cargando ranking...</p>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>🏆 Ranking BeerBook</h2>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 20px" }}>{subtitle}</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              background: tab === key ? "#d4af37" : "#f0f0f0",
              color:      tab === key ? "#111"    : "#666",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center", padding: 40 }}>{emptyMsg}</p>
      ) : (
        <>
          {list.map((entry) => (
            <RankingRow
              key={entry.id}
              entry={entry}
              isSelf={entry.id === currentUserId}
            />
          ))}

          {/* Show self below list if not in top 50 (global only) */}
          {tab === "total" && !selfInList && selfEntry && (
            <>
              <div style={{ textAlign: "center", color: "#ccc", margin: "8px 0", fontSize: 13 }}>
                · · ·
              </div>
              <RankingRow entry={selfEntry} isSelf />
            </>
          )}

          {tab === "total" && !selfInList && !selfEntry && (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
              Aún no aparecés en el ranking — registrá tu primera cerveza para entrar.
            </p>
          )}

          {tab === "amigos" && list.length === 1 && (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
              Solo aparecés vos. Invitá amigos para tener más competencia.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Ranking;
