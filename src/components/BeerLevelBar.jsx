import React from "react";

// Dos repeticiones (0-100 y 100-200) del mismo ciclo de onda, para poder
// animar un translateX(-50%) que loopea sin costura.
const WAVE_D =
  "M0,8 C8,3 17,3 25,8 C33,13 42,13 50,8 C58,3 67,3 75,8 C83,13 92,13 100,8 L100,20 L0,20 Z " +
  "M100,8 C108,3 117,3 125,8 C133,13 142,13 150,8 C158,3 167,3 175,8 C183,13 192,13 200,8 L200,20 L100,20 Z";

// Burbujas fijas (pocas, sutiles) — posición horizontal, tamaño, duración y
// delay distintos para que no suban todas sincronizadas.
const BUBBLES = [
  { left: "12%", size: 3, duration: 3.4, delay: 0 },
  { left: "34%", size: 2, duration: 2.8, delay: 1.1 },
  { left: "55%", size: 3, duration: 3.8, delay: 0.4 },
  { left: "72%", size: 2, duration: 3.1, delay: 1.9 },
  { left: "88%", size: 2, duration: 2.6, delay: 0.8 },
];

// Barra de XP con efecto de líquido de cerveza real: relleno translúcido
// (no dorado sólido tipo metal), superficie ondulante con dos capas de
// parallax, espuma gruesa con textura de burbujas arriba, y burbujas
// pequeñas subiendo dentro del líquido.
const BeerLevelBar = ({ pct, height = 20 }) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const foamHeight = Math.round(height * 0.32);

  return (
    <div style={{
      height, borderRadius: height / 2, background: "rgba(255,255,255,0.08)",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${clamped}%`, minWidth: clamped > 0 ? height : 0,
        borderRadius: height / 2, overflow: "hidden",
        // Ámbar translúcido (no metal sólido) — se deja ver el fondo oscuro
        // por debajo, como líquido real, no un bloque de color plano.
        background: "linear-gradient(180deg, rgba(232,200,74,0.55) 0%, rgba(212,175,55,0.78) 42%, rgba(139,107,46,0.88) 100%)",
        transition: "width 0.6s ease",
      }}>
        {/* reflejo tipo vidrio */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: "8%", width: "22%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))",
          borderRadius: height / 2, pointerEvents: "none",
        }} />

        {/* burbujas subiendo, se desvanecen antes de llegar a la espuma */}
        {clamped > 6 && BUBBLES.map((b, i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: b.left, bottom: 0,
              width: b.size, height: b.size, borderRadius: "50%",
              background: "rgba(255,248,225,0.85)",
              animation: `beer-bubble-rise ${b.duration}s ease-in ${b.delay}s infinite`,
            }}
          />
        ))}

        {/* onda trasera: más lenta, más sutil */}
        <svg
          viewBox="0 0 200 20" preserveAspectRatio="none"
          style={{
            position: "absolute", top: foamHeight - 3, left: 0, width: "200%", height: Math.round(height * 0.5),
            animation: "beer-wave-drift 4.2s linear infinite",
          }}
        >
          <path d={WAVE_D} fill="rgba(255,255,255,0.14)" />
        </svg>

        {/* onda delantera: más rápida, en sentido contrario */}
        <svg
          viewBox="0 0 200 20" preserveAspectRatio="none"
          style={{
            position: "absolute", top: foamHeight - 2, left: 0, width: "200%", height: Math.round(height * 0.38),
            animation: "beer-wave-drift 2.6s linear infinite reverse", opacity: 0.55,
          }}
        >
          <path d={WAVE_D} fill="rgba(255,255,255,0.2)" />
        </svg>

        {/* espuma: banda gruesa con textura de burbujitas */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: foamHeight,
          borderRadius: `${height / 2}px ${height / 2}px 0 0`,
          backgroundImage: [
            "radial-gradient(circle, rgba(255,255,255,0.95) 0.9px, transparent 1.3px)",
            "linear-gradient(180deg, rgba(255,252,240,0.98), rgba(255,246,222,0.75))",
          ].join(", "),
          backgroundSize: "5px 5px, 100% 100%",
          backgroundPosition: "0 0, 0 0",
        }} />
      </div>
    </div>
  );
};

export default BeerLevelBar;
