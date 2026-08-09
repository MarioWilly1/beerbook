import { Capacitor } from "@capacitor/core";

// Fase A de "sensación de app nativa" (NativeShell) — sombra de tarjeta,
// exclusiva de la app nativa. Dos capas (ambiente + contacto) para que se
// note sobre un fondo casi negro (#0d0a06), donde una sombra tenue como en
// temas claros no alcanza a leerse.
export const NATIVE_CARD_SHADOW = Capacitor.isNativePlatform()
  ? "0 6px 18px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.35)"
  : "none";
