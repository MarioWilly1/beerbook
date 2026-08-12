import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Capacitor } from "@capacitor/core";

// Fase B de "sensación de app nativa" — desliza el contenido como una
// tarjeta al cambiar de pestaña interna (Catálogo/Comunidad en LaBarra.js,
// Feed/Amigos/Chat/Noticias en Social.js). Exclusivo de la app nativa: en
// web no hace nada, el cambio sigue siendo instantáneo como siempre.
//
// No mantiene ambas pestañas montadas a la vez para animar una salida real
// — solo anima la ENTRADA del contenido que ya reemplazó al anterior, desde
// el lado que corresponda según si la pestaña nueva está a la derecha o
// izquierda de la anterior en `tabOrder`. Mucho más simple y ya da la
// sensación de "tarjeta deslizando".
//
// También se reutiliza en la Fase E para las transiciones a nivel de ruta
// entre las 4 secciones principales (NativeShell.js, tabKey=pathname) — ahí
// `tabKey` puede no estar en `tabOrder` (pantallas secundarias fuera del
// menú de Perfil, ej. /logros, /configuracion); en ese caso no animamos,
// para no calcular una dirección sin sentido.
//
// `tabOrder` tiene que ser una referencia estable (constante de módulo, no
// un array literal inline) para no disparar el efecto en cada render.
//
// `onSwipe` (opcional): habilita deslizar con el dedo además de tocar los
// botones — se detecta al SOLTAR el dedo (no hay seguimiento en vivo del
// arrastre), y dispara exactamente el mismo cambio de tabKey que un tap en
// la barra, así reutiliza 100% la animación de arriba sin duplicarla.
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_DIRECTION_RATIO = 1.5; // cuánto más horizontal que vertical tiene que ser

// Mismo criterio que findScrollParent en NativePullToRefresh.jsx, pero para
// scroll HORIZONTAL — evita robarle el gesto a una fila de historias u otro
// carrusel horizontal que el usuario está desplazando.
function hasHorizontalScrollAncestor(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

const NativeTabSlide = ({ tabKey, tabOrder, onSwipe, children }) => {
  const ref = useRef(null);
  const prevIndexRef = useRef(tabOrder.indexOf(tabKey));
  const touchStartRef = useRef(null);

  // useLayoutEffect (no useEffect): tiene que correr ANTES de que el
  // navegador pinte, si no el contenido nuevo ya se ve un frame entero en su
  // posición final y recién ahí GSAP lo "teletransporta" hacia atrás para
  // animarlo de vuelta — en desktop esa ventana es invisible, pero en un
  // dispositivo real (sobre todo con una pantalla pesada como el Dashboard)
  // alcanza a verse como un flash sin transición real, que es exactamente lo
  // que se reportó. Con useLayoutEffect el primer frame pintado YA arranca
  // desplazado/transparente.
  useLayoutEffect(() => {
    const index = tabOrder.indexOf(tabKey);
    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = index;

    if (index === -1 || prevIndex === -1) return;
    if (!Capacitor.isNativePlatform() || !ref.current) return;

    const direction = index > prevIndex ? 1 : -1;
    gsap.fromTo(
      ref.current,
      { x: direction * 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.32, ease: "back.out(1.5)", clearProps: "transform" }
    );
  }, [tabKey, tabOrder]);

  const handleTouchStart = (e) => {
    if (!onSwipe || !Capacitor.isNativePlatform()) return;
    const target = e.target;
    // No interceptar gestos que empiezan sobre un control con su propio
    // arrastre horizontal (el slider de alcohol de BeerFilters, un <select>,
    // etc.) ni sobre algo con scroll horizontal propio (fila de historias).
    if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || hasHorizontalScrollAncestor(target)) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!onSwipe || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;

    const index = tabOrder.indexOf(tabKey);
    if (index === -1) return;
    // Deslizar hacia la izquierda = avanzar (misma convención que hojear
    // una galería); hacia la derecha = retroceder.
    const nextIndex = dx < 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= tabOrder.length) return;
    onSwipe(tabOrder[nextIndex]);
  };

  return (
    <div ref={ref} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
};

export default NativeTabSlide;
