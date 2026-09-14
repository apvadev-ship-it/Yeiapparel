import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Scissors, Ruler, Package, Sparkle } from "lucide-react";
import { Reveal } from "@/components/yei/Reveal";
import { StarField } from "@/components/yei/StarField";
import story from "@/assets/story.jpg";
import look1 from "@/assets/look-1.jpg";
import look2 from "@/assets/look-2.jpg";
import look3 from "@/assets/look-3.jpg";
import look4 from "@/assets/look-4.jpg";
import look5 from "@/assets/look-5.jpg";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros — Detrás de cada prenda YEI" },
      {
        name: "description",
        content:
          "Las manos, las horas y el oficio detrás de cada prenda de YEI Apparel. Así trabajamos: del boceto al empaque, paso a paso.",
      },
      { property: "og:title", content: "Nosotros — Detrás de cada prenda YEI" },
      {
        property: "og:description",
        content:
          "Las manos, las horas y el oficio detrás de cada prenda de YEI Apparel.",
      },
      { property: "og:url", content: "https://yeiapparel.co/nosotros" },
      { property: "og:image", content: `https://yeiapparel.co${story}` },
      { name: "twitter:image", content: `https://yeiapparel.co${story}` },
    ],
    links: [{ rel: "canonical", href: "https://yeiapparel.co/nosotros" }],
  }),
  component: Nosotros,
});

/* ------------------------------------------------------------------
   CONTENIDO EDITABLE
   ------------------------------------------------------------------
   Todo lo de abajo son textos y cifras de ejemplo para dar forma a la
   página. Reemplázalos por los datos reales del atelier antes de
   publicarla: nombres del equipo, tiempos reales de cada paso y las
   cifras de producción.
   ------------------------------------------------------------------ */

/** Cada paso del oficio, del boceto a la caja que llega a la clienta. */
const PROCESO = [
  {
    id: "idea",
    titulo: "La idea",
    resumen: "Boceto y elección de tela",
    duracion: "2 semanas",
    quien: "Diseño",
    img: story,
    texto:
      "Todo arranca con un dibujo a mano y la mesa llena de telas. Probamos caídas, comparamos gramajes y descartamos mucho más de lo que aprobamos. Una pieza solo pasa de aquí si resuelve algo que ya nos han pedido: un largo, un escote, una tela que no dé calor.",
  },
  {
    id: "patron",
    titulo: "El patrón",
    resumen: "Patronaje y primera muestra",
    duracion: "5 días",
    quien: "Patronaje",
    img: look2,
    texto:
      "El boceto se convierte en moldes de papel, talla por talla. De ahí sale una primera muestra que nos probamos entre nosotras y sobre cuerpos distintos. Casi nunca queda bien a la primera: se corrige la sisa, se sube el tiro, se vuelve a coser.",
  },
  {
    id: "corte",
    titulo: "El corte",
    resumen: "Trazo y corte del lote",
    duracion: "1 día por lote",
    quien: "Corte",
    img: look3,
    texto:
      "Trazamos los moldes buscando que sobre la menor cantidad de tela posible. Cortamos por lotes pequeños, de veinte a cuarenta piezas, porque así podemos revisar cada capa y porque no queremos producir más de lo que se va a vender.",
  },
  {
    id: "confeccion",
    titulo: "La confección",
    resumen: "Costura, pieza por pieza",
    duracion: "4 a 6 horas por prenda",
    quien: "Taller",
    img: look1,
    texto:
      "Aquí está la mayor parte del trabajo. Cada prenda la arma una sola persona de principio a fin, no una cadena: quien pega la manga es quien remata el ruedo. Se tarda más, pero la costura sale pareja y sabemos exactamente quién hizo qué.",
  },
  {
    id: "revision",
    titulo: "La revisión",
    resumen: "Control de calidad",
    duracion: "15 minutos por prenda",
    quien: "Calidad",
    img: look4,
    texto:
      "Prenda por prenda: costuras, hilos sueltos, simetría, botones, que la etiqueta no raspe. Lo que no pasa se devuelve al taller o se queda fuera de la colección. Preferimos quedarnos cortos de inventario antes que mandar algo a medias.",
  },
  {
    id: "empaque",
    titulo: "El empaque",
    resumen: "Doblado, empacado y envío",
    duracion: "El mismo día",
    quien: "Logística",
    img: look5,
    texto:
      "Se dobla a mano, se envuelve y se despacha. Los pedidos que entran antes del mediodía salen ese mismo día. Si algo se retrasa, escribimos nosotros primero: preferimos avisar a que la clienta tenga que preguntar.",
  },
] as const;

