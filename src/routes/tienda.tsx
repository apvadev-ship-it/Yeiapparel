import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { products, heroImage, type ProductGroup } from "@/lib/products";
import { ProductCard } from "@/components/yei/ProductCard";
import { Reveal } from "@/components/yei/Reveal";

const TABS: { label: string; value: ProductGroup }[] = [
  { label: "Sets", value: "sets" },
  { label: "Piezas únicas", value: "piezas-unicas" },
];

/** Palabras que se turnan sobre la portada de la tienda. */
const COVER_WORDS = [
  "Catálogo",
  "Tienda",
  "Lugar favorito",
  "Tu espacio",
  "Tus deseos",
];

/**
 * Palabra que se desliza y se desvanece al cambiar por la siguiente,
 * dejando el tipo nítido en todo momento (sin desenfoque) para que se
 * vea bien la fuente. Distinta de la máquina de escribir de la home.
 */
function CoverWordCycle({
  words,
  interval = 2200,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      interval,
    );
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: "35%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-35%", opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`block ${className}`}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export const Route = createFileRoute("/tienda")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { categoria?: ProductGroup } => {
    const categoria = search.categoria;
    return categoria === "sets" || categoria === "piezas-unicas"
      ? { categoria }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Catálogo YEI — Colección 2026 de moda femenina" },
      {
        name: "description",
        content:
          "Explora el catálogo completo de YEI: vestidos, tops y sastrería femenina de la colección 2026.",
      },
      { property: "og:title", content: "Catálogo YEI — Colección 2026" },
      {
        property: "og:description",
        content:
          "Vestidos, tops y sastrería femenina de elegancia contemporánea.",
      },
      { property: "og:url", content: "/tienda" },
    ],
    links: [{ rel: "canonical", href: "/tienda" }],
  }),
  component: Tienda,
});

function Tienda() {
  const { categoria } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<ProductGroup>(
    categoria ?? "sets",
  );

  // Si llegamos con un enlace de categoría mientras ya estábamos en /tienda
  // (sin remontar el componente), sincroniza la pestaña activa igual.
  useEffect(() => {
    if (categoria) setActiveTab(categoria);
  }, [categoria]);

  const filteredProducts = products.filter((p) => p.group === activeTab);

  return (
    <div className="bg-marfil">
      {/* Portada grande, a todo lo ancho, como el HERO del home — pero
          en fondo café (chocolate) en vez de foto, con una palabra que
          se turna encima. El texto se desliza y desvanece en vez de
          desenfocarse, para que la fuente se lea nítida (distinto de
          la máquina de escribir que ya usamos en la home). */}
      <section className="relative flex h-[50vh] flex-col items-center justify-center overflow-hidden bg-chocolate lg:h-[92vh]">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-chocolate/60" />
        <div className="relative z-10 flex flex-col items-center">
          <CoverWordCycle
            words={COVER_WORDS}
            className="font-display text-[3.6rem] font-medium leading-[0.95] text-marfil sm:text-[5.4rem] lg:text-[9.6rem]"
          />
          <span className="-mt-2 flex items-center gap-3 font-display text-[3.6rem] italic tracking-[0.1em] text-marfil/80 sm:-mt-3 sm:gap-4 sm:text-[5.4rem] lg:mt-0 lg:gap-6 lg:text-[9.6rem]">
            <span className="text-[1.8rem] text-[var(--terracota-claro)] sm:text-[2.25rem] lg:text-[3.6rem]">
              ✦
            </span>
            2026
            <span className="text-[1.8rem] text-[var(--terracota-claro)] sm:text-[2.25rem] lg:text-[3.6rem]">
              ✦
            </span>
          </span>
        </div>
      </section>

      <section className="px-5 pb-6 pt-10 lg:px-10 lg:pt-14">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex justify-center gap-3">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`notch-frame-sm px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] transition-all lg:text-sm text-marfil ${
                  tab.value === "piezas-unicas"
                    ? "bg-terracota hover:bg-terracota/90"
                    : "bg-chocolate hover:bg-chocolate/90"
                } ${
                  activeTab === tab.value
                    ? "ring-2 ring-offset-2 ring-offset-marfil " +
                      (tab.value === "piezas-unicas"
                        ? "ring-terracota"
                        : "ring-chocolate")
                    : "opacity-80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-6 sm:px-5 lg:px-10 lg:pb-32 lg:pt-8">
        <div className="mx-auto max-w-[1500px]">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-chocolate/60 font-light">
              Muy pronto nuevas piezas en esta categoría.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
              {filteredProducts.map((p, i) => (
                <Reveal key={p.slug} delay={i * 70}>
                  <ProductCard product={p} compact />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
