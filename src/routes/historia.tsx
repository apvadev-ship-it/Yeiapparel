import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import story from "@/assets/story.jpg";
import look1 from "@/assets/look-1.jpg";
import { Reveal } from "@/components/yei/Reveal";

export const Route = createFileRoute("/historia")({
  head: () => ({
    meta: [
      { title: "Nuestra historia — YEI Apparel" },
      {
        name: "description",
        content:
          "El origen de YEI: una casa de moda femenina latinoamericana que hace de la elegancia un oficio.",
      },
      { property: "og:title", content: "Nuestra historia — YEI" },
      {
        property: "og:description",
        content: "El origen de YEI, casa de moda femenina latinoamericana.",
      },
      { property: "og:url", content: "https://yeiapparel.co/historia" },
    ],
    links: [{ rel: "canonical", href: "https://yeiapparel.co/historia" }],
  }),
  component: Historia,
});

function Historia() {
  return (
    <div className="bg-nude">
      <section className="px-5 pb-20 pt-36 lg:px-10 lg:pt-48">
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Nuestra historia ✦
          </p>
          <h1 className="mt-4 font-display text-6xl leading-[0.95] lg:text-8xl xl:text-9xl text-chocolate font-medium">
            Una mirada distinta sobre la{" "}
            <span className="italic text-terracota">elegancia</span>
          </h1>
          <p className="mt-6 max-w-2xl font-display text-2xl italic leading-snug text-chocolate/80 lg:text-3xl">
            Detrás de cada YEI hay una historia.
          </p>
        </div>
      </section>

      <section className="px-5 pb-32 lg:px-10">
        <div className="mx-auto grid max-w-[1300px] items-start gap-16 lg:grid-cols-2">
          <Reveal>
            <div className="notch-frame bg-chocolate/10 p-[1.5px] shadow-2xl">
              <img
                src={story}
                alt="Detalle de atelier con prendas marfil y terracota de YEI"
                loading="lazy"
                width={1000}
                height={1200}
                className="notch-frame w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={120} className="lg:pt-8">
            <div className="space-y-8 text-base lg:text-xl leading-relaxed text-chocolate/85 font-light">
              <p>
                YEI Apparel es una marca colombiana que nació en un taller
                pequeño, entre patrones dibujados a mano y telas elegidas una a
                una, con una idea simple: crear prendas cómodas, bonitas y
                hechas para acompañarte en tu día a día — ropa que una mujer
                quisiera conservar durante años.
              </p>
              <p>
                Cada colección nace de una mirada diferente sobre la elegancia,
                el movimiento y la feminidad. Trabajamos con series cortas, con
                talleres locales y con la convicción de que el lujo verdadero es
                la comodidad eterna.
              </p>
              <p className="font-medium text-chocolate text-lg lg:text-2xl">
                «Hoy vestimos a mujeres que no siguen tendencias: las
                anteceden.»
              </p>
              <div className="border-t border-terracota/30 pt-8">
                <p>Pero detrás de cada prenda hay mucho más que una marca.</p>
                <Link
                  to="/nosotros"
                  className="link-underline mt-3 inline-flex items-center gap-2 font-display text-xl italic text-terracota transition-colors hover:text-chocolate lg:text-2xl"
                >
                  <span>Conoce las manos que la hacen posible</span>
                  <ArrowRight className="h-4 w-4 shrink-0 not-italic" />
                </Link>
              </div>
            </div>
            <div className="notch-frame mt-12 w-3/4 bg-chocolate/10 p-[1.5px] shadow-xl">
              <img
                src={look1}
                alt="Modelo con vestido de satín marfil YEI"
                loading="lazy"
                width={900}
                height={1200}
                className="notch-frame w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
