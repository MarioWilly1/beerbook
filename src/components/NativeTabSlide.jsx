import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Capacitor } from "@capacitor/core";

// Fase B de "sensación de app nativa" — desliza el contenido como una
// tarjeta al cambiar de pestaña interna (Catálogo/Comunidad en LaBarra.js,
// Feed/Amigos/Chat/Noticias en Social.js). Exclusivo de la app nativa: en
// web no hace nada, el cambio sigue siendo instantáneo como siempre.
//
// No mantiene ambas pestañas montadas a la vez para animar una salida real
// (eso es trabajo de la Fase E, a nivel de rutas) — solo anima la ENTRADA
// del contenido que ya reemplazó al anterior, desde el lado que corresponda
// según si la pestaña nueva está a la derecha o izquierda de la anterior en
// `tabOrder`. Mucho más simple y ya da la sensación de "tarjeta deslizando".
//
// `tabOrder` tiene que ser una referencia estable (constante de módulo, no
// un array literal inline) para no disparar el efecto en cada render.
const NativeTabSlide = ({ tabKey, tabOrder, children }) => {
  const ref = useRef(null);
  const prevIndexRef = useRef(tabOrder.indexOf(tabKey));

  useEffect(() => {
    const index = tabOrder.indexOf(tabKey);
    const direction = index > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = index;

    if (!Capacitor.isNativePlatform() || !ref.current) return;

    gsap.fromTo(
      ref.current,
      { x: direction * 24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.28, ease: "power2.out" }
    );
  }, [tabKey, tabOrder]);

  return <div ref={ref}>{children}</div>;
};

export default NativeTabSlide;
