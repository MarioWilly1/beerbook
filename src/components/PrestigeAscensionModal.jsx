import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import { prestigeTierFor, isMythic } from "../utils/prestigeTiers";
import { soundPrestige } from "../utils/sounds";
import { celebratePrestigeDissolve, celebratePrestigeBurst } from "../utils/celebrate";

// Se dispara SOLO desde UserLevelCard.js, y únicamente después de que
// supabase.rpc('do_prestige') resuelve con éxito — nunca al montar ni al
// recargar la página. El botón "Volver a ver la animación" reabre este
// mismo modal en modo replay (sin llamar al RPC de nuevo).
const PrestigeAscensionModal = ({ toPrestige, onClose }) => {
  const { t } = useTranslation();
  const overlayRef = useRef(null);
  const oldCupRef  = useRef(null);
  const newCupRef  = useRef(null);
  const burstRef   = useRef(null);
  const textRef    = useRef(null);
  const btnRef     = useRef(null);
  const [canDismiss, setCanDismiss] = useState(false);

  const fromPrestige = toPrestige - 1;
  const hasOldCup     = fromPrestige >= 1;
  const oldTier       = hasOldCup ? prestigeTierFor(fromPrestige) : null;
  const newTier       = prestigeTierFor(toPrestige);
  const mythic        = isMythic(toPrestige);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    let autoCloseTimer;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          autoCloseTimer = setTimeout(() => onClose(), 2200);
        },
      });

      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(newCupRef.current, { opacity: 0, scale: 0.25 });
      gsap.set(burstRef.current, { opacity: 0, scale: 0 });
      gsap.set(textRef.current, { opacity: 0, y: 14 });
      gsap.set(btnRef.current, { opacity: 0 });
      if (hasOldCup) gsap.set(oldCupRef.current, { opacity: 1, scale: 1 });

      tl.to(overlayRef.current, { opacity: 1, duration: 0.5, ease: "power1.out" });

      if (hasOldCup) {
        tl.to(oldCupRef.current, { opacity: 0, scale: 0.55, duration: 0.9, ease: "power2.in" }, "-=0.05")
          .call(() => celebratePrestigeDissolve(), null, "<");
      }

      // Pausa dramática
      tl.to({}, { duration: hasOldCup ? 0.6 : 0.35 });

      tl.to(burstRef.current, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" })
        .call(() => { soundPrestige(); celebratePrestigeBurst(); })
        .to(newCupRef.current, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, "<")
        .to(burstRef.current, { opacity: 0, duration: 0.55, ease: "power1.in" }, "-=0.3")
        .to(textRef.current, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, "-=0.25")
        .to(btnRef.current, { opacity: 1, duration: 0.4, onComplete: () => setCanDismiss(true) }, "-=0.1");
    });

    return () => {
      ctx.revert();
      clearTimeout(autoCloseTimer);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowColor = newTier.color;

  return (
    <div
      ref={overlayRef}
      onClick={() => canDismiss && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "radial-gradient(circle at 50% 42%, #16110a 0%, #050403 78%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Estallido de luz */}
        <div
          ref={burstRef}
          style={{
            position: "absolute", width: 340, height: 340, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${glowColor}99 35%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {hasOldCup && (
          <img
            ref={oldCupRef}
            src={oldTier.img}
            alt=""
            style={{ position: "absolute", width: "70%", height: "70%", objectFit: "contain", filter: `drop-shadow(0 0 14px ${oldTier.color}aa)` }}
          />
        )}

        <img
          ref={newCupRef}
          src={newTier.img}
          alt={`Prestigio ${toPrestige}`}
          style={{
            position: "absolute", width: "78%", height: "78%", objectFit: "contain",
            filter: `drop-shadow(0 10px 12px rgba(0,0,0,0.6)) drop-shadow(0 0 22px ${glowColor}) ${mythic ? "saturate(1.3)" : ""}`,
          }}
        />
      </div>

      <div ref={textRef} style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{
          fontSize: 30, fontWeight: 900, letterSpacing: "2px",
          color: mythic ? "#fff" : glowColor,
          textShadow: `0 0 22px ${glowColor}cc`,
          fontFamily: "'Playfair Display', serif",
        }}>
          {t("prestige.ascensionTitle", { n: toPrestige })}
        </div>
        <div style={{ fontSize: 13, color: "#9a7d62", marginTop: 6 }}>
          {t("prestige.ascensionSubtitle")}
        </div>
      </div>

      <button
        ref={btnRef}
        onClick={onClose}
        style={{
          marginTop: 26, padding: "10px 28px", borderRadius: 999,
          border: `1px solid ${glowColor}88`, background: `${glowColor}1e`,
          color: "#f0e4cc", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        {t("prestige.continue")}
      </button>
    </div>
  );
};

export default PrestigeAscensionModal;
