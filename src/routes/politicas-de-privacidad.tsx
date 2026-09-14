import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "@/components/yei/Reveal";
import { POLITICAS, type Bloque } from "@/lib/politicas";
import { heroImage } from "@/lib/products";

export const Route = createFileRoute("/politicas-de-privacidad")({
  head: () => ({
    meta: [
      { title: "Políticas legales — YEI Apparel" },
      {
        name: "description",
        content:
          "Políticas de envíos, cambios, devoluciones y datos personales de YEI Apparel — Ley 1480 de 2011 y Ley 1581 de 2012 de Colombia.",
      },
      { property: "og:title", content: "Políticas legales — YEI" },
      {
        property: "og:url",
        content: "https://yeiapparel.co/politicas-de-privacidad",
      },
      { property: "og:image", content: `https://yeiapparel.co${heroImage}` },
      { name: "twitter:image", content: `https://yeiapparel.co${heroImage}` },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://yeiapparel.co/politicas-de-privacidad",
      },
    ],
  }),
  component: PoliticasLegales,
});

/**
 * Resalta los marcadores `[ ... ]` que quedan por completar, para que no
 * se publiquen por descuido.
 */
function conMarcadores(texto: string) {
  return texto.split(/(\[[^\]]+\])/g).map((parte, i) =>
    parte.startsWith("[") && parte.endsWith("]") ? (
      <mark
        key={i}
        className="bg-terracota/15 px-1 font-medium text-terracota"
        title="Pendiente de completar antes de publicar"
      >
        {parte}
      </mark>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

function RenderBloque({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case "subtitulo":
      return (
        <h3 className="mt-8 font-display text-xl text-chocolate sm:text-2xl first:mt-0">
          {bloque.texto}
        </h3>
      );

    case "destacado":
      return (
        <p className="notch-frame-sm mt-4 bg-terracota/10 px-5 py-4 text-sm leading-relaxed text-chocolate sm:text-base">
          {conMarcadores(bloque.texto)}
        </p>
      );

    case "lista":
      return (
        <ul className="mt-4 space-y-2.5">
          {bloque.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed text-chocolate/80 font-light sm:text-base"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-terracota"
              />
              <span>{conMarcadores(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "pasos":
      return (
        <ol className="mt-4 space-y-3">
          {bloque.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3.5 text-sm leading-relaxed text-chocolate/80 font-light sm:text-base"
            >
              <span
                aria-hidden="true"
                className="notch-frame-sm grid h-6 w-6 shrink-0 place-items-center bg-chocolate text-[11px] font-semibold text-marfil"
              >
                {i + 1}
              </span>
              <span>{conMarcadores(item)}</span>
            </li>
          ))}
        </ol>
      );

    case "parrafo":
    default:
      return (
        <p className="mt-4 text-sm leading-relaxed text-chocolate/80 font-light sm:text-base">
          {conMarcadores(bloque.texto)}
        </p>
      );
  }
}

function PoliticasLegales() {
  return (
    <div className="bg-marfil">
      {/* Portada */}
      <section className="relative overflow-hidden bg-chocolate px-5 pb-16 pt-36 lg:px-10 lg:pb-20 lg:pt-48">
        <div className="mx-auto max-w-[900px]">
          <p className="label-xs text-terracota">YEI Apparel</p>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] text-marfil sm:text-6xl lg:text-7xl font-medium">
            Políticas{" "}
            <span className="italic text-terracota font-normal">legales</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-nude/75 font-light lg:text-base">
            Políticas adaptadas a la normativa colombiana vigente: Ley 1480 de
            2011 (Estatuto del Consumidor) y Ley 1581 de 2012 con su Decreto
            reglamentario 1377 de 2013 (protección de datos personales).
          </p>
        </div>
      </section>

      {/* Índice */}
      <section className="px-5 pt-14 lg:px-10 lg:pt-20">
        <div className="mx-auto max-w-[900px]">
          <nav aria-label="Contenido" className="notch-frame bg-nude p-6 sm:p-8">
            <p className="label-xs text-xs font-semibold text-chocolate">
              Contenido
            </p>
            <ol className="mt-4 space-y-2.5">
              {POLITICAS.map((p) => (
                <li key={p.numero}>
                  <a
                    href={`#politica-${p.numero}`}
                    className="link-underline text-sm text-chocolate/80 hover:text-terracota transition-colors sm:text-base"
                  >
                    {p.numero}. {p.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Secciones */}
      <section className="px-5 py-14 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[900px] space-y-8">
          {POLITICAS.map((politica, i) => (
            <Reveal key={politica.numero} delay={i * 60}>
              <article
                id={`politica-${politica.numero}`}
                className="notch-frame scroll-mt-32 bg-nude px-6 py-9 sm:px-10 sm:py-12"
              >
                <p className="font-display text-5xl leading-none text-terracota/35 sm:text-6xl">
                  {politica.numero}
                </p>
                <h2 className="mt-2 font-display text-3xl leading-tight text-chocolate sm:text-4xl font-medium">
                  {politica.titulo}
                </h2>

                {politica.intro && (
                  <p className="mt-5 text-sm leading-relaxed text-chocolate/80 font-light sm:text-base">
                    {politica.intro}
                  </p>
                )}

                <div className="mt-6">
                  {politica.bloques.map((bloque, idx) => (
                    <RenderBloque key={idx} bloque={bloque} />
                  ))}
                </div>
              </article>
            </Reveal>
          ))}

          <Reveal delay={240}>
            <div className="notch-frame bg-chocolate px-6 py-9 text-center sm:px-10 sm:py-12">
              <p className="font-display text-2xl text-marfil sm:text-3xl">
                ¿Tienes alguna duda?
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-nude/75 font-light">
                Escríbenos por nuestros canales oficiales y con gusto te
                ayudamos con tu pedido, un cambio o el manejo de tus datos.
              </p>
              <Link
                to="/contacto"
                className="btn-yei notch-frame-sm mt-7 bg-terracota text-marfil hover:bg-terracota/90 px-8 py-4 text-xs font-semibold"
              >
                Contáctanos
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
