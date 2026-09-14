import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Plus,
  Sparkle,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import eventoBandera from "@/assets/evento/video1_poster.jpg";
import eventoDia2 from "@/assets/evento/video2_poster.jpg";
import eventoDia1 from "@/assets/evento/video3_poster.jpg";
import eventoOcasion from "@/assets/evento/video4_poster.jpg";
import eventoBanderaTribuna from "@/assets/evento/video5_poster.jpg";
import eventoPremios from "@/assets/evento/video6_poster.jpg";
import eventoBotella from "@/assets/evento/IMG_0153.jpg";
import eventoEquipo from "@/assets/evento/IMG_0765.jpg";
import eventoProtector from "@/assets/evento/IMG_9952.jpg";
import testimonioCamila from "@/assets/testimonios/camila.webp";
import testimonioValentina from "@/assets/testimonios/valentina.webp";
import testimonioIsabella from "@/assets/testimonios/isabella.webp";
import testimonioDaniela from "@/assets/testimonios/daniela.webp";
import {
  heroImage,
  products,
  type ProductGroup,
  pickFeaturedProducts,
} from "@/lib/products";
import { getWeeklyTopSellingSlugs } from "@/lib/orders";
import { Reveal } from "@/components/yei/Reveal";
import { InstagramSection } from "@/components/yei/InstagramSection";
import { TikTokSection } from "@/components/yei/TikTokSection";
import { ProductCard } from "@/components/yei/ProductCard";
import { HeroSpin } from "@/components/yei/HeroSpin";
import { StarField } from "@/components/yei/StarField";
import { motion, AnimatePresence } from "motion/react";
import { subscribeToNewsletter } from "@/lib/newsletter";
const look1 =
  "https://cdn.builder.io/api/v1/image/assets%2Fd593854069c14b2bb2cc8227c9adc563%2Ffda4d2ea1ec14fcf869a672d641d7312";
const look3 =
  "https://cdn.builder.io/api/v1/image/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F5cb4c41d07f045f1a742af0faa6f0f67";
const setLook =
  "https://cdn.builder.io/api/v1/image/assets%2Fd593854069c14b2bb2cc8227c9adc563%2Fb11348411e2c4d1b9a7aa9020eacd481";
const piezaUnicaLook =
  "https://cdn.builder.io/api/v1/image/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F37d99a14b43d4a969f449943b0c7b836";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YEI APPAREL — Moda femenina de elegancia contemporánea" },
      {
        name: "description",
        content:
          "Más que moda, una forma de vivir tu esencia. Descubre lo más destacado de la colección 2026 de YEI APPAREL: sastrería y vestidos de satín con proporciones audaces y comodidad eterna.",
      },
      {
        property: "og:title",
        content: "YEI APPAREL — Moda femenina de elegancia contemporánea",
      },
      {
        property: "og:description",
        content: "Más que moda, una forma de vivir tu esencia. YEI APPAREL.",
      },
      { property: "og:url", content: "https://yeiapparel.co/" },
    ],
    links: [{ rel: "canonical", href: "https://yeiapparel.co/" }],
  }),
  component: Home,
});

