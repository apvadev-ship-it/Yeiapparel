import { useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web";
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

export function PageTransition() {
  const location = useLocation();
  const [isChanging, setIsChanging] = useState(false);
  const [calm, setCalm] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    // La primera carga no es un cambio de página: no se interrumpe.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), calm ? 380 : HOLD_MS);
    return () => clearTimeout(timer);
  }, [location.pathname, calm]);

  // Monta la animación cuando aparece la cortinilla y la destruye al salir.
  useEffect(() => {
    if (!isChanging || calm || !boxRef.current) return;

    const anim = lottie.loadAnimation({
      container: boxRef.current,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData: introData,
    });
    anim.setSpeed(SPEED);
    anim.playSegments([0, LAST_FRAME], true);
    animRef.current = anim;

    return () => {
      anim.destroy();
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
