import { useState, useEffect } from "react";

// On native Capacitor (Android/iOS), always mobile regardless of innerWidth.
// On web browser, use CSS matchMedia which is immune to DPR/viewport quirks.
const getNativePlatform = () => {
  try { return window.Capacitor?.getPlatform?.(); } catch { return null; }
};

const isNativeApp = () => {
  const p = getNativePlatform();
  return p === "android" || p === "ios";
};

const checkMobile = (breakpoint) => {
  if (isNativeApp()) return true;
  if (typeof window === "undefined") return false;
  if (window.matchMedia) return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  return window.innerWidth < breakpoint;
};

export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => checkMobile(breakpoint));

  useEffect(() => {
    // Native apps are always mobile — no need to listen for resize
    if (isNativeApp()) return;

    const query = `(max-width: ${breakpoint - 1}px)`;
    if (window.matchMedia) {
      const mq = window.matchMedia(query);
      const handler = (e) => setIsMobile(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);

  return isMobile;
};
