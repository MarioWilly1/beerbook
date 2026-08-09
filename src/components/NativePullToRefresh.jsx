import { useRef, useState, useCallback, useEffect } from "react";
import { gsap } from "gsap";
import { Capacitor } from "@capacitor/core";

// Fase C de "sensación de app nativa" — pull-to-refresh temático (jarra
// llenándose) en vez del spinner genérico. Exclusivo de la app nativa: en
// web no engancha ningún listener de touch, `children` se renderiza tal
// cual, sin wrapper ni comportamiento nuevo.
//
// Busca el ancestro con scroll (el <main> de NativeShell.js) recorriendo el
// DOM en vez de recibir un ref por prop — así el mismo componente sirve
// para Dashboard.js y Feed.js sin que cada uno tenga que conocer el shell
// que lo contiene.
const PULL_THRESHOLD = 70;
const MAX_PULL = 100;
const RESISTANCE = 0.5;

function findScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

const NativePullToRefresh = ({ onRefresh, children }) => {
  const isNative = Capacitor.isNativePlatform();
  const contentRef   = useRef(null);
  const indicatorRef = useRef(null);
  const fillRef      = useRef(null);
  const scrollParentRef = useRef(null);
  const startYRef    = useRef(0);
  const pullDistRef  = useRef(0);
  const pullingRef   = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (refreshing) {
      gsap.to(fillRef.current, {
        y: -2, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: -1,
      });
    } else {
      gsap.killTweensOf(fillRef.current);
    }
  }, [refreshing]);

  const settle = useCallback((toZero) => {
    gsap.to(contentRef.current, { y: 0, duration: 0.3, ease: "power2.out" });
    gsap.to(indicatorRef.current, { opacity: toZero ? 0 : 1, duration: 0.2 });
    if (toZero) gsap.to(fillRef.current, { scaleY: 0, duration: 0.25, delay: 0.05 });
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!isNative || refreshing) return;
    scrollParentRef.current = findScrollParent(contentRef.current);
    if (scrollParentRef.current.scrollTop > 0) { pullingRef.current = false; return; }
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, [isNative, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0 || scrollParentRef.current.scrollTop > 0) { pullingRef.current = false; return; }

    e.preventDefault();
    const pull = Math.min(delta * RESISTANCE, MAX_PULL);
    pullDistRef.current = pull;
    const progress = Math.min(pull / PULL_THRESHOLD, 1);

    gsap.set(contentRef.current, { y: pull });
    gsap.set(indicatorRef.current, { opacity: progress });
    gsap.set(fillRef.current, { scaleY: progress, transformOrigin: "bottom" });
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistRef.current >= PULL_THRESHOLD) {
      gsap.to(contentRef.current, { y: 40, duration: 0.2, ease: "power2.out" });
      setRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        settle(true);
      }
    } else {
      settle(true);
    }
    pullDistRef.current = 0;
  }, [onRefresh, settle]);

  if (!isNative) return children;

  return (
    <div style={{ position: "relative" }}>
      <div ref={indicatorRef} style={indicatorStyle}>
        <svg width="26" height="26" viewBox="0 0 24 24">
          <defs>
            <clipPath id="ptr-mug-clip">
              <path d="M5 4h11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z" />
            </clipPath>
          </defs>
          <path d="M5 4h11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z" fill="none" stroke="#d4af37" strokeWidth="1.5" />
          <path d="M16 7.5h1.5A2.5 2.5 0 0 1 20 10v2a2.5 2.5 0 0 1-2.5 2.5H16" fill="none" stroke="#d4af37" strokeWidth="1.5" />
          <g ref={fillRef} style={{ transform: "scaleY(0)", transformOrigin: "bottom" }} clipPath="url(#ptr-mug-clip)">
            <rect x="5" y="4" width="11" height="16" fill="#e8a33d" />
          </g>
        </svg>
      </div>

      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

const indicatorStyle = {
  position: "absolute",
  top: -42,
  left: 0,
  right: 0,
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  pointerEvents: "none",
};

export default NativePullToRefresh;
