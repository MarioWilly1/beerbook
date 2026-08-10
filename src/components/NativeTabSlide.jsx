import { useEffect, useRef } from "react";
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
const NativeTabSlide = ({ tabKey, tabOrder, children }) => {
  const ref = useRef(null);
  const prevIndexRef = useRef(tabOrder.indexOf(tabKey));

  useEffect(() => {
    const index = tabOrder.indexOf(tabKey);
    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = index;

    if (index === -1 || prevIndex === -1) return;
    if (!Capacitor.isNativePlatform() || !ref.current) return;

    const direction = index > prevIndex ? 1 : -1;
    gsap.fromTo(
      ref.current,
      { x: direction * 24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.28, ease: "power2.out" }
    );
  }, [tabKey, tabOrder]);

  return <div ref={ref}>{children}</div>;
};

export default NativeTabSlide;
