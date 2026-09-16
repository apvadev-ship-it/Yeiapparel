import { useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import introData from "@/assets/luxury-intro.json";

/**
 * Cortinilla entre páginas: reproduce la animación de marca en cada
 * cambio de ruta.
 *
 * El archivo dura 4 s (240 cuadros a 60 fps), pero el trazo de las letras
 * termina cerca del cuadro 120; el resto es una pausa sostenida. Para no
 * hacer esperar en cada navegación se reproduce solo ese tramo y algo
 * acelerado, de modo que la cortinilla dura ~1,1 s.
 */
const LAST_FRAME = 122;
const SPEED = 1.6;
const HOLD_MS = 1150;

/**
 * Agrupa rutas en la misma "sección" de navegación: el paso a paso de
 * comprar (tienda -> producto -> pago -> confirmación) es un solo flujo,
 * no un cambio de sección, así que no debe cortar con la cortinilla de
 * marca en cada paso — solo al entrar o salir de ese flujo.
 */
function getSection(pathname: string): string {
  if (
    pathname.startsWith("/tienda") ||
    pathname.startsWith("/producto") ||
    pathname.startsWith("/finalizar-compra") ||
    pathname.startsWith("/pedido")
  ) {
    return "tienda";
  }
  if (pathname === "/") return "inicio";
  return pathname.split("/")[1] ?? "inicio";
}

export function PageTransition() {
  const location = useLocation();
  const [isChanging, setIsChanging] = useState(false);
  const [calm, setCalm] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const firstRender = useRef(true);
  const prevSection = useRef(getSection(location.pathname));

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    // La primera carga no es un cambio de página: no se interrumpe.
    if (firstRender.current) {
      firstRender.current = false;
      prevSection.current = getSection(location.pathname);
      return;
    }

    const section = getSection(location.pathname);
    if (section === prevSection.current) return;
    prevSection.current = section;

    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), calm ? 380 : HOLD_MS);
    return () => clearTimeout(timer);
  }, [location.pathname, calm]);

  // Monta la animación cuando aparece la cortinilla y la destruye al salir.
  // `lottie-web` se importa dinámicamente: en la carga inicial nunca se
  // reproduce (ver el guard de `firstRender` arriba), así que cargarla de
  // entrada solo suma peso al bundle inicial sin usarla.
  useEffect(() => {
    if (!isChanging || calm || !boxRef.current) return;

    let cancelled = false;
    const container = boxRef.current;

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !container) return;
      const anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: introData,
      });
      anim.setSpeed(SPEED);
      anim.playSegments([0, LAST_FRAME], true);
      animRef.current = anim;
    });

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [isChanging, calm]);

  return (
    <AnimatePresence>
      {isChanging && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-marfil"
        >
          {calm ? (
            <span className="font-display text-5xl tracking-[0.45em] text-chocolate">
              YEI
            </span>
          ) : (
            <div
              ref={boxRef}
              aria-hidden="true"
              className="w-[78vw] max-w-[560px]"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
