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
