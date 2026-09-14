"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón con estado visual (idle / loading / success), inspirado en el
 * "Stateful Button" de Aceternity — pero controlado desde afuera en vez
 * de manejar su propia promesa.
 *
 * Por qué controlado y no con un `onClick` que devuelve una promesa
 * (como en la demo original): los tres formularios de este sitio
 * (contacto, checkout, boletín) ya validan con `<form onSubmit>` y el
 * atributo `required` nativo del navegador — eso solo funciona con un
 * botón `type="submit"` disparado por el evento `submit` del form. Si
 * este botón manejara su propio `onClick` async, perderíamos esa
 * validación nativa (el navegador ya no mostraría "completa este
 * campo") y correríamos el riesgo de mandar la petición dos veces.
 *
 * En su lugar, cada formulario sigue teniendo su propio estado
 * `sending` (como ya tenía) y solo se lo pasa a este botón como
 * `status`. El resultado visual es el mismo: mientras `status` es
 * "loading" se ve un spinner en vez del texto, y "success" un check.
 */
type ButtonStatus = "idle" | "loading" | "success";

export function Button({
  className,
  children,
  status = "idle",
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  status?: ButtonStatus;
}) {
  return (
    <button
      {...props}
      disabled={disabled || status !== "idle"}
      className={cn(
        "btn-yei notch-frame-sm relative inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "loading" ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.span>
        ) : status === "success" ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
