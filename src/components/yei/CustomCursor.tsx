import { useEffect, useRef, useState } from "react";
import { Sparkle } from "lucide-react";

/**
 * ¿El punto (x, y) cae sobre un fondo oscuro?
 *
 * Se recorren los ancestros del elemento bajo el puntero hasta encontrar el
 * primer fondo opaco y se mide su luminancia. Un elemento puede forzar el
 * resultado con data-cursor="light" (fondo oscuro) o data-cursor="dark",
 * útil sobre fotos y degradados, donde el color calculado no dice nada.
 */
function isDarkUnder(x: number, y: number): boolean {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;

  while (el && el !== document.documentElement) {
    const forced = el.dataset?.cursor;
    if (forced === "light") return true;
    if (forced === "dark") return false;

    const bg = getComputedStyle(el).backgroundColor;
    const parts = bg.match(/[\d.]+/g);

    if (parts && parts.length >= 3) {
      const alpha = parts.length > 3 ? Number(parts[3]) : 1;
      if (alpha > 0.5) {
        const [r, g, b] = parts.map(Number);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance < 0.5;
      }
    }

    el = el.parentElement;
  }

  return false;
}

/**
 * Cursor personalizado: la estrella de la marquesina, rellena, siguiendo el
 * mouse. Solo se activa en dispositivos con puntero fino (escritorio) y se
 * desactiva si el usuario pidió menos movimiento.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [onDark, setOnDark] = useState(false);

  const ringRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(fine.matches && !calm.matches);
    sync();
    fine.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("has-custom-cursor");

    const interactiveSelector =
      'a, button, input, textarea, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])';

    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
      const el = e.target as HTMLElement | null;
      setHovering(Boolean(el?.closest?.(interactiveSelector)));
    };
    const handleLeave = () => setVisible(false);
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);

    let frame = 0;
    const tick = () => {
      // La estrella persigue al mouse con un ligero retraso.
      ring.current.x += (target.current.x - ring.current.x) * 0.16;
      ring.current.y += (target.current.y - ring.current.y) * 0.16;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`;
      }

      // Leer el fondo es costoso, así que se muestrea cada pocos cuadros.
      frame = (frame + 1) % 6;
      if (frame === 0) {
        setOnDark(isDarkUnder(target.current.x, target.current.y));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  const scale = pressed ? 0.8 : hovering ? 1.9 : 1;

  // Sobre fondos oscuros la estrella se aclara para no perderse.
  const starColor = onDark
    ? hovering
      ? "var(--terracota-claro)"
      : "var(--marfil)"
    : hovering
      ? "var(--terracota)"
      : "var(--chocolate)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 220ms ease" }}
    >
      {/* La misma estrella que separa la marquesina, rellena y girando */}
      <div ref={ringRef} className="fixed left-0 top-0 will-change-transform">
        <div className="cursor-star-spin">
          <Sparkle
            className="h-7 w-7"
            fill="currentColor"
            strokeWidth={0}
            style={{
              color: starColor,
              transform: `scale(${scale})`,
              transition:
                "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), color 260ms ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
