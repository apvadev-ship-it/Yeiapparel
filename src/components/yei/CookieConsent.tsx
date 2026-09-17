import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

/**
 * Consentimiento de cookies. YEI hoy solo usa almacenamiento local
 * técnico (el carrito, ver `lib/cart.tsx`) — no hay cookies de
 * analítica ni de publicidad todavía. Por eso solo hay una decisión
 * real que tomar: "aceptar" vs "solo esenciales", y ambas dejan el
 * sitio funcionando igual. El valor de tenerlo ahora es que si más
 * adelante se agrega analítica o píxeles de publicidad, ya existe el
 * mecanismo de consentimiento — y se lee la misma clave para decidir
 * si se cargan o no.
 */
const STORAGE_KEY = "yei-cookie-consent-v1";

type Consent = "todas" | "esenciales";

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "todas" || raw === "esenciales" ? raw : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Almacenamiento no disponible (modo privado, etc.) — el banner
    // volverá a aparecer en la próxima visita, no es un error fatal.
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  const decide = (value: Consent) => {
    writeConsent(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="notch-frame mx-auto flex max-w-3xl flex-col gap-4 bg-chocolate px-6 py-6 text-nude shadow-[0_-12px_40px_-10px_rgba(53,26,23,0.4)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs leading-relaxed font-light text-nude/85 sm:text-sm sm:max-w-md">
              Usamos almacenamiento esencial para que tu carrito no se pierda al
              navegar. Puedes conocer el detalle en nuestra{" "}
              <Link
                to="/politicas-de-privacidad"
                className="link-underline text-marfil hover:text-marfil"
              >
                política de cookies
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => decide("esenciales")}
                className="notch-frame-sm press-tap bg-marfil/10 px-5 py-3 text-xs font-semibold tracking-widest text-nude transition-all duration-300 hover:bg-marfil/20 hover:text-marfil"
              >
                Solo esenciales
              </button>
              <button
                type="button"
                onClick={() => decide("todas")}
                className="notch-frame-sm press-tap bg-terracota px-5 py-3 text-xs font-semibold tracking-widest text-marfil transition-all duration-300 hover:bg-terracota/90"
              >
                Aceptar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
