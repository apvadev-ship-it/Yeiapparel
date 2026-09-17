import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { useCart } from "@/lib/cart";
import { motion, AnimatePresence } from "motion/react";

/** Rutas cuyo fondo superior es oscuro. */
const DARK_HERO_ROUTES = [
  "/nueva-coleccion",
  "/tienda",
  "/politicas-de-privacidad",
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { count, setOpen } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrolledNow = currentScrollY > 35;
      setScrolled(isScrolledNow);
      if (!isScrolledNow) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determinar si la barra se muestra completa (arriba del todo O expandida al interactuar)
  const isFullBarVisible = !scrolled || isExpanded;

  // En rutas con portada oscura la barra transparente dejaría el texto
  // chocolate ilegible, así que ahí se mantiene siempre el panel marfil.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const solidBar = scrolled || DARK_HERO_ROUTES.includes(pathname);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3.5 lg:pt-5"
    >
      {/* Contenedor biselado notch-frame compacto y elegante */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => {
          if (scrolled) setIsExpanded(true);
        }}
        onMouseLeave={() => {
          if (scrolled) setIsExpanded(false);
        }}
        className={`pointer-events-auto relative transition-all duration-500 ease-out ${
          !isFullBarVisible
            ? "notch-frame-sm w-auto min-w-[150px] max-w-[210px] bg-chocolate/35 p-[1.5px] shadow-[0_14px_36px_-8px_rgba(53,34,31,0.4)] cursor-pointer"
            : solidBar
              ? "notch-frame w-full max-w-[660px] lg:max-w-[760px] bg-chocolate/20 p-[1.5px] shadow-[0_12px_32px_-10px_rgba(53,34,31,0.2)]"
              : "notch-frame w-full max-w-[660px] lg:max-w-[760px] bg-transparent p-[1.5px] shadow-none"
        }`}
      >
        {/* Contenedor interior */}
        <div
          className={`relative flex items-center justify-between text-chocolate transition-all duration-500 ease-out ${
            !isFullBarVisible
              ? "notch-frame-sm justify-center px-4 py-2 bg-marfil/95 backdrop-blur-xl hover:bg-marfil"
              : solidBar
                ? "notch-frame gap-3 px-4 py-3 sm:px-5 lg:px-7 lg:py-3.5 bg-marfil/95 backdrop-blur-xl"
                : "notch-frame gap-3 px-4 py-3 sm:px-5 lg:px-7 lg:py-3.5 bg-transparent backdrop-blur-0"
          }`}
        >
          <AnimatePresence mode="wait">
            {isFullBarVisible ? (
              <motion.div
                key="full-bar"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center"
              >
                {/* Clon invisible (más angosto a propósito) del botón del
                    carrito: reserva a la izquierda casi el mismo ancho
                    que el carrito real ocupa a la derecha, para que
                    Colección · YEI · Tienda quede centrado sin quedar
                    pegado al borde — pero un poco menos, para no robarle
                    visibilidad al contenido de la izquierda. */}
                <div
                  className="invisible flex items-center"
                  aria-hidden="true"
                >
                  <span className="notch-frame-sm inline-flex items-center gap-1.5 px-1 py-1.5 sm:gap-2 sm:px-2 lg:px-2.5 lg:py-2 text-xs font-semibold tracking-[0.2em] uppercase">
                    <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.8} />
                    <span className="hidden sm:inline">Carrito</span>
                    <span className="grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-bold">
                      {count}
                    </span>
                  </span>
                </div>

                {/* Colección · YEI · Tienda, con el mismo espacio a cada lado
                    del logo. */}
                <div className="flex items-center justify-center gap-2 sm:gap-6 lg:gap-9">
                  <Link
                    to="/nueva-coleccion"
                    className="link-underline -mr-[0.12em] sm:-mr-[0.2em] text-[11px] sm:text-xs lg:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-semibold text-terracota hover:text-chocolate transition-colors"
                  >
                    Lo nuevo
                  </Link>

                  <Link
                    to="/"
                    aria-label="YEI inicio"
                    className="group -mr-[0.35em] sm:-mr-[0.45em] shrink-0 font-display text-xl sm:text-2xl lg:text-3xl tracking-[0.35em] sm:tracking-[0.45em] transition-all duration-300 hover:text-terracota font-medium"
                  >
                    <span>YEI</span>
                  </Link>

                  <Link
                    to="/tienda"
                    className="link-underline text-[11px] sm:text-xs lg:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-medium text-chocolate/85 hover:text-terracota transition-colors"
                  >
                    Tienda
                  </Link>
                </div>

                <div className="flex items-center justify-end">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setOpen(true)}
                    aria-label="Abrir carrito de compras"
                    className="notch-frame-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-3.5 lg:px-4 lg:py-2 bg-chocolate text-marfil text-xs font-semibold tracking-[0.2em] uppercase shadow-sm hover:bg-chocolate/90 transition-all cursor-pointer"
                  >
                    <ShoppingBag
                      className="h-3.5 w-3.5 text-marfil"
                      strokeWidth={1.8}
                    />
                    <span className="hidden sm:inline">Carrito</span>
                    <span
                      className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-bold ${
                        count > 0
                          ? "bg-terracota text-marfil"
                          : "bg-marfil/20 text-marfil/80"
                      }`}
                    >
                      {count}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* AL BAJAR: BOTÓN YEI INTERACTIVO QUE AL TOCAR/PASAR EL CURSOR SE ABRE POR COMPLETO */
              <motion.button
                key="logo-only"
                type="button"
                onClick={() => setIsExpanded(true)}
                aria-label="Expandir menú de navegación"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center gap-2 py-0.5 w-full cursor-pointer group"
              >
                <span className="font-display text-xl lg:text-2xl tracking-[0.35em] text-chocolate group-hover:text-terracota transition-colors font-medium pl-1">
                  YEI
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-terracota group-hover:translate-y-0.5 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.header>
  );
}