/** Cifras del taller. Cámbialas por las reales antes de publicar. */
const CIFRAS = [
  { valor: 1240, sufijo: "", etiqueta: "Piezas confeccionadas" },
  { valor: 5, sufijo: " h", etiqueta: "De trabajo por prenda" },
  { valor: 4, sufijo: "", etiqueta: "Talleres aliados en Bogotá" },
  { valor: 28, sufijo: "", etiqueta: "Ciudades a las que enviamos" },
];

/** El equipo. Reemplaza nombres y descripciones por los reales. */
const EQUIPO = [
  {
    nombre: "Yeimy",
    rol: "Dirección y diseño",
    texto:
      "Dibuja la primera versión de cada pieza y es la que decide cuándo algo todavía no está listo.",
  },
  {
    nombre: "Marcela",
    rol: "Patronaje",
    texto:
      "Lleva más de doce años haciendo moldes. Si una talla queda rara, ella sabe en qué centímetro está el problema.",
  },
  {
    nombre: "Doña Rosa",
    rol: "Confección",
    texto:
      "Arma cada prenda de principio a fin. Reconoce una costura suya a un metro de distancia.",
  },
  {
    nombre: "Laura",
    rol: "Atención y despachos",
    texto:
      "Es quien responde por WhatsApp. Si dudas entre dos tallas, con ella es que hablas.",
  },
];

/** En lo que sí creemos. */
const COMPROMISOS = [
  {
    icono: Scissors,
    titulo: "Series cortas de verdad",
    texto:
      "Entre veinte y cuarenta piezas por referencia. Cuando se agota, casi nunca vuelve en la misma tela.",
  },
  {
    icono: Ruler,
    titulo: "Talleres locales",
    texto:
      "Trabajamos con talleres pequeños de Bogotá, con pago por prenda acordado antes de empezar el lote.",
  },
  {
    icono: Sparkle,
    titulo: "Menos retal",
    texto:
      "Trazamos buscando aprovechar la tela y lo que sobra se guarda para accesorios y muestras.",
  },
  {
    icono: Package,
    titulo: "Precio sin teatro",
    texto:
      "Sin precios inflados para luego tacharlos. Lo que ves es lo que cuesta hacerla y sostener el taller.",
  },
];

const GALERIA = [
  { src: story, alt: "Mesa de trabajo del atelier YEI con telas y patrones" },
  { src: look2, alt: "Prenda YEI en proceso sobre el maniquí" },
  { src: look3, alt: "Detalle de costura de una pieza YEI" },
  { src: look1, alt: "Pieza YEI terminada, lista para revisión" },
  { src: look4, alt: "Control de calidad de una prenda YEI" },
  { src: look5, alt: "Pedido YEI empacado a mano" },
];

function Nosotros() {
  return (
    <div className="bg-nude">
      <PortadaNosotros />
      <Cifras />
      <ElOficio />
      <Equipo />
      <Manifiesto />
      <Compromisos />
      <Galeria />
      <CierreNosotros />
    </div>
  );
}

/* ============================================================
   PORTADA
   ============================================================ */
function PortadaNosotros() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-36 lg:px-10 lg:pb-24 lg:pt-48">
      <div className="mx-auto max-w-[1300px]">
        <Reveal>
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Quiénes somos ✦
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-6xl leading-[0.92] text-chocolate font-medium lg:text-8xl xl:text-9xl">
            Detrás de cada prenda hay{" "}
            <span className="italic text-terracota font-normal">
              manos, nombres y horas
            </span>
          </h1>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <Reveal delay={100}>
            <div className="notch-frame-lg hover-zoom relative aspect-[4/3] overflow-hidden bg-chocolate/10 shadow-2xl sm:aspect-[16/9] lg:aspect-[4/3]">
              <img
                src={story}
                alt="Mesa de trabajo del atelier de YEI Apparel en Bogotá"
                width={1400}
                height={1050}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="space-y-6 text-base leading-relaxed text-chocolate/85 font-light lg:text-lg">
              <p>
                YEI no es una fábrica ni una tienda que revende. Somos un taller
                pequeño en Bogotá donde todavía se dibuja a mano, se prueba la
                prenda en cuerpos reales y se cose de a una.
              </p>
              <p>
                Esta página no es sobre la marca: es sobre el trabajo. Cuánto se
                demora una pieza, quién la hace, qué se descarta y por qué a
                veces algo no vuelve a estar disponible.
              </p>
              <p className="font-display text-2xl italic leading-snug text-chocolate lg:text-3xl">
                «Si te vas a poner algo durante años, tienes derecho a saber
                cómo se hizo.»
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CIFRAS
   ============================================================ */

