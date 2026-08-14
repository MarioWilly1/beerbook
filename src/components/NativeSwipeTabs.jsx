import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Capacitor } from "@capacitor/core";
import { shouldIgnoreSwipeTarget } from "../utils/touchGestureGuards";

// Swipe REALMENTE interactivo — sigue el dedo en tiempo real durante el
// arrastre (la pantalla vecina se monta al lado de la actual), como un
// pager nativo (Instagram, un ViewPager de Android). Al soltar: si se
// cruzó el umbral (distancia O velocidad), termina de deslizar sola hacia
// el lado correspondiente; si no, vuelve a su lugar con un rebote
// elástico. Usado tanto entre las 4 secciones principales (NativeShell.js)
// como en las pestañas internas de cada una (Catálogo/Comunidad en
// LaBarra.js, Feed/Amigos/Chat/Noticias en Social.js).
//
// Exclusivo de nativo: en web `renderTab(tabKey)` se muestra directo, sin
// wrapper ni comportamiento nuevo — igual criterio que el resto de la
// "sensación nativa".
//
// Solo se monta la pantalla VECINA hacia donde se está arrastrando (nunca
// todas a la vez) — importante porque ninguno de los hooks de datos de esta
// app tiene cache: cada mount dispara sus propios fetches. En las 4
// secciones principales eso significa que arrastrar hacia una vecina
// dispara sus fetches pesados durante el gesto mismo (igual que el
// "preload" de la siguiente pantalla en TikTok/Instagram) — un arrastre
// abandonado a mitad de camino no cancela esos fetches, pero tampoco deja
// nada inconsistente: la pantalla vuelve a su lugar con el rebote elástico
// y el fetch en curso simplemente se descarta sin usarse.
const COMMIT_DISTANCE_RATIO = 0.35; // % del ancho para confirmar el cambio
const COMMIT_VELOCITY = 0.5; // px/ms — un flick rápido confirma aunque sea corto
const EDGE_DEADZONE = 10; // px antes de decidir si el gesto es horizontal
const EDGE_RUBBER_MAX = 70; // resistencia al arrastrar en el extremo (sin vecino)

function rubberBand(delta, max) {
  const sign = delta < 0 ? -1 : 1;
  return sign * max * (1 - 1 / (Math.abs(delta) / max + 1));
}

const NativeSwipeTabs = ({ tabKey, tabOrder, onSwipe, renderTab }) => {
  const isNative = Capacitor.isNativePlatform();
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const setX = useRef(null);
  const gestureRef = useRef(null);
  const [dragState, setDragState] = useState(null); // null | { direction: "next"|"prev", neighborKey: string|null }

  useEffect(() => {
    if (trackRef.current) setX.current = gsap.quickSetter(trackRef.current, "x", "px");
  }, []);

  const handleTouchStart = (e) => {
    if (!isNative) return;
    if (shouldIgnoreSwipeTarget(e.target)) return;
    const touch = e.touches[0];
    gestureRef.current = {
      startX: touch.clientX, startY: touch.clientY,
      lastX: touch.clientX, lastMoveTime: Date.now(), velocity: 0,
      locked: false, direction: null, neighborKey: null,
      width: wrapRef.current.clientWidth, currentX: 0,
    };
  };

  const handleTouchMove = (e) => {
    const g = gestureRef.current;
    if (!g) return;
    const touch = e.touches[0];
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;

    if (!g.locked) {
      if (Math.abs(dx) < EDGE_DEADZONE && Math.abs(dy) < EDGE_DEADZONE) return;
      if (Math.abs(dx) < Math.abs(dy)) { gestureRef.current = null; return; } // era scroll vertical
      g.locked = true;
      const index = tabOrder.indexOf(tabKey);
      g.direction = dx < 0 ? "next" : "prev";
      const neighborIndex = g.direction === "next" ? index + 1 : index - 1;
      g.neighborKey = tabOrder[neighborIndex] ?? null; // null = ya está en un extremo
      // Arranca a medir velocidad recién desde acá (el tramo real de
      // arrastre), no desde el touchstart — si no, una pausa con el dedo
      // quieto justo antes de soltar seguía leyéndose como "flick rápido"
      // usando el desplazamiento de MÁS TEMPRANO en el gesto.
      g.lastX = touch.clientX;
      g.lastMoveTime = Date.now();
      setDragState({ direction: g.direction, neighborKey: g.neighborKey });
      return;
    }

    e.preventDefault();
    const now = Date.now();
    const dt = Math.max(now - g.lastMoveTime, 1);
    g.velocity = (touch.clientX - g.lastX) / dt; // px/ms, instantánea del último tramo
    g.lastX = touch.clientX;
    g.lastMoveTime = now;

    let x;
    if (g.neighborKey == null) {
      x = rubberBand(dx, EDGE_RUBBER_MAX);
    } else if (g.direction === "next") {
      x = Math.max(-g.width, Math.min(0, dx));
    } else {
      x = Math.max(-g.width, Math.min(0, -g.width + dx));
    }
    g.currentX = x;
    setX.current?.(x);
  };

  const handleTouchEnd = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || !g.locked) { setDragState(null); return; }

    if (g.neighborKey == null) {
      gsap.to(trackRef.current, {
        x: 0, duration: 0.4, ease: "elastic.out(1, 0.6)", clearProps: "x",
        onComplete: () => setDragState(null),
      });
      return;
    }

    const progress = g.direction === "next" ? -g.currentX / g.width : (g.currentX + g.width) / g.width;
    const fastFlick = g.direction === "next" ? g.velocity < -COMMIT_VELOCITY : g.velocity > COMMIT_VELOCITY;
    const commit = progress > COMMIT_DISTANCE_RATIO || fastFlick;

    if (commit) {
      const target = g.direction === "next" ? -g.width : 0;
      const neighborKey = g.neighborKey;
      gsap.to(trackRef.current, {
        x: target, duration: 0.28, ease: "power2.out", clearProps: "x",
        onComplete: () => { onSwipe(neighborKey); setDragState(null); },
      });
    } else {
      const target = g.direction === "next" ? 0 : -g.width;
      gsap.to(trackRef.current, {
        x: target, duration: 0.4, ease: "elastic.out(1, 0.6)", clearProps: "x",
        onComplete: () => setDragState(null),
      });
    }
  };

  if (!isNative) {
    return <>{renderTab(tabKey)}</>;
  }

  const panelKeys = dragState
    ? dragState.direction === "next"
      ? [tabKey, dragState.neighborKey]
      : [dragState.neighborKey, tabKey]
    : [tabKey];

  return (
    // minHeight:100% — sin esto, en una pantalla con poco contenido (ej. Mi
    // Cuaderno vacío) este div solo ocupa la altura de su contenido, y el
    // espacio vacío debajo (dentro de <main>, pero fuera de este wrapper)
    // no dispara ningún touch handler de acá: el gesto se pierde en
    // silencio. Con esto el área de arrastre cubre toda la pantalla, como
    // en un pager nativo real.
    <div ref={wrapRef} style={{ overflow: "hidden", minHeight: "100%" }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div ref={trackRef} style={{ display: "flex", alignItems: "flex-start" }}>
        {panelKeys.map((key, i) => (
          <div key={key ?? `edge-${i}`} style={{ flex: "0 0 100%", minWidth: 0 }}>
            {key != null && renderTab(key)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NativeSwipeTabs;
