import { useEffect, useState } from "react";
import { X, Mail, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subscribeToNewsletter } from "@/lib/newsletter";

/**
 * Aviso de "agotado" con alta al boletín, para dos momentos:
 *
 *  - se abre solo al entrar a la ficha de un producto sin unidades en
 *    ninguna talla/color (ver `useProductSoldOut` en `stock.ts`);
 *  - se abre al tocar una talla tachada en el selector, en vez de
 *    saltar sola a otra talla — la persona decide si quiere esperar
 *    esa talla puntual o no.
 *
 * Reutiliza `subscribeToNewsletter`, la misma alta que usa el 15% de
 * la home: un correo, una lista, un solo lugar que la escribe.
 */
export function OutOfStockNotice({
  open,
  onClose,
  productName,
  size,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  /** Si viene, el aviso es por ESTA talla puntual, no por todo el producto. */
  size?: string;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState(false);

  // Cada vez que se vuelve a abrir (otra talla, otra visita) arranca
  // en blanco: no debe seguir mostrando el éxito de la vez anterior.
  useEffect(() => {
    if (open) {
      setEmail("");
      setSending(false);
      setSubscribed(false);
      setError(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(false);
    try {
      const result = await subscribeToNewsletter({ data: { email: email.trim() } });
      if (!result.ok) {
        setError(true);
        return;
      }
      setSubscribed(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const title = size
    ? `Talla ${size} agotada`
    : `${productName} está agotado`;
  const detail = size
    ? `La talla ${size} de ${productName} no tiene unidades ahora mismo.`
    : `Ahora mismo no hay unidades de ${productName} en ninguna talla.`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-chocolate/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-5 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="out-of-stock-title"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="notch-frame pointer-events-auto relative w-full max-w-sm bg-marfil px-6 py-8 text-center shadow-2xl sm:px-8"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-chocolate/60 hover:bg-chocolate/10 hover:text-chocolate transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-terracota/15 text-terracota">
                <Mail className="h-5 w-5" />
              </span>

              <h2
                id="out-of-stock-title"
                className="font-display text-2xl text-chocolate font-medium"
              >
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-chocolate/75 font-light">
                {detail} Déjanos tu correo y te avisamos apenas vuelva.
              </p>

              <AnimatePresence mode="wait">
                {!subscribed ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="mt-6 flex flex-col gap-2.5"
                  >
                    <label htmlFor="out-of-stock-email" className="sr-only">
                      Correo electrónico
                    </label>
                    <input
                      id="out-of-stock-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="notch-frame-sm w-full bg-nude/60 px-4 py-3 text-sm text-chocolate placeholder:text-chocolate/40 outline-none focus-visible:bg-nude"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="btn-yei notch-frame-sm w-full bg-chocolate text-marfil hover:bg-chocolate/85 disabled:opacity-60 py-3 text-xs font-semibold tracking-[0.18em]"
                    >
                      {sending ? "Enviando…" : "Avísame cuando vuelva"}
                    </button>
                    {error && (
                      <p className="text-xs text-red-600">
                        No pudimos completar el registro. Inténtalo de nuevo.
                      </p>
                    )}
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex flex-col items-center gap-2"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-terracota text-marfil">
                      <Check className="h-4.5 w-4.5" />
                    </span>
                    <p className="text-sm font-semibold text-chocolate">
                      ¡Listo! Te avisamos por correo.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
