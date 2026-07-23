import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../services/supabase";
import CollectionCard from "./CollectionCard";
import { PrestigeCup } from "./PrestigeBadge";
import { prestigeTierFor } from "../utils/prestigeTiers";
import { computeEntryXP } from "../utils/xp";

const SLIDE_COUNT = 5;

// ── Slide 1 — Bienvenida: logo con fade + scale ─────────────────────────────
const LogoVisual = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.6)" }
      );
    });
    return () => ctx.revert();
  }, [active]);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 72, lineHeight: 1 }}>🍺</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#d4af37" }}>
        BeerBook
      </div>
    </div>
  );
};

// ── Slide 2 — Registra y gana XP: tarjeta + chip "+XX XP" ───────────────────
const XpCardVisual = ({ active }) => {
  const cardRef = useRef(null);
  const chipRef = useRef(null);
  const demoXP = computeEntryXP({ rating: 5, comment: "Excelente, la volvería a pedir", photo: "x" });

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(cardRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" });
      tl.fromTo(chipRef.current, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.4)" }, "-=0.1");
    });
    return () => ctx.revert();
  }, [active]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={cardRef} style={{
        width: 220, background: "#1c1409", border: "1px solid #2e2215", borderRadius: 14,
        padding: 14, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 10, background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🍺</div>
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f0e4cc" }}>IPA Artesanal</div>
          <div style={{ fontSize: 12, color: "#d4af37" }}>★★★★★</div>
          <div style={{ fontSize: 11, color: "#9a7d62" }}>📷 Foto · 📝 Nota</div>
        </div>
      </div>
      <div ref={chipRef} style={{
        position: "absolute", top: -12, right: -10,
        background: "#2a6b3a", color: "#f0e4cc", fontWeight: 800, fontSize: 13,
        padding: "5px 12px", borderRadius: 20, boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}>
        +{demoXP} XP
      </div>
    </div>
  );
};

// ── Slide 3 — Colección tipo Pokédex: CollectionCard con efecto de rareza ──
const DEMO_RARE_BEER = { nombre: "Grimbergen Reserva", estilo: "Abadía Belga", pais: "Bélgica", rareza: "legendaria", foto_url: null };

const CollectionVisual = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 24, rotateZ: -4 },
        { opacity: 1, y: 0, rotateZ: 0, duration: 0.7, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, [active]);

  return (
    <div ref={ref} style={{ width: 170 }}>
      <CollectionCard beer={DEMO_RARE_BEER} />
    </div>
  );
};

// ── Slide 4 — Explora el mundo: fragmento del mapa de origen ───────────────
const mapPinIcon = () => L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;background:#d4af37;border:2px solid #0d0a06;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);"><span style="font-size:12px;">🍺</span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});
const DEMO_MAP_SPOTS = [
  { lat: 51.2093, lng: 3.2247 },  // Bélgica
  { lat: 48.1351, lng: 11.582 },  // Alemania
  { lat: 49.7384, lng: 13.3736 }, // Chequia
];

const MapVisual = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" });
    });
    return () => ctx.revert();
  }, [active]);

  const stopSwipe = (e) => e.stopPropagation();

  return (
    <div
      ref={ref}
      onTouchStart={stopSwipe}
      onTouchMove={stopSwipe}
      onTouchEnd={stopSwipe}
      style={{ width: 260, height: 180, borderRadius: 14, overflow: "hidden", border: "1px solid #2e2215" }}
    >
      <MapContainer center={[49.5, 9]} zoom={4} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {DEMO_MAP_SPOTS.map((s, i) => <Marker key={i} position={[s.lat, s.lng]} icon={mapPinIcon()} />)}
      </MapContainer>
    </div>
  );
};

// ── Slide 5 — Compite y comparte: emblema de Prestigio + amigos/chat ───────
const SocialVisual = ({ active }) => {
  const cupRef = useRef(null);
  const iconsRef = useRef(null);
  const tier = prestigeTierFor(3);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(cupRef.current, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" });
      tl.fromTo((iconsRef.current && iconsRef.current.children) || [],
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.15, ease: "power2.out" },
        "-=0.2"
      );
    });
    return () => ctx.revert();
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div ref={cupRef}>{tier && <PrestigeCup tier={tier} dims={90} />}</div>
      <div ref={iconsRef} style={{ display: "flex", gap: 22 }}>
        <span style={{ fontSize: 26 }}>👥</span>
        <span style={{ fontSize: 26 }}>💬</span>
      </div>
    </div>
  );
};

