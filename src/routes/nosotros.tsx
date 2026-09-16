import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Scissors, Ruler, Package, Sparkle } from "lucide-react";
import { Reveal } from "@/components/yei/Reveal";
import { StarField } from "@/components/yei/StarField";
import equipoProbando from "@/assets/equipo-probando.jpg";
import rackNegras from "@/assets/rack-negras.jpg";
import eligiendoTelas from "@/assets/eligiendo-telas.jpg";
import muestrarioColores from "@/assets/muestrario-colores.jpg";
import bodegaTelas from "@/assets/bodega-telas.jpg";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros — La casa detrás de YEI" },
      {
        name: "description",
        content:
          "Una casa de moda pequeña, hecha con criterio: la tela se escoge a mano, cada pieza se prueba antes de venderse y nada sale del taller sin nuestra aprobación.",
      },
      { property: "og:title", content: "Nosotros — La casa detrás de YEI" },
      {
        property: "og:description",
        content:
          "Una casa de moda pequeña, hecha con criterio: la tela se escoge a mano y cada pieza se prueba antes de venderse.",
      },
      { property: "og:url", content: "https://yeiapparel.co/nosotros" },
      { property: "og:image", content: `https://yeiapparel.co${equipoProbando}` },
      { name: "twitter:image", content: `https://yeiapparel.co${equipoProbando}` },
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
    titulo: "La selección",
    resumen: "Elegimos la tela con calma",
    duracion: "2 semanas",
    quien: "Diseño",
    img: eligiendoTelas,
    texto:
      "Todo empieza frente al proveedor, tocando y comparando telas una por una. No elegimos la que mejor se ve en foto, sino la que mejor cae puesta. Si no nos convence a nosotras primero, no llega a producción.",
  },
  {
    id: "colores",
    titulo: "El color",
    resumen: "La paleta correcta, sin atajos",
    duracion: "5 días",
    quien: "Diseño",
    img: muestrarioColores,
    texto:
      "Con la tela ya decidida, viene la parte más fina: comparar decenas de tonos lado a lado hasta encontrar el que funciona sobre la prenda, no solo en el muestrario. Aquí también se descarta mucho más de lo que se aprueba.",
  },
  {
    id: "confeccion",
    titulo: "La confección",
    resumen: "Costura, pieza por pieza",
    duracion: "4 a 6 horas por prenda",
    quien: "Taller",
    img: rackNegras,
    texto:
      "Cada prenda se cose de una en una, no en cadena de producción. Cuando el lote está listo, lo fotografiamos tal como sale del rack, sin retoques, para que veas exactamente lo que vas a recibir.",
  },
  {
    id: "prueba",
    titulo: "El control",
    resumen: "La probamos antes que tú",
    duracion: "1 día",
    quien: "Equipo",
    img: equipoProbando,
    texto:
      "Antes de subir una prenda a la tienda, la probamos sobre nuestro propio cuerpo. Así detectamos si algo aprieta, si un largo no funciona o si, simplemente, todavía no está a la altura de lo que queremos ofrecer.",
  },
  {
    id: "empaque",
    titulo: "El envío",
    resumen: "Doblado, empacado y despachado",
    duracion: "El mismo día",
    quien: "Logística",
    img: bodegaTelas,
    texto:
      "Se dobla a mano, se envuelve con cuidado y se despacha. Los pedidos que entran antes del mediodía salen ese mismo día. Si algo se retrasa, te escribimos nosotras primero: preferimos avisar a que tengas que preguntar.",
  },
] as const;

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
    titulo: "Series limitadas",
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
    titulo: "Consumo consciente",
    texto:
      "Trazamos buscando aprovechar cada centímetro de tela y lo que sobra se reserva para accesorios y muestras.",
  },
  {
    icono: Package,
    titulo: "Precio con criterio",
    texto:
      "Sin precios inflados para luego tacharlos. Lo que ves es lo que cuesta hacer la prenda y sostener el taller.",
  },
];

const GALERIA = [
  { src: equipoProbando, alt: "El equipo de YEI probándose una prenda antes de subirla a la tienda" },
  { src: eligiendoTelas, alt: "Eligiendo la tela con el proveedor" },
  { src: muestrarioColores, alt: "Muestrario de colores para elegir la referencia" },
  { src: rackNegras, alt: "Lote de prendas negras recién terminado, colgado en el rack" },
  { src: bodegaTelas, alt: "Buscando telas en la bodega del proveedor" },
];

function Nosotros() {
  return (
    <div className="bg-nude">
      <PortadaNosotros />
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
          <h1 className="max-w-[16ch] font-display text-6xl leading-[0.92] text-chocolate font-medium lg:text-8xl xl:text-9xl">
            Una casa de moda hecha con{" "}
            <span className="italic text-terracota font-normal">
              criterio, no en serie
            </span>
          </h1>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <Reveal delay={100}>
            <div className="notch-frame-lg hover-zoom relative aspect-[4/3] overflow-hidden bg-chocolate/10 shadow-2xl sm:aspect-[16/9] lg:aspect-[4/3]">
              <img
                src={equipoProbando}
                alt="El equipo de YEI Apparel probando una prenda antes de subirla a la tienda"
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
                YEI es una casa de moda propia: elegimos cada tela a mano,
                probamos la prenda sobre el cuerpo antes de sacarla a la venta
                y cosemos pieza por pieza, nunca en cadena.
              </p>
              <p>
                Así trabajamos: con tiempo, con criterio y con la disciplina
                de saber cuándo algo todavía no está a la altura de llevar
                nuestro nombre. Por eso una referencia, al agotarse, rara vez
                vuelve a repetirse.
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
          <h2 className="max-w-[18ch] font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-8xl">
            De la tela a{" "}
            <span className="italic text-terracota font-normal">tu puerta</span>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            Cinco pasos, ninguno automático. Estos son los tiempos reales que
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
          <h2 className="font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-8xl">
            Un equipo{" "}
            <span className="italic text-terracota font-normal">pequeño</span>,
            que cuida cada detalle
          </h2>
          <p className="mt-6 text-base leading-relaxed text-chocolate/75 font-light lg:text-lg">
            Elegimos telas, probamos cada prenda antes de venderla y
            corregimos lo que haga falta. Somos mujeres reales trabajando por
            algo en lo que creemos, con las manos.
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
          <h2 className="font-display text-5xl leading-[0.95] text-marfil font-medium sm:text-6xl lg:text-8xl">
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
          <h2 className="font-display text-5xl leading-[0.95] text-chocolate font-medium sm:text-6xl lg:text-7xl">
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
          <div className="mt-10 flex justify-center">
            <Link
              to="/tienda"
              className="btn-yei notch-frame-sm w-full bg-chocolate text-marfil shadow-xl hover:bg-chocolate/90 sm:w-auto"
            >
              <span>Ver el catálogo</span>
              <ArrowRight className="h-4 w-4 text-terracota" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
