import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { prestigeTierFor, isMythic } from "../utils/prestigeTiers";

// TODO: si en algún momento se retoca el arte, este es el único lugar
// que hay que tocar — el mapeo de tramos vive en utils/prestigeTiers.js.
//
// La copa queda estática a propósito (sin flotación ni glow pulsante): la
// ilustración ya es suficientemente elaborada, así que el único efecto que
// se permite es una sombra fija para dar sensación de profundidad.

// ── Chip compacto (filas de ranking/feed) — solo Prestigio real (>=1) ──────
const PrestigeChip = ({ prestige, tier }) => (
  <span
    title={`Prestigio ${prestige}`}
    style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 6px 1px 2px", borderRadius: 999,
      background: `${tier.color}1e`, border: `1px solid ${tier.color}70`,
    }}
  >
    <span
      style={{
        width: 16, height: 16, borderRadius: "50%",
        background: `radial-gradient(circle, ${tier.color}55 0%, transparent 72%)`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <img src={tier.img} alt="" style={{ width: 14, height: 14, objectFit: "contain", filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.6))` }} />
    </span>
    <span style={{ fontSize: 10, fontWeight: 800, color: tier.color, lineHeight: 1 }}>×{prestige}</span>
  </span>
);

// Copa estática (usada dentro del showcase grande de abajo). Sin flotación
// ni glow pulsante — solo tilt al pasar el mouse/inclinar el dispositivo,
// y una sombra fija debajo para dar profundidad.
// intensity: multiplicador del rango de inclinación (1 = el de siempre,
// >1 = tilt potenciado para la vista de cerca del modal).
const PrestigeCup = ({ tier, dims, intensity = 1 }) => {
  const wrapRef = useRef(null);
  const imgRef  = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img  = imgRef.current;
    if (!wrap || !img) return;

    const maxDeg = 12 * intensity;
    const applyTilt = (rx, ry) => {
      img.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const resetTilt = () => { img.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg)"; };

    const onMouseMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      applyTilt((py * -maxDeg).toFixed(2), (px * maxDeg).toFixed(2));
    };

    wrap.addEventListener("mousemove", onMouseMove);
    wrap.addEventListener("mouseleave", resetTilt);

    // Giroscopio: solo si no requiere permiso explícito (Android / iOS viejo).
    // En iOS 13+ requeriría un gesto del usuario para pedir permiso — lo
    // omitimos para no mostrar un prompt inesperado desde un badge pasivo.
    let onOrientation;
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== "function") {
      onOrientation = (e) => {
        if (e.beta == null || e.gamma == null) return;
        const rx = Math.max(-maxDeg, Math.min(maxDeg, (e.beta - 45) / 4));
        const ry = Math.max(-maxDeg, Math.min(maxDeg, e.gamma / 4));
        applyTilt(rx.toFixed(2), ry.toFixed(2));
      };
      window.addEventListener("deviceorientation", onOrientation);
    }

    return () => {
      wrap.removeEventListener("mousemove", onMouseMove);
      wrap.removeEventListener("mouseleave", resetTilt);
      if (onOrientation) window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [intensity]);

  return (
    <span
      ref={wrapRef}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: dims, height: dims, flexShrink: 0,
      }}
    >
      {/* Sombra proyectada — fija, el único efecto además del tilt */}
      <span
        style={{
          position: "absolute", bottom: -dims * 0.1, left: "50%", transform: "translateX(-50%)",
          width: dims * 0.58, height: dims * 0.15, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", filter: "blur(6px)",
        }}
      />
      <img
        ref={imgRef}
        src={tier.img}
        alt=""
        style={{
          position: "relative", width: "88%", height: "88%", objectFit: "contain",
          filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.55))",
          transition: "transform 0.12s ease-out",
          willChange: "transform",
        }}
      />
    </span>
  );
};

// ── Showcase "hero" — copa grande + número protagonista ─────────────────────
// Solo Prestigio real (>=1) — el dispatcher ya filtra prestige=0 antes de
// llegar acá, así que siempre hay copa.
const PrestigeHero = ({ prestige, tier, cupSize }) => {
  const { t } = useTranslation();
  const mythic = isMythic(prestige);
  const numberSize = Math.round(cupSize * 0.46);

  return (
    <div
      title={`Prestigio ${prestige}`}
      style={{
        display: "flex", alignItems: "center", gap: cupSize * 0.16,
        padding: `${cupSize * 0.1}px ${cupSize * 0.14}px`,
        borderRadius: 16,
        background: `radial-gradient(ellipse at 28% 50%, ${tier.color}1c 0%, transparent 72%)`,
        border: `1px solid ${tier.color}45`,
      }}
    >
      <PrestigeCup tier={tier} dims={cupSize} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{
          fontSize: Math.max(10, Math.round(cupSize * 0.11)),
          fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
          color: `${tier.color}d0`, marginBottom: 2,
        }}>
          {t("prestige.label")}
        </span>
        <span style={{
          fontSize: numberSize, fontWeight: 900, lineHeight: 1,
          color: mythic ? "#fff" : tier.color,
          textShadow: `0 0 ${numberSize * 0.35}px ${tier.color}cc, 0 0 ${numberSize * 0.7}px ${tier.color}66`,
          fontFamily: "'Playfair Display', serif",
        }}>
          {prestige}
        </span>
      </div>
    </div>
  );
};

// ── Fila del sidebar: emblema (36px) + "Prestigio N" ────────────────────────
// Solo Prestigio real — nada de progresión de nivel acá. Oculto en 0.
const PrestigeRow = ({ prestige, tier, dims }) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <PrestigeCup tier={tier} dims={dims} />
      <span style={{ fontSize: 14, fontWeight: 700, color: tier.color }}>
        {t("prestige.label")} {prestige}
      </span>
    </div>
  );
};

const PrestigeBadge = ({ prestige = 0, size = "sm", cupSize }) => {
  const tier = prestigeTierFor(prestige);
  if (!tier) return null;
  if (size === "row")  return <PrestigeRow prestige={prestige} tier={tier} dims={cupSize || 36} />;
  if (size === "icon") return <PrestigeCup tier={tier} dims={cupSize || 26} />;
  if (size === "sm")   return <PrestigeChip prestige={prestige} tier={tier} />;
  return <PrestigeHero prestige={prestige} tier={tier} cupSize={cupSize || 108} />;
};

export default PrestigeBadge;
export { PrestigeCup };
