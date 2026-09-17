import { Sparkle } from "lucide-react";

/**
 * Estrellitas decorativas —las mismas del cursor— repartidas por las
 * esquinas de un fondo oscuro. Giran y titilan a ritmos distintos para
 * que el café no se sienta plano. Es puramente decorativo: no recibe
 * clics ni lo anuncian los lectores de pantalla.
 *
 * El contenedor donde se use debe ser `relative` y, normalmente,
 * `overflow-hidden`.
 */
const STARS = [
  { top: "6%", left: "4%", size: 78, opacity: 0.42, spin: 16, twinkle: 4.5, delay: 0 },
  { top: "14%", left: "89%", size: 54, opacity: 0.34, spin: 22, twinkle: 5.5, delay: 0.8 },
  { top: "70%", left: "3%", size: 48, opacity: 0.3, spin: 19, twinkle: 6, delay: 1.6 },
  { top: "78%", left: "91%", size: 70, opacity: 0.38, spin: 14, twinkle: 5, delay: 0.4 },
  { top: "42%", left: "95%", size: 36, opacity: 0.24, spin: 25, twinkle: 6.5, delay: 2.2 },
  { top: "56%", left: "1%", size: 38, opacity: 0.24, spin: 21, twinkle: 4.8, delay: 1.2 },
  { top: "34%", left: "48%", size: 30, opacity: 0.16, spin: 28, twinkle: 7, delay: 3 },
];

export function StarField({
  className = "",
  /** Multiplica el tamaño base de las estrellas (1 = tamaño normal). */
  scale = 1,
}: {
  className?: string;
  scale?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {STARS.map((s, i) => (
        <Sparkle
          key={i}
          fill="currentColor"
          strokeWidth={0}
          className="absolute text-marfil"
          style={{
            top: s.top,
            left: s.left,
            width: s.size * scale,
            height: s.size * scale,
            // Al agrandarlas se centran en su punto para que no se
            // amontonen todas hacia abajo y a la derecha.
            marginTop: (-s.size * scale) / 2,
            marginLeft: (-s.size * scale) / 2,
            opacity: s.opacity,
            animation: `yei-spin ${s.spin}s linear infinite, cursor-twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
