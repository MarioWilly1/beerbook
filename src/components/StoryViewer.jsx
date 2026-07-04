import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { getSignedStoryUrl } from "../hooks/useStories";
import Avatar from "./Avatar";

const STORY_DURATION_MS = 5000; // 5 s por historia

// ─── StoryViewer ─────────────────────────────────────────────────────────────
// props:
//   groups            — array de { userId, nombre, avatarUrl, stories[] }
//   initialGroupIndex — índice del grupo al abrir
//   initialStoryIndex — índice de la historia dentro del grupo
//   currentUserId     — uid del viewer
//   onMarkSeen(storyId, ownerId)
//   onClose()
//   onOpenCreator()   — abre el creator (tap en propio grupo vacío)

const StoryViewer = ({
  groups,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  currentUserId,
  onMarkSeen,
  onClose,
  onOpenCreator,
}) => {
  const { t } = useTranslation();

  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex);
  const [signedUrl,  setSignedUrl]  = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [paused,     setPaused]     = useState(false);
  const [viewers,    setViewers]    = useState(null); // lista de viewers de historia propia
  const [showViewers, setShowViewers] = useState(false);

  // Progress bar: valor 0→1 animado
  const [progress, setProgress] = useState(0);

  const progressRef  = useRef(null); // rAF id
  const startTimeRef = useRef(null);
  const pausedAtRef  = useRef(0);    // fracción donde se pausó

  // Touch tracking para swipe
  const touchRef = useRef({ startX: 0, startY: 0, active: false });
  // Ref para que startProgress siempre llame al goNext actualizado (evita closure viejo)
  const goNextRef = useRef(null);

  const group   = groups[groupIdx];
  const story   = group?.stories[storyIdx];
  const isMine  = group?.userId === currentUserId;
  const isPhoto = story?.type === "photo";

  // ── Cargar signed URL cuando cambia la historia ──────────────────────────
  useEffect(() => {
    setSignedUrl(null);
    setShowViewers(false);
    if (!story) return;

    if (isPhoto && story.photo_path) {
      setUrlLoading(true);
      getSignedStoryUrl(story.photo_path).then((url) => {
        setSignedUrl(url);
        setUrlLoading(false);
      });
    }

    // Marcar como vista
    onMarkSeen?.(story.id, group.userId);

    // Cargar viewers si es historia propia
    if (isMine) loadViewers(story.id);
  }, [groupIdx, storyIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadViewers = async (storyId) => {
    const { data } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at, profiles(nombre, avatar_url)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });
    setViewers(data || []);
  };

  // ── Progress bar ─────────────────────────────────────────────────────────
  const stopProgress = useCallback(() => {
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
  }, []);

  const startProgress = useCallback((fromFraction = 0) => {
    stopProgress();
    setProgress(fromFraction);
    const elapsed = fromFraction * STORY_DURATION_MS;
    startTimeRef.current = performance.now() - elapsed;

    const tick = (now) => {
      const fraction = Math.min((now - startTimeRef.current) / STORY_DURATION_MS, 1);
      setProgress(fraction);
      if (fraction < 1) {
        progressRef.current = requestAnimationFrame(tick);
      } else {
        goNextRef.current?.();
      }
    };
    progressRef.current = requestAnimationFrame(tick);
  }, [stopProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esperar a que la imagen cargue antes de iniciar la barra (foto)
  useEffect(() => {
    if (!story) return;
    if (paused || showViewers) return;
    if (isPhoto && !signedUrl) return; // esperar la URL

    startProgress(0);
    return stopProgress;
  }, [story, signedUrl, paused, showViewers, isPhoto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pausar / reanudar
  useEffect(() => {
    if (paused || showViewers) {
      stopProgress();
      pausedAtRef.current = progress;
    } else if (story) {
      if (isPhoto && !signedUrl) return;
      startProgress(pausedAtRef.current);
    }
  }, [paused, showViewers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navegación ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setProgress(0);
    stopProgress();
    if (storyIdx < (groups[groupIdx]?.stories.length ?? 0) - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [groupIdx, storyIdx, groups, stopProgress, onClose]);
  // Mantener la ref siempre actualizada para que startProgress use la versión correcta
  goNextRef.current = goNext;

  const goPrev = useCallback(() => {
    setProgress(0);
    stopProgress();
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [groupIdx, storyIdx, groups, stopProgress]);

  // ── Tap zones (izquierda / derecha) ──────────────────────────────────────
  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    if (x < rect.width * 0.33) goPrev();
    else goNext();
  };

  // ── Swipe ──────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, active: true };
    setPaused(true);
  };

  const onTouchMove = (e) => {
    if (!touchRef.current.active) return;
    // Permitir propagación para scroll nativo del navegador si el gesto es vertical
  };

  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    setPaused(false);

    const { startX, startY } = touchRef.current;
    const t  = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Swipe hacia abajo → cerrar
    if (ady > adx && dy > 60) { onClose(); return; }

    // Swipe horizontal → cambiar grupo
    if (adx > ady && adx > 50) {
      if (dx < 0 && groupIdx < groups.length - 1) {
        setGroupIdx((g) => g + 1); setStoryIdx(0);
      } else if (dx > 0 && groupIdx > 0) {
        setGroupIdx((g) => g - 1); setStoryIdx(0);
      }
      return;
    }

    // Tap (movimiento mínimo) → avanzar/retroceder
    if (adx < 10 && ady < 10) handleTap(e);
  };

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!story) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={overlayStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
    >
      {/* Contenido de la historia */}
      <div style={storyContainerStyle} onClick={handleTap}>
        {isPhoto ? (
          urlLoading
            ? <div style={spinnerStyle} />
            : signedUrl
              ? <img
                  src={signedUrl}
                  alt=""
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              : <div style={{ ...textBgStyle, background: "#1c1409" }}>
                  <span style={{ color: "#5a4535", fontSize: 14 }}>
                    {t("stories.photoUnavailable")}
                  </span>
                </div>
        ) : (
          <div style={{ ...textBgStyle, background: story.text_bg }}>
            <p style={storyTextStyle}>{story.text_content}</p>
          </div>
        )}
      </div>

      {/* ── UI superpuesta ── */}

      {/* Barras de progreso (top) */}
      <div style={progressContainerStyle}>
        {group.stories.map((s, i) => (
          <div key={s.id} style={progressTrackStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: i < storyIdx
                  ? "100%"
                  : i === storyIdx
                  ? `${progress * 100}%`
                  : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header: avatar + nombre + tiempo */}
      <div style={headerStyle}>
        <Avatar avatarUrl={group.avatarUrl} nombre={group.nombre} size={36} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#f0e4cc", lineHeight: 1.2 }}>
            {group.nombre}
            {isMine && (
              <span style={{ fontWeight: 400, color: "#9a7d62", marginLeft: 6, fontSize: 11 }}>
                {t("stories.ownLabel")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "rgba(240,228,204,0.55)", marginTop: 2 }}>
            {timeAgo(story.created_at)}
          </div>
        </div>

        {/* Botón cerrar */}
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      {/* Footer: "visto por" (solo mis historias) */}
      {isMine && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowViewers((v) => !v); }}
          style={viewersFooterBtn}
        >
          👁 {viewers ? viewers.length : "—"} {t("stories.viewers")}
        </button>
      )}

      {/* Panel de viewers */}
      {showViewers && isMine && (
        <div style={viewersPanelStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: "#f0e4cc", fontSize: 13 }}>
              👁 {t("stories.viewedBy")} ({viewers?.length || 0})
            </span>
            <button onClick={() => setShowViewers(false)} style={closeBtnStyle}>✕</button>
          </div>
          {(!viewers || viewers.length === 0) ? (
            <p style={{ color: "#5a4535", fontSize: 12, textAlign: "center" }}>
              {t("stories.noViewersYet")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {viewers.map((v) => (
                <div key={v.viewer_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar avatarUrl={v.profiles?.avatar_url} nombre={v.profiles?.nombre} size={32} />
                  <span style={{ fontSize: 13, color: "#f0e4cc" }}>{v.profiles?.nombre || "?"}</span>
                  <span style={{ fontSize: 11, color: "#5a4535", marginLeft: "auto" }}>
                    {timeAgo(v.viewed_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navegación lateral entre grupos (flechas en desktop) */}
      {groupIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGroupIdx((g) => g - 1); setStoryIdx(0); }}
          style={{ ...navBtnStyle, left: 8 }}
        >
          ‹
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGroupIdx((g) => g + 1); setStoryIdx(0); }}
          style={{ ...navBtnStyle, right: 8 }}
        >
          ›
        </button>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(minutes / 60);
  if (minutes < 1)  return "ahora";
  if (minutes < 60) return `${minutes}m`;
  return `${hours}h`;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const overlayStyle = {
  position:       "fixed",
  inset:          0,
  background:     "#000",
  zIndex:         9999,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  userSelect:     "none",
  WebkitUserSelect: "none",
  touchAction:    "none",
};

const storyContainerStyle = {
  position:       "relative",
  width:          "100%",
  maxWidth:       480,
  height:         "100dvh",
  overflow:       "hidden",
};

const textBgStyle = {
  width:          "100%",
  height:         "100%",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  padding:        "0 32px",
};

const storyTextStyle = {
  fontSize:   "clamp(20px, 5vw, 32px)",
  fontWeight: 700,
  color:      "#f0e4cc",
  textAlign:  "center",
  lineHeight: 1.4,
  margin:     0,
  fontFamily: "'Playfair Display', serif",
};

const progressContainerStyle = {
  position:       "absolute",
  top:            12,
  left:           12,
  right:          12,
  display:        "flex",
  gap:            4,
  zIndex:         10,
};

const progressTrackStyle = {
  flex:           1,
  height:         2,
  background:     "rgba(255,255,255,0.3)",
  borderRadius:   2,
  overflow:       "hidden",
};

const progressFillStyle = {
  height:         "100%",
  background:     "#fff",
  borderRadius:   2,
  transition:     "none",
};

const headerStyle = {
  position:       "absolute",
  top:            24,
  left:           12,
  right:          12,
  display:        "flex",
  alignItems:     "center",
  gap:            10,
  zIndex:         10,
  pointerEvents:  "none",
};

const closeBtnStyle = {
  background: "none",
  border:     "none",
  color:      "rgba(240,228,204,0.8)",
  fontSize:   18,
  cursor:     "pointer",
  padding:    "4px 8px",
  lineHeight: 1,
  pointerEvents: "all",
};

const viewersFooterBtn = {
  position:       "absolute",
  bottom:         24,
  left:           "50%",
  transform:      "translateX(-50%)",
  background:     "rgba(13,10,6,0.7)",
  border:         "1px solid rgba(212,175,55,0.3)",
  borderRadius:   20,
  color:          "#f0e4cc",
  fontSize:       12,
  padding:        "6px 16px",
  cursor:         "pointer",
  zIndex:         10,
  whiteSpace:     "nowrap",
  pointerEvents:  "all",
};

const viewersPanelStyle = {
  position:       "absolute",
  bottom:         0,
  left:           0,
  right:          0,
  background:     "rgba(28,20,9,0.97)",
  borderTop:      "1px solid #2e2215",
  borderRadius:   "16px 16px 0 0",
  padding:        20,
  maxHeight:      "50dvh",
  overflowY:      "auto",
  zIndex:         20,
};

const navBtnStyle = {
  position:       "absolute",
  top:            "50%",
  transform:      "translateY(-50%)",
  background:     "rgba(13,10,6,0.5)",
  border:         "none",
  color:          "#f0e4cc",
  fontSize:       28,
  width:          36,
  height:         36,
  borderRadius:   "50%",
  cursor:         "pointer",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  zIndex:         10,
};

const spinnerStyle = {
  width:          48,
  height:         48,
  border:         "3px solid rgba(212,175,55,0.3)",
  borderTop:      "3px solid #d4af37",
  borderRadius:   "50%",
  animation:      "spin 0.8s linear infinite",
};

export default StoryViewer;