const SLIDES = [
  { key: "slide1", Visual: LogoVisual },
  { key: "slide2", Visual: XpCardVisual },
  { key: "slide3", Visual: CollectionVisual },
  { key: "slide4", Visual: MapVisual },
  { key: "slide5", Visual: SocialVisual },
];

// ── Título + texto de cada slide, con su propia entrada GSAP ───────────────
const SlideContent = ({ active, titleKey, textKey, children }) => {
  const { t } = useTranslation();
  const titleRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.fromTo([titleRef.current, textRef.current],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.08, delay: 0.15 }
      );
    });
    return () => ctx.revert();
  }, [active]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 32px", boxSizing: "border-box", textAlign: "center", width: "100%", height: "100%",
    }}>
      <div style={{ marginBottom: 36, minHeight: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
      <h2 ref={titleRef} style={{
        fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
        color: "#f0e4cc", margin: "0 0 12px", maxWidth: 380,
      }}>
        {t(titleKey)}
      </h2>
      <p ref={textRef} style={{ fontSize: 14, color: "#9a7d62", lineHeight: 1.6, maxWidth: 340, margin: 0 }}>
        {t(textKey)}
      </p>
    </div>
  );
};

// ── Onboarding ────────────────────────────────────────────────────────────
// Se muestra una vez tras completar el registro (App.js, antes del primer
// Dashboard) y puede reabrirse manualmente desde Configuración > Preferencias.
// En ambos casos marca profiles.onboarding_visto = true al cerrarse.
const Onboarding = ({ userId, onFinish }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const finish = useCallback(() => {
    onFinish?.();
    if (userId) {
      supabase.from("profiles").update({ onboarding_visto: true }).eq("id", userId);
    }
  }, [userId, onFinish]);

  const goTo = (i) => setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, i)));
  const handleNext = () => (index === SLIDE_COUNT - 1 ? finish() : goTo(index + 1));

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -50) goTo(index + 1);
    else if (delta > 50) goTo(index - 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "radial-gradient(circle at 50% 28%, #16110a 0%, #050403 78%)",
      display: "flex", flexDirection: "column",
    }}>
      <button onClick={finish} style={{
        position: "absolute", top: 18, right: 18, zIndex: 2,
        background: "none", border: "none", color: "#9a7d62",
        fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px 12px",
      }}>
        {t("onboarding.skip")} ✕
      </button>

      <div
        style={{ flex: 1, overflow: "hidden", display: "flex" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          display: "flex", width: `${SLIDE_COUNT * 100}%`, flexShrink: 0,
          transform: `translateX(-${index * (100 / SLIDE_COUNT)}%)`,
          transition: "transform 0.5s cubic-bezier(0.65, 0, 0.35, 1)",
        }}>
          {SLIDES.map(({ key, Visual }, i) => (
            <div key={key} style={{ width: `${100 / SLIDE_COUNT}%`, flexShrink: 0 }}>
              <SlideContent active={index === i} titleKey={`onboarding.${key}.title`} textKey={`onboarding.${key}.text`}>
                <Visual active={index === i} />
              </SlideContent>
            </div>
          ))}
        </div>
      </div>

      {/* Indicador de progreso */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "20px 0 8px" }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === index ? 22 : 8, height: 8, borderRadius: 4, border: "none",
              background: i === index ? "#d4af37" : "#2e2215",
              cursor: "pointer", transition: "all 0.3s ease", padding: 0,
            }}
          />
        ))}
      </div>

      {/* Siguiente / Empezar */}
      <div style={{ padding: "12px 32px 32px", display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleNext}
          style={{
            width: "100%", maxWidth: 340, padding: "14px 0", borderRadius: 999,
            border: "none", background: "#d4af37", color: "#0d0a06",
            fontWeight: 800, fontSize: 15, cursor: "pointer",
          }}
        >
          {index === SLIDE_COUNT - 1 ? t("onboarding.start") : t("onboarding.next")}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
