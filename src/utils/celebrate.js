import confetti from "canvas-confetti";

// Brand palette — no rainbow, just golds and ambers
const BRAND = ["#d4af37", "#b8941f", "#f5e17a", "#8b6b2e", "#c9a227", "#e8c84a"];

export function celebrateLevel() {
  const opts = {
    colors: BRAND,
    ticks: 90,
    gravity: 0.88,
    scalar: 0.88,
    shapes: ["circle", "square"],
  };
  confetti({ ...opts, particleCount: 55, spread: 52, angle: 60,  origin: { x: 0.05, y: 0.75 } });
  setTimeout(() => {
    confetti({ ...opts, particleCount: 55, spread: 52, angle: 120, origin: { x: 0.95, y: 0.75 } });
  }, 160);
}

// Prestigio — disolución: polvo dorado disperso saliendo del centro de la
// pantalla, sutil (acompaña el fade-out de la copa vieja).
export function celebratePrestigeDissolve() {
  confetti({
    particleCount: 40,
    spread: 100,
    startVelocity: 18,
    origin: { x: 0.5, y: 0.45 },
    colors: BRAND,
    ticks: 110,
    gravity: 0.55,
    scalar: 0.55,
    shapes: ["circle"],
    disableForReducedMotion: true,
  });
}

// Prestigio — estallido: el momento de mayor impacto visual, coincide con
// el "pop" de la copa nueva y el sonido de logro.
export function celebratePrestigeBurst() {
  const opts = {
    colors: ["#fff8e1", ...BRAND],
    ticks: 140,
    gravity: 0.75,
    scalar: 1.05,
    shapes: ["circle", "square"],
    disableForReducedMotion: true,
  };
  confetti({ ...opts, particleCount: 90, spread: 360, startVelocity: 32, origin: { x: 0.5, y: 0.5 } });
  setTimeout(() => {
    confetti({ ...opts, particleCount: 45, spread: 70, angle: 60,  startVelocity: 45, origin: { x: 0.15, y: 0.6 } });
    confetti({ ...opts, particleCount: 45, spread: 70, angle: 120, startVelocity: 45, origin: { x: 0.85, y: 0.6 } });
  }, 120);
}

export function celebrateAchievement() {
  confetti({
    particleCount: 30,
    spread: 46,
    origin: { x: 0.5, y: 0.68 },
    colors: BRAND,
    ticks: 70,
    gravity: 0.92,
    scalar: 0.82,
    shapes: ["circle"],
  });
}