/**
 * Número que cuenta hacia arriba la primera vez que entra en pantalla.
 * Si el usuario pidió menos movimiento, muestra el valor final de una.
 */
function Contador({ valor, sufijo }: { valor: number; sufijo: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf: number | null = null;
    let respaldo: ReturnType<typeof setTimeout> | null = null;

    const io = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        io.disconnect();

        if (calm) {
          setN(valor);
          return;
        }

        const duracion = 1400;
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const p = Math.min(1, (ahora - inicio) / duracion);
          setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);

        // El navegador congela rAF mientras no está pintando (pestaña de
        // fondo, ventana minimizada). Sin este respaldo la cifra podría
        // quedarse en cero al volver.
        respaldo = setTimeout(() => setN(valor), duracion + 500);
      },
      { threshold: 0.4 },
    );

    io.observe(nodo);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (respaldo) clearTimeout(respaldo);
    };
  }, [valor]);

  return (
    <span ref={ref}>
      {n.toLocaleString("es-CO")}
      {sufijo}
    </span>
  );
}

function Cifras() {
  return (
    <section className="relative overflow-hidden bg-chocolate px-5 py-16 lg:px-10 lg:py-24">
      <StarField />
      <div className="relative mx-auto max-w-[1300px]">
        <Reveal>
          <p className="eyebrow text-center text-xs text-rosa-claro lg:text-sm">
            ✦ El taller en cifras ✦
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 lg:mt-14 lg:grid-cols-4 lg:gap-8">
          {CIFRAS.map((c, i) => (
            <Reveal key={c.etiqueta} delay={i * 90}>
              <div className="text-center">
                <p className="font-display text-5xl leading-none text-marfil font-medium sm:text-6xl lg:text-7xl">
                  <Contador valor={c.valor} sufijo={c.sufijo} />
                </p>
                <p className="mx-auto mt-4 max-w-[18ch] text-xs leading-relaxed text-nude/70 font-light sm:text-sm">
                  {c.etiqueta}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   EL OFICIO, PASO A PASO
   ============================================================ */
function ElOficio() {
  // En el acordeón (móvil) se pueden cerrar todos los pasos: `activo`
  // vale -1. En escritorio siempre hay uno abierto, así que ahí se cae
  // al primero en vez de quedarse sin ninguno resaltado.
  const [activo, setActivo] = useState(0);
  const activoEscritorio = activo < 0 ? 0 : activo;
  const paso = PROCESO[activoEscritorio] ?? PROCESO[0];

  return (
    <section className="bg-marfil px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Cómo se hace ✦
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-8xl">
            De un dibujo a{" "}
            <span className="italic text-terracota font-normal">tu puerta</span>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            Seis pasos, ninguno automático. Estos son los tiempos reales que
            toma cada pieza antes de salir del taller.
          </p>
        </Reveal>

        {/* --- Escritorio: lista de pasos + panel de detalle al lado --- */}
        <div className="mt-12 hidden gap-12 lg:mt-16 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Reveal>
            <ol className="border-t border-terracota/30">
              {PROCESO.map((p, i) => {
                const esActivo = i === activoEscritorio;
                return (
                  <li key={p.id} className="border-b border-terracota/30">
                    <button
                      type="button"
                      onClick={() => setActivo(i)}
                      aria-current={esActivo ? "step" : undefined}
                      className={`group flex w-full cursor-pointer items-baseline gap-5 py-5 text-left transition-colors duration-300 ${
                        esActivo ? "text-terracota" : "text-chocolate"
                      } hover:text-terracota`}
                    >
                      <span className="font-mono text-xs tracking-[0.2em] opacity-60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-2xl font-medium xl:text-3xl">
                          {p.titulo}
                        </span>
                        <span className="mt-1 block text-sm font-light text-chocolate/65">
                          {p.resumen}
                        </span>
                      </span>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 transition-all duration-300 ${
                          esActivo
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          <Reveal delay={120}>
            {/* `key` fuerza a React a remontar el panel al cambiar de paso,
                que es lo que dispara otra vez la animación de entrada. */}
            <div
              key={paso.id}
              className="animate-[yei-rise_500ms_cubic-bezier(0.22,1,0.36,1)_forwards]"
            >
              <div className="notch-frame-lg relative aspect-[16/10] overflow-hidden bg-chocolate/10 shadow-xl">
                <img
                  src={paso.img}
                  alt={`${paso.titulo}: ${paso.resumen} en el atelier de YEI`}
                  loading="lazy"
                  width={1200}
                  height={750}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="notch-frame-sm bg-chocolate px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-marfil uppercase">
                  {paso.duracion}
                </span>
                <span className="notch-frame-sm bg-terracota/15 px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-terracota uppercase">
                  {paso.quien}
                </span>
              </div>

              <p className="mt-6 text-base leading-relaxed text-chocolate/85 font-light xl:text-lg">
                {paso.texto}
              </p>
            </div>
          </Reveal>
        </div>

        {/* --- Móvil y tableta: acordeón, el detalle se abre en su sitio --- */}
        <div className="mt-10 border-t border-terracota/30 lg:hidden">
          {PROCESO.map((p, i) => {
            const abierto = i === activo;
            return (
              <div key={p.id} className="border-b border-terracota/30">
                <button
                  type="button"
                  onClick={() => setActivo(abierto ? -1 : i)}
                  aria-expanded={abierto}
                  className={`flex w-full cursor-pointer items-baseline gap-4 py-5 text-left transition-colors ${
                    abierto ? "text-terracota" : "text-chocolate"
                  }`}
                >
                  <span className="font-mono text-xs tracking-[0.2em] opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl font-medium">
                      {p.titulo}
                    </span>
                    <span className="mt-1 block text-sm font-light text-chocolate/65">
                      {p.resumen}
                    </span>
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    abierto
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pb-7">
                      <div className="notch-frame relative aspect-[16/10] overflow-hidden bg-chocolate/10">
                        <img
                          src={p.img}
                          alt={`${p.titulo}: ${p.resumen} en el atelier de YEI`}
                          loading="lazy"
                          width={900}
                          height={563}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <span className="notch-frame-sm bg-chocolate px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-marfil uppercase">
                          {p.duracion}
                        </span>
                        <span className="notch-frame-sm bg-terracota/15 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-terracota uppercase">
                          {p.quien}
                        </span>
                      </div>
                      <p className="mt-5 text-sm leading-relaxed text-chocolate/85 font-light">
                        {p.texto}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   EL EQUIPO
   ============================================================ */
function Equipo() {
  return (
    <section className="bg-nude px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1300px]">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Las manos detrás ✦
          </p>
          <h2 className="mt-4 font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-8xl">
            Somos{" "}
            <span className="italic text-terracota font-normal">pocas</span>, y
            eso se nota
          </h2>
          <p className="mt-6 text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            Detrás de cada YEI hay mujeres, manos, sueños y trabajo. Personas
            reales que ponen su talento, su tiempo y su experiencia en cada
            detalle — mujeres que trabajan, sueñan, sostienen hogares y hacen
            parte de esta historia.
          </p>
          <p className="mt-4 text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            No hay un centro de atención ni un departamento de nada. Cuando
            escribes, te responde alguien de esta lista.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-6">
          {EQUIPO.map((p, i) => (
            <Reveal key={p.nombre} delay={i * 80}>
              <article className="notch-frame hover-lift flex h-full flex-col bg-marfil p-7 shadow-sm">
                {/* Monograma en vez de foto: la marca puede cambiarlo por
                    un retrato real sin tocar la maquetación. */}
                <span
                  aria-hidden="true"
                  className="notch-frame-sm grid h-16 w-16 shrink-0 place-items-center bg-chocolate font-display text-3xl text-marfil"
                >
                  {p.nombre.charAt(0)}
                </span>
                <h3 className="mt-6 font-display text-2xl font-medium text-chocolate">
                  {p.nombre}
                </h3>
                <p className="label-xs mt-1.5 text-[11px] font-bold text-terracota">
                  {p.rol}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-chocolate/75 font-light">
                  {p.texto}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   MANIFIESTO
   ============================================================ */
function Manifiesto() {
  return (
    <section className="bg-marfil px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[900px] text-center">
        <Reveal>
          <p className="text-base leading-relaxed text-chocolate/80 font-light lg:text-lg">
            Queremos crecer creando oportunidades, apoyando el talento
            colombiano y recordando siempre que detrás de cada prenda hay
            alguien que hizo posible que llegara hasta ti.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-8 max-w-[32ch] font-display text-3xl leading-snug text-chocolate sm:text-4xl lg:max-w-[28ch] lg:text-5xl">
            Cuando eliges YEI, no solo eliges una prenda:{" "}
            <span className="italic text-terracota font-normal">
              eliges apoyar el trabajo de mujeres, el talento colombiano y una
              marca hecha por personas.
            </span>
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="label-xs mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-terracota lg:text-sm">
            <span>Hecho en Colombia</span>
            <span aria-hidden="true" className="text-chocolate/30">
              ·
            </span>
            <span>Hecho por mujeres</span>
            <span aria-hidden="true" className="text-chocolate/30">
              ·
            </span>
            <span>Hecho con amor</span>
          </div>
          <p className="mt-6 font-display text-2xl italic text-chocolate/70 lg:text-3xl">
            Esto es YEI Apparel. 🤍
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   COMPROMISOS
   ============================================================ */
function Compromisos() {
  return (
    <section className="relative overflow-hidden bg-chocolate px-5 py-16 lg:px-10 lg:py-24">
      <StarField />
      <div className="relative mx-auto max-w-[1300px]">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-xs text-rosa-claro lg:text-sm">
            ✦ En lo que sí creemos ✦
          </p>
          <h2 className="mt-4 font-display text-5xl leading-[0.95] text-marfil font-medium sm:text-6xl lg:text-8xl">
            Cuatro reglas que no{" "}
            <span className="italic text-rosa-claro font-normal">
              negociamos
            </span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:gap-6">
          {COMPROMISOS.map((c, i) => {
            const Icono = c.icono;
            return (
              <Reveal key={c.titulo} delay={i * 80}>
                <article className="notch-frame flex h-full gap-5 bg-marfil/5 p-7 lg:p-8">
                  <span
                    aria-hidden="true"
                    className="notch-frame-sm grid h-12 w-12 shrink-0 place-items-center bg-terracota/20"
                  >
                    <Icono
                      className="h-5 w-5 text-rosa-claro"
                      strokeWidth={1.6}
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-medium text-marfil lg:text-3xl">
                      {c.titulo}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-nude/75 font-light lg:text-base">
                      {c.texto}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   GALERÍA: UN DÍA EN EL ATELIER
   ============================================================ */
function Galeria() {
  return (
    <section className="bg-marfil py-16 lg:py-24">
      <div className="mx-auto max-w-[1300px] px-5 lg:px-10">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Un día en el atelier ✦
          </p>
          <h2 className="mt-4 font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-7xl">
            Así se ve{" "}
            <span className="italic text-terracota font-normal">
              por dentro
            </span>
          </h2>
        </Reveal>
      </div>

      {/* En móvil se desliza con el dedo; en escritorio es una rejilla.
          Nada de scroll-jacking: el alto no depende del viewport. */}
      <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GALERIA.map((g, i) => (
          <Reveal
            key={g.alt}
            delay={i * 70}
            className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-auto"
          >
            <figure className="notch-frame hover-zoom relative aspect-[4/5] overflow-hidden bg-chocolate/10 shadow-sm">
              <img
                src={g.src}
                alt={g.alt}
                loading="lazy"
                width={900}
                height={1125}
                className="h-full w-full object-cover"
              />
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   CIERRE
   ============================================================ */
function CierreNosotros() {
  return (
    <section className="bg-nude px-5 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[900px] text-center">
        <Reveal>
          <h2 className="font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-8xl">
            ¿Te quedó alguna{" "}
            <span className="italic text-terracota font-normal">duda</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            Pregúntanos lo que quieras sobre una tela, una talla o cómo se hizo
            una pieza. Respondemos nosotras mismas.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/contacto"
              className="btn-yei notch-frame-sm w-full bg-chocolate text-marfil shadow-xl hover:bg-chocolate/90 sm:w-auto"
            >
              <span>Escríbenos</span>
              <ArrowRight className="h-4 w-4 text-terracota" />
            </Link>
            <Link
              to="/tienda"
              className="btn-yei notch-frame-sm w-full bg-terracota/15 text-chocolate hover:bg-terracota/25 sm:w-auto"
            >
              <span>Ver el catálogo</span>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <Link
            to="/historia"
            className="link-underline mt-12 inline-block font-display text-2xl italic text-terracota transition-colors hover:text-chocolate lg:text-3xl"
          >
            Y así fue como empezó todo →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