function Home() {
  const carousel = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Solo en escritorio: en tactil el navegador ya desliza solo, y
  // engancharse aqui (con preventDefault) puede bloquear ese gesto.
  const handleCarouselMouseDown = (e: React.MouseEvent) => {
    if (!carousel.current || !isDesktop) return;
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - carousel.current.offsetLeft,
      scrollLeft: carousel.current.scrollLeft,
    };
  };

  const stopCarouselDrag = () => setIsDragging(false);

  // Flechas del carrusel: avanzan una tarjeta y se ocultan en los extremos.
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateCarouselEdges = useCallback(() => {
    const el = carousel.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = carousel.current;
    if (!el) return;
    updateCarouselEdges();
    el.addEventListener("scroll", updateCarouselEdges, { passive: true });
    window.addEventListener("resize", updateCarouselEdges);
    return () => {
      el.removeEventListener("scroll", updateCarouselEdges);
      window.removeEventListener("resize", updateCarouselEdges);
    };
  }, [updateCarouselEdges]);

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carousel.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const handleCarouselMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carousel.current || !isDesktop) return;
    e.preventDefault();
    const x = e.pageX - carousel.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.3;
    carousel.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const categorySectionRef = useRef<HTMLDivElement>(null);
  // Desplazamiento lateral en vw: en % era relativo al ancho de la
  // propia tarjeta, así que en pantallas anchas (donde la rejilla queda
  // centrada con márgenes) las tarjetas no llegaban a salirse y se veían
  // asomadas por los lados antes de tiempo.
  const [setsX, setSetsX] = useState(-60);
  const [piezasX, setPiezasX] = useState(60);
  const [categoryTitleOpacity, setCategoryTitleOpacity] = useState(1);
  const categoryRafRef = useRef<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const updateCategoryTransforms = useCallback(() => {
    if (!categorySectionRef.current) return;

    const rect = categorySectionRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const sectionHeight = categorySectionRef.current.offsetHeight;
    const scrollableRange = sectionHeight - windowHeight;
    const scrolled = -rect.top;
    const progress = Math.max(
      0,
      Math.min(1, scrolled / (scrollableRange || 1)),
    );

    // Primero solo se lee el texto; las imágenes solo empiezan a
    // deslizarse pasado ese tramo inicial, para no tapar la lectura.
    const revealStart = 0.4;
    const rawReveal = Math.max(
      0,
      Math.min(1, (progress - revealStart) / (1 - revealStart)),
    );
    // Suavizado (smoothstep) para que el deslizamiento acelere y frene
    // con naturalidad en vez de sentirse mecánico.
    const revealProgress = rawReveal * rawReveal * (3 - 2 * rawReveal);

    setSetsX((1 - revealProgress) * -60);
    setPiezasX((1 - revealProgress) * 60);
    setCategoryTitleOpacity(1 - revealProgress);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setSetsX(0);
      setPiezasX(0);
      setCategoryTitleOpacity(1);
      return;
    }

    const handleScroll = () => {
      if (categoryRafRef.current) cancelAnimationFrame(categoryRafRef.current);
      categoryRafRef.current = requestAnimationFrame(updateCategoryTransforms);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // El recorrido depende de `innerHeight`: sin esto, al redimensionar
    // la ventana las tarjetas se quedaban con la posición calculada para
    // el tamaño anterior hasta que el usuario volvía a hacer scroll. Va
    // directo y no por rAF, que el navegador congela mientras la pestaña
    // no se está pintando (ventana de fondo, minimizada, ahorro de
    // energía) y entonces el reajuste no llegaba nunca.
    window.addEventListener("resize", updateCategoryTransforms);
    updateCategoryTransforms();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateCategoryTransforms);
      if (categoryRafRef.current) cancelAnimationFrame(categoryRafRef.current);
    };
  }, [isDesktop, updateCategoryTransforms]);

  return (
    <>
      {/* ============================================================
          SECCIÓN 1: HERO PORTADA (Animación de giro con scroll)
          ============================================================ */}
      <HeroSpin
        centerSrc={heroImage}
        centerAlt="Campaña YEI New Collection 2026"
        sideImages={[
          { src: look1, alt: "Nala — Vestido de noche YEI", position: "left" },
          {
            src: look3,
            alt: "Madrileño — Sastrería de autor YEI",
            position: "left",
          },
          { src: setLook, alt: "Set completo YEI", position: "right" },
          { src: piezaUnicaLook, alt: "Pieza única YEI", position: "right" },
        ]}
      />

      {/* ============================================================
          SECCIÓN 2: COMPRAR POR CATEGORÍA (Sets / Piezas únicas, deslizan desde los lados)
          ============================================================ */}
      {isDesktop ? (
        <section
          ref={categorySectionRef}
          className="relative bg-nude"
          style={{ height: "160vh" }}
        >
          <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
            <div className="relative w-full">
              {/* Título de fondo, se desvanece a medida que las tarjetas se juntan */}
              <div
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4"
                style={{ opacity: categoryTitleOpacity }}
              >
                <h2 className="text-center font-display text-5xl leading-[0.95] text-chocolate drop-shadow-[0_2px_18px_rgba(232,218,209,0.9)] sm:text-7xl md:text-8xl lg:text-9xl font-medium">
                  Comprar por{" "}
                  <span className="italic text-terracota font-normal block sm:inline">
                    categoría
                  </span>
                </h2>
              </div>

              {/* `w-[min(100%,64vh)]`: la tarjeta es 4/5, así que su alto
                  lo manda su ancho. Sin este tope, en pantallas bajas
                  (1366x768, 1536x730…) crecía más que el `h-screen` de la
                  caja fija y el `overflow-hidden` le cortaba el nombre de
                  la categoría por arriba y por abajo.
                  `ml-auto` / `mr-auto`: cuando el tope recorta la tarjeta,
                  cada una se pega al centro de la rejilla en vez de
                  centrarse en su columna, que dejaba un vacío enorme entre
                  las dos. Así sólo las separa el `gap`. */}
              <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-2 gap-4 px-4 sm:gap-8 sm:px-6 lg:px-10">
                <div
                  className="ml-auto w-[min(100%,64vh)]"
                  style={{
                    transform: `translate3d(${setsX}vw, 0, 0)`,
                    backfaceVisibility: "hidden",
                  }}
                >
                  <CategoryTile
                    img={setLook}
                    title="Sets"
                    subtitle="Conjuntos completos"
                    categoria="sets"
                    notch="notch-frame-lg"
                  />
                </div>
                <div
                  className="mr-auto w-[min(100%,64vh)]"
                  style={{
                    transform: `translate3d(${piezasX}vw, 0, 0)`,
                    backfaceVisibility: "hidden",
                  }}
                >
                  <CategoryTile
                    img={piezaUnicaLook}
                    title="Piezas únicas"
                    subtitle="Prendas individuales"
                    categoria="piezas-unicas"
                    notch="notch-frame-lg"
                    delay={80}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative bg-nude px-4 py-12 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] text-chocolate font-medium">
              Comprar por{" "}
              <span className="italic text-terracota font-normal">
                categoría
              </span>
            </h2>
          </Reveal>

          <div className="mt-7 grid grid-cols-2 gap-4">
            <CategoryTile
              img={setLook}
              title="Sets"
              subtitle="Conjuntos completos"
              categoria="sets"
              notch="notch-frame-lg"
            />
            <CategoryTile
              img={piezaUnicaLook}
              title="Piezas únicas"
              subtitle="Prendas individuales"
              categoria="piezas-unicas"
              notch="notch-frame-lg"
              delay={80}
            />
          </div>
        </section>
      )}

      {/* ============================================================
          SECCIÓN 3: LO MÁS COMPRADO (Carrusel y piezas favoritas)
          ============================================================ */}
      <section className="bg-marfil px-5 py-10 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-[1500px]">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-chocolate font-medium text-center sm:text-left">
              Busca tus{" "}
              <span className="italic text-terracota font-normal">
                favoritos
              </span>
            </h2>
          </div>

          <div className="relative">
            {/* Flechas solo en escritorio; en celular se desliza con el dedo */}
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              disabled={!canScrollLeft}
              aria-label="Ver piezas anteriores"
              className="absolute left-0 top-[38%] z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center notch-frame-sm bg-chocolate text-marfil shadow-lg transition-all hover:bg-chocolate/85 disabled:pointer-events-none disabled:opacity-0 lg:grid"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              disabled={!canScrollRight}
              aria-label="Ver más piezas"
              className="absolute right-0 top-[38%] z-20 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 place-items-center notch-frame-sm bg-chocolate text-marfil shadow-lg transition-all hover:bg-chocolate/85 disabled:pointer-events-none disabled:opacity-0 lg:grid"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
            </button>

            <div
              ref={carousel}
              onMouseDown={handleCarouselMouseDown}
              onMouseMove={handleCarouselMouseMove}
              onMouseUp={stopCarouselDrag}
              onMouseLeave={stopCarouselDrag}
              className={`mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 sm:gap-6 lg:mt-10 lg:select-none lg:snap-none ${
                isDragging ? "lg:cursor-grabbing" : "lg:cursor-grab"
              } [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
            >
              {products.map((p, idx) => (
                <div
                  key={p.slug}
                  className="w-[58vw] shrink-0 snap-start sm:w-[34vw] lg:w-[calc((100%-8rem)/5)]"
                >
                  <Reveal delay={idx * 100}>
                    <ProductCard product={p} />
                  </Reveal>
                </div>
              ))}
            </div>
          </div>

          <Reveal className="mt-12 text-center">
            <Link to="/tienda" className="group inline-block">
              <p className="eyebrow text-terracota">✦ ¿Quieres ver más? ✦</p>
              <p className="mt-3 font-display text-4xl italic transition-colors duration-500 group-hover:text-terracota lg:text-6xl text-chocolate">
                Ver el catálogo completo
              </p>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECCIÓN: ÚLTIMOS EVENTOS
          ============================================================ */}
      <EventsSection />

      {/* ============================================================
          SECCIÓN: COLABORACIONES
          ============================================================ */}
      <CollaboratorsSection />

      {/* ============================================================
          SECCIÓN: LO MÁS DESTACADO DE ESTA COLECCIÓN (top 2 más vendidas)
          ============================================================ */}
      <FeaturedSection />

      {/* ============================================================
          SECCIÓN: TESTIMONIOS
          ============================================================ */}
      <TestimonialsSection />

      {/* ============================================================
          SECCIÓN 4: REDES SOCIALES — Instagram a la izquierda,
          TikTok a la derecha (apiladas en móvil). Cada una lee su
          propia tabla en Supabase; ver SOCIAL_FEEDS_SETUP.md.
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-terracota/25">
        <InstagramSection />
        <TikTokSection />
      </div>

      {/* ============================================================
          SECCIÓN: NEWSLETTER (15% de descuento)
          ============================================================ */}
      <NewsletterSection />

      {/* ============================================================
          SECCIÓN 5: PREGUNTAS FRECUENTES
          ============================================================ */}
      <FAQSection />
    </>
  );
}

/**
 * Las 2 piezas más vendidas de los últimos 7 días. Se piden al cargar
 * la página (`getWeeklyTopSellingSlugs`, en `src/lib/orders.ts`, lee
 * pedidos `APPROVED`) y mientras esa respuesta llega — o si esta
 * semana todavía no hay ventas — se usa el orden de respaldo de
 * `pickFeaturedProducts` (hoy: Comfy y Madrileño).
 */
function FeaturedSection() {
  const [topSlugs, setTopSlugs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getWeeklyTopSellingSlugs()
      .then((rows) => {
        if (!cancelled) setTopSlugs(rows.map((r) => r.slug));
      })
      .catch(() => {
        // Sin ventas que leer o sin base configurada: se queda con el
        // orden de respaldo, no es un error que deba verse.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = pickFeaturedProducts(topSlugs, 2);

  return (
    <section className="relative overflow-hidden bg-nude px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <div className="mx-auto max-w-[850px]">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl text-chocolate font-medium">
            Lo más vendido{" "}
            <span className="italic text-terracota font-normal block sm:inline">
              de la semana
            </span>
          </h2>
        </Reveal>

        {/* Misma tarjeta de producto que "Busca tus favoritos" (foto,
            nombre, precio, swatches de color), pero solo con "Comprar
            ahora" — aquí no se muestra "Añadir al carrito". */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-6">
          {featured.map((product, idx) => (
            <Reveal key={product.slug} delay={idx * 100}>
              <ProductCard product={product} showAddToCart={false} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Fotos reales de Polo & Classics 2026 (Bogotá). Todas comparten el
 * mismo pie de foto a propósito — es un solo evento, no una serie de
 * escenas distintas.
 */
const EVENT_SUB = "Bogotá · 2026";
const EVENT_CAPTION = "Polo & Classics 2026";

const EVENT_SLIDES = [
  {
    src: eventoEquipo,
    alt: "Equipo Piamonte con las bolsas de YEI Apparel en Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoBanderaTribuna,
    alt: "Bandera de YEI Apparel junto a la cancha de Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoBandera,
    alt: "Invitada YEI junto a la bandera del evento Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoDia1,
    alt: "Activación de YEI Apparel el primer día de Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoDia2,
    alt: "Activación de YEI Apparel el segundo día de Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoOcasion,
    alt: "Invitadas con piezas YEI Apparel en Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoPremios,
    alt: "Dinámica de premios de YEI Apparel en Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoBotella,
    alt: "Botella de YEI Apparel para Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
  {
    src: eventoProtector,
    alt: "Protector labial de YEI Apparel con cupón de Polo & Classics 2026",
    sub: EVENT_SUB,
    caption: EVENT_CAPTION,
  },
];

function EventsSection() {
  // Antes esta sección "atrapaba" el scroll vertical de la página para
  // animar el carrusel (sticky + transform según cuánto bajaba el
  // usuario). Ahora es un carrusel normal: el usuario lo desliza con el
  // dedo o el mouse si quiere, y si no, simplemente sigue bajando la
  // página de largo.
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - containerRef.current.offsetLeft,
      scrollLeft: containerRef.current.scrollLeft,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = x - dragState.current.startX;
    containerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const stopDrag = () => setIsDragging(false);

  return (
    <section className="relative bg-chocolate py-14 lg:py-20">
      <div className="relative px-4 sm:px-6 lg:px-10">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl text-marfil font-medium">
            Últimos{" "}
            <span className="italic text-marfil font-normal">Eventos</span>
          </h2>
        </Reveal>
      </div>

      <div className="relative mt-8 overflow-hidden lg:mt-10">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          className={`flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:gap-5 sm:px-6 lg:px-10 lg:select-none lg:snap-none ${
            isDragging ? "lg:cursor-grabbing" : "lg:cursor-grab"
          } [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        >
          {EVENT_SLIDES.map((s, i) => (
            <div
              key={i}
              className="notch-frame hover-zoom group relative h-[52vh] w-[78vw] shrink-0 snap-start overflow-hidden bg-nude/10 transition-shadow duration-500 hover:shadow-2xl sm:w-[50vw] lg:h-[58vh] lg:w-[30vw]"
            >
              <img
                src={s.src}
                alt={s.alt}
                loading={i < 2 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-chocolate/85 via-chocolate/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <span className="eyebrow text-marfil text-[11px] font-bold">
                  {s.sub}
                </span>
                <p className="mt-1 font-display text-xl sm:text-2xl text-marfil font-medium">
                  {s.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CollaboratorsSection() {
  const items = Array.from({ length: 5 });

  return (
    <section className="overflow-hidden bg-nude py-8 lg:py-12">
      <div className="mx-auto max-w-[1100px] px-4 text-center sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl text-chocolate font-medium">
            Marcas con las que{" "}
            <span className="italic text-terracota font-normal">
              hemos trabajado
            </span>
          </h2>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <div className="relative mt-6 border-y border-terracota/25 py-5 lg:mt-8 lg:py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-nude to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-nude to-transparent sm:w-32" />

          {/* El bucle salta a `translateX(-50%)`, así que la separación
              tiene que ir DENTRO de cada bloque (margen) y no como `gap`
              de la pista: con `gap` la primera mitad medía un hueco
              menos que la segunda y el ciclo daba un tirón al reiniciar. */}
          <div className="flex w-max animate-[yei-marquee_28s_linear_infinite] items-center">
            {items.concat(items).map((_, i) => (
              <div
                key={i}
                className="mr-16 flex shrink-0 items-center gap-16 sm:mr-24 sm:gap-24"
              >
                <span className="font-display text-4xl tracking-[0.04em] text-chocolate/80 sm:text-5xl lg:text-6xl">
                  POLO <span className="italic text-terracota">&</span> CLASSICS
                </span>
                <Sparkle
                  className="h-6 w-6 shrink-0 text-terracota/60 sm:h-8 sm:w-8"
                  style={{
                    animation: `yei-spin ${8 + (i % 3)}s linear infinite`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: "Camila R.",
    location: "Bogotá",
    quote:
      "La caída del satín es otro nivel. Se siente una prenda hecha para durar, no para una sola foto.",
    video:
      "https://cdn.builder.io/o/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F485f034e67904eeea6db75ca861e11d1%2Fcompressed?apiKey=d593854069c14b2bb2cc8227c9adc563&token=485f034e67904eeea6db75ca861e11d1&alt=media&optimized=true",
    poster: testimonioCamila,
  },
  {
    name: "Valentina G.",
    location: "Medellín",
    quote:
      "Pedí mi talla habitual y llegó perfecta. El empaque y la atención se sintieron cuidados de verdad.",
    video:
      "https://cdn.builder.io/o/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F6fb5c12ea55b4e7ead3395f96446df75%2Fcompressed?apiKey=d593854069c14b2bb2cc8227c9adc563&token=6fb5c12ea55b4e7ead3395f96446df75&alt=media&optimized=true",
    poster: testimonioValentina,
  },
  {
    name: "Isabella M.",
    location: "Cali",
    quote:
      "Tengo piezas de hace un año que siguen intactas. Ahí se nota la calidad de la tela.",
    video:
      "https://cdn.builder.io/o/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F458fa129df9c4412bfccf5e32787ae77?alt=media&token=cdae13d7-97c7-4555-a3e3-3df0746e2d2f&apiKey=d593854069c14b2bb2cc8227c9adc563",
    poster: testimonioIsabella,
  },
  {
    name: "Daniela P.",
    location: "Bogotá",
    quote:
      "Me encanta que sean series cortas: sé que no me voy a encontrar con alguien más en la misma prenda.",
    video:
      "https://cdn.builder.io/o/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F1f1fd0fd75c04ccf9a9079592a0f464a?alt=media&token=3db62401-9d73-4966-ade7-48b38ced2cc4&apiKey=d593854069c14b2bb2cc8227c9adc563",
    poster: testimonioDaniela,
  },
];

/** Una tarjeta de testimonio, compartida entre el carrusel táctil
 * (celular/tablet) y la cinta que se arrastra con mouse (escritorio). */
function TestimonialCard({
  t,
  index,
  className = "",
  onClick,
}: {
  t: (typeof TESTIMONIALS)[number];
  index: number;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`notch-frame hover-lift flex h-64 w-[85vw] shrink-0 cursor-pointer overflow-hidden bg-nude text-left shadow-sm sm:h-72 sm:w-[480px] lg:h-80 lg:w-[560px] ${className}`}
    >
      <div className="flex w-1/2 flex-col justify-center p-5 sm:p-7">
        <span className="font-display text-4xl leading-none text-terracota/50">
          “
        </span>
        <p className="mt-1 text-sm leading-relaxed text-chocolate/85 font-light sm:text-base">
          {t.quote}
        </p>
        <p className="mt-4 font-display text-lg text-chocolate font-medium">
          {t.name}
        </p>
        <p className="text-xs text-chocolate/55 font-light">{t.location}</p>
      </div>
      <div className="group relative h-full w-1/2 shrink-0 bg-chocolate/10">
        {/* Miniatura estática (no video autoplay): con hasta 4
            repeticiones de 4 testimonios en la pista de escritorio,
            reproducir videos reales a la vez saturaría el ancho de
            banda. El video completo con audio solo se carga al abrir
            el modal. */}
        <img
          src={t.poster}
          alt=""
          aria-hidden="true"
          loading={index < 4 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-chocolate/0 transition-colors group-hover:bg-chocolate/20">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-marfil/90 text-chocolate opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <Play className="h-4 w-4 translate-x-0.5 fill-chocolate" />
          </span>
        </div>
      </div>
    </button>
  );
}

function TestimonialsSection() {
  const [viewportWidth, setViewportWidth] = useState(0);
  // El carrusel se mueve solo (animación CSS en bucle) en los tres
  // formatos. Se pausa apenas alguien lo toca o le pasa el mouse por
  // encima — sea para arrastrarlo a mano o para abrir un testimonio —
  // y retoma sola un rato después de soltar.
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, scrollLeft: 0, dragged: false });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pausa mientras hay interacción; retoma sola 2.5s después de que se
  // suelta (mouse, dedo, o al cerrar el testimonio ampliado).
  const pauseThenResume = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2500);
  }, []);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    setPaused(true);
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - trackRef.current.offsetLeft,
      scrollLeft: trackRef.current.scrollLeft,
      dragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 4) dragState.current.dragged = true;
    trackRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const stopDrag = () => {
    setIsDragging(false);
    pauseThenResume();
  };

  // La cinta salta a `translateX(-50%)`: para que el corte no se note,
  // la mitad de la pista tiene que ser más ancha que la pantalla. En
  // monitores muy anchos hacían falta más copias o se veía un hueco
  // vacío al final de cada vuelta.
  const repeats = viewportWidth >= 2200 ? 4 : viewportWidth >= 640 ? 2 : 3;
  const track = Array.from({ length: repeats }, () => TESTIMONIALS).flat();
  const activeTestimonial = active !== null ? TESTIMONIALS[active] : null;

  return (
    <section className="overflow-hidden bg-marfil py-14 lg:py-20">
      <div className="mx-auto max-w-[1100px] px-4 text-center sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl text-chocolate font-medium">
            Testimonios{" "}
            <span className="italic text-terracota font-normal">reales</span>
          </h2>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <div className="relative mt-12 lg:mt-16">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-marfil to-transparent sm:w-32 lg:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-marfil to-transparent sm:w-32 lg:block" />

          {/* Celular/tablet: carrusel deslizable con el dedo, sin la
              animación automática — el scroll-snap nativo y la
              animación en bucle (que mueve la pista con `transform`)
              se pisaban entre sí, y por eso no se podía arrastrar con
              el dedo. Aquí no hay repeticiones: alcanza con la lista
              una vez. */}
          <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard
                key={i}
                t={t}
                index={i}
                className="snap-center"
                onClick={() => setActive(i)}
              />
            ))}
          </div>

          {/* Escritorio: cinta que se desliza sola, se puede arrastrar
              con el mouse, y se pausa al pasar el cursor o al tocar
              (con mouse). */}
          <div
            ref={trackRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={() => {
              if (isDragging) stopDrag();
            }}
            className={`hidden w-max items-stretch overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } ${
              paused
                ? ""
                : "animate-[yei-marquee_42s_linear_infinite] hover:[animation-play-state:paused]"
            }`}
          >
            {track.map((t, i) => (
              <TestimonialCard
                key={i}
                t={t}
                index={i}
                className="mr-6"
                onClick={() => {
                  if (dragState.current.dragged) return;
                  pauseThenResume();
                  setActive(i % TESTIMONIALS.length);
                }}
              />
            ))}
          </div>
        </div>
      </Reveal>

      {/* Testimonio ampliado: mismo video con audio, a pantalla
          completa, y el texto al lado. */}
      <Dialog
        open={activeTestimonial !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActive(null);
            pauseThenResume();
          }
        }}
      >
        <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none sm:max-w-sm lg:max-w-4xl">
          <DialogTitle className="sr-only">
            {activeTestimonial
              ? `Testimonio de ${activeTestimonial.name}`
              : "Testimonio"}
          </DialogTitle>
          {activeTestimonial && (
            <div className="notch-frame relative mx-auto flex max-h-[90vh] w-full flex-col overflow-y-auto overflow-x-hidden bg-chocolate lg:w-auto lg:flex-row lg:overflow-hidden">
              {/* El video respeta su formato vertical 9:16 siempre. En
                  celular y tablet queda arriba con el texto debajo (los
                  dos se ven); en escritorio (lg+), lado a lado. */}
              <div className="relative aspect-[9/16] h-[42vh] w-auto mx-auto shrink-0 bg-chocolate/50 sm:h-[48vh] lg:h-[78vh] lg:mx-0">
                <video
                  key={activeTestimonial.video}
                  src={activeTestimonial.video}
                  autoPlay
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex w-full flex-col items-center p-6 text-center lg:w-80 lg:items-start lg:justify-center lg:p-8 lg:text-left xl:w-96 xl:p-10">
                <span className="font-display text-5xl leading-none text-terracota/60">
                  “
                </span>
                <p className="mt-2 text-base leading-relaxed text-marfil/90 font-light lg:text-lg">
                  {activeTestimonial.quote}
                </p>
                <p className="mt-5 font-display text-2xl text-marfil font-medium">
                  {activeTestimonial.name}
                </p>
                <p className="text-sm text-marfil/60 font-light">
                  {activeTestimonial.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  pauseThenResume();
                }}
                aria-label="Cerrar"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-chocolate/60 text-marfil hover:bg-chocolate/80 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

const FAQS = [
  {
    q: "¿En cuánto tiempo llega mi pedido?",
    a: "Los pedidos dentro de Colombia llegan entre 2 y 5 días hábiles según tu ciudad. Cada pieza se despacha desde nuestro atelier en Bogotá con envío gratuito a todo el país.",
  },
  {
    q: "¿Cómo elijo mi talla correctamente?",
    a: "Cada ficha de producto incluye una guía de medidas específica de la prenda. Si tienes dudas entre dos tallas, escríbenos por la página de contacto y te ayudamos a elegir.",
  },
  {
    q: "¿Puedo cambiar o devolver una prenda?",
    a: "Sí. Tienes hasta 8 días calendario después de recibir tu pedido para solicitar un cambio de talla o una devolución, siempre que la prenda conserve sus etiquetas originales.",
  },
  {
    q: "¿Por qué trabajan con series cortas y limitadas?",
    a: "Producimos en lotes pequeños para cuidar la calidad de cada costura y evitar el desperdicio textil. Cuando una pieza se agota, es probable que no vuelva a fabricarse en la misma tela o color.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos tarjetas de crédito y débito, PSE y pago contra entrega en ciudades principales. Todos los pagos se procesan a través de pasarelas certificadas.",
  },
  {
    q: "¿Cómo debo cuidar mis prendas YEI?",
    a: "Recomendamos lavado en frío, a mano o en ciclo delicado, y secado a la sombra. Las telas nobles como el satín y el punto Milano conservan mejor su caída sin secadora ni plancha directa.",
  },
  {
    q: "¿Hacen envíos fuera de Colombia?",
    a: "Por ahora despachamos únicamente dentro de Colombia. Si nos escribes desde otro país, con gusto te contamos cuándo abriremos envíos internacionales.",
  },
];

/**
 * Una frase del rótulo: la parte neutra, la palabra que va en rosa y el
 * resto. Se guarda partida para poder colorear solo esa palabra mientras
 * el texto se escribe letra a letra.
 */
type Phrase = { prefix: string; accent: string; suffix: string };

/**
 * Escribe y borra las frases en bucle, resaltando en rosa la palabra
 * marcada de cada una. Arranca cuando entra en pantalla; si el usuario
 * pidió menos movimiento, muestra la última frase fija.
 */
function Typewriter({
  phrases,
  className = "",
}: {
  phrases: Phrase[];
  className?: string;
}) {
  const last = phrases[phrases.length - 1]!;
  const hostRef = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [calm, setCalm] = useState(false);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!hostRef.current || started) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStarted(true);
      },
      { threshold: 0.3 },
    );
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, [started]);

  const current = phrases[index] ?? last;
  const full = current.prefix + current.accent + current.suffix;

  useEffect(() => {
    if (!started || calm) return;

    let delay: number;
    if (!deleting) {
      delay = count === full.length ? 1500 : 65;
    } else {
      delay = count === 0 ? 260 : 32;
    }

    const id = setTimeout(() => {
      if (!deleting) {
        if (count === full.length) setDeleting(true);
        else setCount((c) => c + 1);
      } else {
        if (count === 0) {
          setDeleting(false);
          // Bucle: al terminar la última vuelve a empezar por la primera.
          setIndex((i) => (i + 1) % phrases.length);
        } else {
          setCount((c) => c - 1);
        }
      }
    }, delay);

    return () => clearTimeout(id);
  }, [started, calm, count, deleting, full, phrases.length]);

  // Reparte las letras ya escritas entre las tres partes de la frase.
  const shown = calm ? last : current;
  const typed = calm
    ? shown.prefix.length + shown.accent.length + shown.suffix.length
    : count;
  const pre = shown.prefix.slice(0, typed);
  const acc = shown.accent.slice(0, Math.max(0, typed - shown.prefix.length));
  const suf = shown.suffix.slice(
    0,
    Math.max(0, typed - shown.prefix.length - shown.accent.length),
  );

  return (
    <span ref={hostRef} className={className}>
      <span aria-hidden="true">
        {pre}
        <span className="text-rosa-claro">{acc}</span>
        {suf}
      </span>
      {!calm && (
        <span
          aria-hidden="true"
          className="ml-1.5 inline-block w-[3px] animate-pulse bg-rosa-claro align-middle"
          style={{ height: "0.85em" }}
        />
      )}
      {/* Texto estable para lectores de pantalla */}
      <span className="sr-only">{last.prefix + last.accent + last.suffix}</span>
    </span>
  );
}

/* El cupón se genera ahora en el servidor (`src/lib/newsletter.ts`), junto
   al alta y al envío del correo. Generarlo en el navegador significaba
   que el cliente decidía su propio código de descuento. */

/** Video de fondo de la sección del cupón (mismo material de la marca). */
const NEWSLETTER_BG_VIDEO =
  "https://cdn.builder.io/o/assets%2Fd593854069c14b2bb2cc8227c9adc563%2F485f034e67904eeea6db75ca861e11d1%2Fcompressed?apiKey=d593854069c14b2bb2cc8227c9adc563&token=485f034e67904eeea6db75ca861e11d1&alt=media&optimized=true";

const TYPEWRITER_PHRASES: Phrase[] = [
  { prefix: "Todo lo ", accent: "único", suffix: "" },
  { prefix: "Todo lo ", accent: "fantástico", suffix: "" },
  { prefix: "Todo lo ", accent: "ideal", suffix: " para ti" },
  { prefix: "Está en ", accent: "YEI", suffix: "" },
];

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState(false);
  /** Aviso del servidor cuando el alta salió pero el correo no. */
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(false);
    setNotice(null);
    try {
      // El alta ocurre en el servidor. Antes se insertaba en Supabase
      // desde aquí con la clave anónima: cualquiera podía escribir en la
      // tabla de correos sin pasar por la web, y el cupón se guardaba sin
      // que nadie lo enviara. Ahora el servidor guarda y manda el correo.
      const result = await subscribeToNewsletter({
        data: { email: email.trim() },
      });

      if (!result.ok) {
        setError(true);
        if (result.notice) setNotice(result.notice);
        return;
      }

      setSubscribed(true);
      if (result.notice) setNotice(result.notice);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-chocolate px-5 py-20 lg:px-10 lg:py-28">
      {/* Video de fondo, muy difuminado y tenue: da movimiento sin robar
          protagonismo al texto ni afectar su legibilidad. */}
      <video
        src={NEWSLETTER_BG_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
      />
      {/* Velo que mantiene el contraste del texto sobre el video */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-chocolate/70"
      />
      <StarField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-terracota/20 blur-3xl lg:h-96 lg:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-marfil/10 blur-3xl lg:h-96 lg:w-96"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Frases que se escriben y borran hasta quedarse en "Está en YEI" */}
        <h2 className="flex min-h-[11rem] items-center justify-center sm:min-h-[15rem] lg:min-h-[19rem]">
          <Typewriter
            phrases={TYPEWRITER_PHRASES}
            className="font-display text-6xl leading-[1.02] text-marfil sm:text-8xl lg:text-9xl font-medium"
          />
        </h2>

        <Reveal>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-nude/75 font-light lg:text-base">
            Regístrate con tu correo y recibe tu cupón exclusivo al instante.
            Sin letra pequeña, sin condiciones raras.
          </p>
        </Reveal>

        <Reveal className="mt-9">
          <AnimatePresence mode="wait">
            {!subscribed ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubscribe}
                className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Correo electrónico
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="notch-frame-sm min-w-0 flex-1 bg-marfil/15 px-5 py-4 text-sm text-marfil placeholder:text-nude/50 outline-none focus-visible:bg-marfil/25"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-yei notch-frame-sm shrink-0 bg-terracota text-marfil hover:bg-terracota/90 disabled:opacity-60 px-8 py-4 text-xs font-medium"
                >
                  {sending ? "Enviando…" : "Quiero mi cupón"}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto flex max-w-sm flex-col items-center gap-3"
              >
                <span className="notch-frame-sm grid h-12 w-12 place-items-center bg-terracota/25">
                  <Check className="h-5 w-5 text-terracota" />
                </span>
                <p className="font-display text-2xl text-marfil lg:text-3xl">
                  Correo registrado
                </p>
                <p className="text-sm leading-relaxed text-nude/70 font-light">
                  Tu cupón único de 15% ya quedó reservado. Te llegará a{" "}
                  <span className="text-marfil">{email.trim()}</span> en unos
                  minutos.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Aviso del servidor. Se enseña cuando el alta quedó guardada
              pero el correo no pudo salir: prometer un envío que no
              ocurrió es lo que hacía la versión anterior. */}
          {notice && !error && (
            <p className="mt-4 text-xs leading-relaxed text-nude/60">
              {notice}
            </p>
          )}
          {error && (
            <p className="mt-4 text-xs text-terracota">
              {notice ?? "Algo salió mal, inténtalo de nuevo."}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-marfil px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[900px]">
        <Reveal className="text-center max-w-xl mx-auto">
          <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl text-chocolate font-medium">
            Preguntas{" "}
            <span className="italic text-terracota font-normal">
              frecuentes
            </span>
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-terracota/25 border-t border-b border-terracota/25 lg:mt-14">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={item.q} delay={i * 40}>
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors hover:text-terracota lg:py-6"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg text-chocolate sm:text-xl lg:text-2xl font-medium">
                      {item.q}
                    </span>
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-terracota/40 text-chocolate transition-transform duration-300 ${
                        isOpen
                          ? "rotate-45 border-terracota text-terracota"
                          : ""
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 max-w-2xl text-sm leading-relaxed text-chocolate/75 font-light sm:text-base lg:pb-8">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={FAQS.length * 40} className="mt-10 text-center">
          <p className="text-sm text-chocolate/70 font-light">
            ¿No encontraste lo que buscabas?
          </p>
          <Link
            to="/contacto"
            className="btn-yei notch-frame-sm mt-4 inline-flex bg-terracota px-8 py-4 text-xs font-bold tracking-widest text-marfil shadow-md transition-colors hover:bg-terracota/90"
          >
            Escríbenos por aquí →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function CategoryTile({
  img,
  title,
  subtitle,
  categoria,
  delay = 0,
  notch = "notch-frame",
}: {
  img: string;
  title: string;
  subtitle: string;
  categoria: ProductGroup;
  delay?: number;
  notch?: "notch-frame" | "notch-frame-lg";
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <Link
        to="/tienda"
        search={{ categoria }}
        className={`group hover-lift relative block aspect-[3/4] sm:aspect-[4/5] overflow-hidden ${notch} bg-marfil shadow-lg border border-terracota/25 hover:shadow-2xl active:scale-[0.97]`}
      >
        <img
          src={img}
          alt={title}
          loading="lazy"
          width={900}
          height={1200}
          className="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div
          data-cursor="light"
          className="absolute inset-0 bg-gradient-to-t from-chocolate/85 via-chocolate/20 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-4 text-center text-marfil sm:p-7">
          <p className="font-display text-xl font-medium uppercase tracking-wide sm:text-3xl lg:text-4xl">
            {title}
          </p>
          <p className="mt-1 text-[11px] font-light text-nude/85 sm:text-sm">
            {subtitle}
          </p>
          <span className="label-xs mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-marfil sm:text-xs">
            Ver colección
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
