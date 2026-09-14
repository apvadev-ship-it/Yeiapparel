import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface SideImage {
  src: string;
  alt: string;
  position: "left" | "right";
}

export function HeroSpin({
  centerSrc,
  centerAlt,
  sideImages,
}: {
  centerSrc: string;
  centerAlt: string;
  sideImages: SideImage[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileParallax, setMobileParallax] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Suave parallax de la imagen en móvil, para que la portada se sienta
  // viva sin recurrir al scroll-jacking que usamos en escritorio.
  useEffect(() => {
    if (isDesktop) return;

    const handleMobileScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, -rect.top / (rect.height || 1)),
      );
      setMobileParallax(progress * -36);
    };

    window.addEventListener("scroll", handleMobileScroll, { passive: true });
    handleMobileScroll();

    return () => window.removeEventListener("scroll", handleMobileScroll);
  }, [isDesktop]);

  const measure = useCallback(() => {
    if (!sectionRef.current || !stickyRef.current) return;

    const rect = sectionRef.current.getBoundingClientRect();
    const sectionHeight = sectionRef.current.offsetHeight;
    const stickyHeight = stickyRef.current.offsetHeight;
    // Distancia máxima que la caja fija puede deslizar dentro de su
    // contenedor antes de soltarse (si es menor a su propia altura,
    // el contenido siguiente queda tapado).
    const scrollableHeight = sectionHeight - stickyHeight;
    const scrolled = -rect.top;
    const progress = Math.max(
      0,
      Math.min(1, scrolled / (scrollableHeight || 1)),
    );

    setScrollProgress(progress);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setScrollProgress(0);
      return;
    }

    // El alto de la sección y el de la caja fija se miden en vh: si la
    // ventana cambia de tamaño (redimensionar, zoom del navegador, abrir
    // las herramientas) hay que volver a calcular el progreso o la
    // animación se queda congelada en la medida de la pantalla anterior.
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [isDesktop, measure]);

  // En móvil se muestra la portada estática, sin animación de scroll.
  const imageProgress = isDesktop
    ? Math.max(0, Math.min(1, scrollProgress))
    : 0;

  const centerWidth = 100 - imageProgress * 58;
  const centerHeight = 100 - imageProgress * 42;
  const sideWidth = imageProgress * 22;
  const sideOpacity = imageProgress;
  // El desplazamiento lateral va en vw (no en % del propio elemento):
  // las columnas nacen con ancho 0, así que un `translateX(-100%)` no
  // movía nada y en vez de entrar deslizándose sólo aparecían.
  const sideSlide = (1 - imageProgress) * 18;
  const gap = imageProgress * 16;

  // El botón sólo se ve con la imagen grande; al encoger, cede el lugar
  // al logo YEI (el mismo de la barra superior).
  const ctaOpacity = Math.max(0, 1 - imageProgress / 0.3);
  // El logo empieza a aparecer cuando el hueco que deja la foto ya es más
  // alto que la propia letra; antes de ese punto se vería recortado por
  // arriba y por abajo en pantallas bajas. Cuanto más grande es la letra,
  // más tarde puede entrar.
  const logoOpacity = Math.max(0, Math.min(1, (imageProgress - 0.62) / 0.28));

  const leftImages = sideImages.filter((img) => img.position === "left");
  const rightImages = sideImages.filter((img) => img.position === "right");

  // Cada recuadro usa un bisel distinto, como el resto de las tarjetas del sitio.
  // La imagen central solo muestra el bisel una vez que empieza a encogerse.
  const leftNotch = ["notch-frame-sm", "notch-frame"];
  const rightNotch = ["notch-frame", "notch-frame-sm"];
  const centerNotch = imageProgress > 0.05 ? "notch-frame-lg" : "notch-frame";

  return (
    <section
      ref={sectionRef}
      className="relative bg-nude"
      style={{ contain: "layout" }}
    >
      {/* Contenedor sticky para la animación de scroll (solo escritorio) */}
      <div
        ref={stickyRef}
        className="relative h-[88vh] overflow-hidden lg:sticky lg:top-0 lg:h-[92vh]"
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative flex h-full w-full items-stretch justify-center"
            style={{
              gap: `${gap}px`,
              padding: `${imageProgress * 16}px`,
            }}
          >
            {/* Columna izquierda (solo visible en escritorio, al hacer scroll) */}
            <div
              className="hidden h-full flex-col will-change-transform lg:flex"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translate3d(-${sideSlide}vw, 0, 0)`,
                opacity: sideOpacity,
              }}
            >
              {leftImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative flex-1 overflow-hidden will-change-transform ${leftNotch[idx % leftNotch.length]}`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Columna central: la foto arriba y, debajo, el hueco donde
                aparece el logo. Al estar en flujo (y no en posición
                absoluta con un `bottom` fijo en píxeles) el logo nunca
                puede montarse sobre la foto, mida lo que mida la pantalla. */}
            <div
              className="relative flex h-full flex-col"
              style={{ width: `${centerWidth}%`, flex: "0 0 auto" }}
            >
              <div
                className={`relative overflow-hidden will-change-transform ${centerNotch}`}
                style={{ height: `${centerHeight}%`, flex: "0 0 auto" }}
              >
                <motion.img
                  src={centerSrc}
                  alt={centerAlt}
                  initial={{ opacity: 0, scale: 1.15 }}
                  animate={{
                    opacity: 1,
                    scale: isDesktop ? 1 : 1.08,
                    y: isDesktop ? 0 : mobileParallax,
                  }}
                  transition={{
                    opacity: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                    scale: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
                    y: { duration: 0.1, ease: "linear" },
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* Logo YEI: ocupa el espacio que deja la foto al encoger y
                  se funde con el mismo progreso del scroll. */}
              <div
                className="hidden min-h-0 flex-1 items-center justify-center overflow-hidden lg:flex"
                style={{ opacity: logoOpacity }}
              >
                <span
                  className="font-display leading-none tracking-[0.2em] text-chocolate"
                  style={{
                    // Se ajusta al alto libre y al ancho de la columna, así
                    // que no desborda ni en pantallas bajas ni en ultraanchas.
                    fontSize: "clamp(2.5rem, min(22vh, 19vw), 16rem)",
                    textIndent: "0.2em",
                  }}
                >
                  YEI
                </span>
              </div>
            </div>

            {/* Columna derecha (solo visible en escritorio, al hacer scroll) */}
            <div
              className="hidden h-full flex-col will-change-transform lg:flex"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translate3d(${sideSlide}vw, 0, 0)`,
                opacity: sideOpacity,
              }}
            >
              {rightImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative flex-1 overflow-hidden will-change-transform ${rightNotch[idx % rightNotch.length]}`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA visible sólo con la imagen grande; se desvanece al encoger */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: ctaOpacity, y: 0 }}
            transition={{
              opacity: { duration: 0.3, ease: "linear" },
              y: { duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] },
            }}
            style={{ pointerEvents: ctaOpacity > 0.4 ? "auto" : "none" }}
            className="absolute inset-x-0 bottom-6 z-20 flex justify-center px-6 lg:bottom-10"
          >
            <Link
              to="/tienda"
              className="btn-yei notch-frame-sm bg-chocolate text-marfil hover:bg-chocolate/90 shadow-2xl transition-all active:scale-95 font-medium text-xs lg:text-sm px-9 py-4"
            >
              <ArrowRight className="btn-yei-arrow h-4 w-4 text-terracota" />
              <span>Comprar ahora</span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Espacio de scroll que alimenta la animación (solo escritorio).
          Es la distancia real que el usuario tiene que recorrer para
          completarla: con los 12vh de antes se resolvía en menos de una
          muesca de rueda y parecía un salto, no una animación. */}
      <div className="hidden lg:block lg:h-[60vh]" />
    </section>
  );
}
