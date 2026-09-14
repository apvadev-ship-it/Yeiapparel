import heroNewCollection from "@/assets/hero-new-collection.webp";
import lookA from "@/assets/productos-placeholder/look-a.webp";
import lookB from "@/assets/productos-placeholder/look-b.webp";
import lookC from "@/assets/productos-placeholder/look-c.webp";
import lookD from "@/assets/productos-placeholder/look-d.webp";
import lookE from "@/assets/productos-placeholder/look-e.webp";
import nalaBorgona1 from "@/assets/productos/nala/nala-borgona-1.webp";
import nalaBorgona2 from "@/assets/productos/nala/nala-borgona-2.webp";
import nalaBorgona3 from "@/assets/productos/nala/nala-borgona-3.webp";
import nalaBorgona4 from "@/assets/productos/nala/nala-borgona-4.webp";
import nalaBeige1 from "@/assets/productos/nala/nala-beige-1.webp";
import nalaBeige2 from "@/assets/productos/nala/nala-beige-2.webp";
import nalaBeige3 from "@/assets/productos/nala/nala-beige-3.webp";
import nalaBeige4 from "@/assets/productos/nala/nala-beige-4.webp";
import nalaBeige5 from "@/assets/productos/nala/nala-beige-5.webp";
import nalaBeige6 from "@/assets/productos/nala/nala-beige-6.webp";
import nalaNegro1 from "@/assets/productos/nala/nala-negro-1.webp";
import nalaNegro2 from "@/assets/productos/nala/nala-negro-2.webp";
import nalaNegro3 from "@/assets/productos/nala/nala-negro-3.webp";
import nalaNegro4 from "@/assets/productos/nala/nala-negro-4.webp";
import nalaNegro5 from "@/assets/productos/nala/nala-negro-5.webp";
import nalaNegro6 from "@/assets/productos/nala/nala-negro-6.webp";
import nalaMarfil1 from "@/assets/productos/nala/nala-marfil-1.webp";
import nalaMarfil2 from "@/assets/productos/nala/nala-marfil-2.webp";
import nalaMarfil3 from "@/assets/productos/nala/nala-marfil-3.webp";
import nalaMarfil4 from "@/assets/productos/nala/nala-marfil-4.webp";
import nalaMarfil5 from "@/assets/productos/nala/nala-marfil-5.webp";
import nalaMarfil6 from "@/assets/productos/nala/nala-marfil-6.webp";
import madrilenoNegro1 from "@/assets/productos/madrileno/madrileno-negro-1.webp";
import madrilenoNegro2 from "@/assets/productos/madrileno/madrileno-negro-2.webp";
import madrilenoNegro3 from "@/assets/productos/madrileno/madrileno-negro-3.webp";
import madrilenoNegro4 from "@/assets/productos/madrileno/madrileno-negro-4.webp";
import madrilenoNegro5 from "@/assets/productos/madrileno/madrileno-negro-5.webp";
import madrilenoNegro6 from "@/assets/productos/madrileno/madrileno-negro-6.webp";
import madrilenoNegro7 from "@/assets/productos/madrileno/madrileno-negro-7.webp";
import madrilenoBorgona1 from "@/assets/productos/madrileno/madrileno-borgona-1.webp";
import madrilenoBorgona2 from "@/assets/productos/madrileno/madrileno-borgona-2.webp";
import madrilenoBorgona3 from "@/assets/productos/madrileno/madrileno-borgona-3.webp";
import madrilenoBorgona4 from "@/assets/productos/madrileno/madrileno-borgona-4.webp";
import madrilenoBorgona5 from "@/assets/productos/madrileno/madrileno-borgona-5.webp";
import madrilenoBorgona6 from "@/assets/productos/madrileno/madrileno-borgona-6.webp";
import madrilenoBorgona7 from "@/assets/productos/madrileno/madrileno-borgona-7.webp";
import madrilenoBeige1 from "@/assets/productos/madrileno/madrileno-beige-1.webp";
import madrilenoBeige2 from "@/assets/productos/madrileno/madrileno-beige-2.webp";
import madrilenoBeige3 from "@/assets/productos/madrileno/madrileno-beige-3.webp";
import madrilenoBeige4 from "@/assets/productos/madrileno/madrileno-beige-4.webp";
import madrilenoBeige5 from "@/assets/productos/madrileno/madrileno-beige-5.webp";
import madrilenoBeige6 from "@/assets/productos/madrileno/madrileno-beige-6.webp";
import madrilenoMarfil1 from "@/assets/productos/madrileno/madrileno-marfil-1.webp";
import madrilenoMarfil2 from "@/assets/productos/madrileno/madrileno-marfil-2.webp";
import madrilenoMarfil3 from "@/assets/productos/madrileno/madrileno-marfil-3.webp";
import madrilenoMarfil4 from "@/assets/productos/madrileno/madrileno-marfil-4.webp";
import madrilenoMarfil5 from "@/assets/productos/madrileno/madrileno-marfil-5.webp";
import madrilenoMarfil6 from "@/assets/productos/madrileno/madrileno-marfil-6.webp";
import madrilenoMarfil7 from "@/assets/productos/madrileno/madrileno-marfil-7.webp";

export type ProductGroup = "sets" | "piezas-unicas";

export type ProductColor = {
  name: string;
  hex: string;
  /**
   * Fotos de ESE color. Cada color tiene su propio set — al cambiar de
   * color en la ficha, cambian las fotos que se ven. La talla no
   * afecta nada de esto: es solo color -> fotos.
   */
  images: string[];
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  group: ProductGroup;
  price: number;
  /**
   * Precio "de antes", para mostrar tachado junto al precio actual.
   * Opcional: sin este campo no aparece ningún descuento. Nunca se
   * inventa — solo se pone si de verdad hubo un precio anterior.
   */
  compareAtPrice?: number;
  alt: string;
  description: string;
  sizes: string[];
  colors: ProductColor[];
  /**
   * Inventario de respaldo. Solo se usa si la hoja de Google no está
   * configurada, no responde o no trae esta pieza. El dato real lo
   * manda esa hoja (ver `availability-sheet.ts`).
   */
  stock?: number;
  /** Imagen de la guía de tallas de esta pieza, si la hay. */
  sizeGuideImage?: string;
};

/** Fotos del primer color (el que se ve por defecto en tienda/carrito/SEO). */
export function defaultImages(product: Product): string[] {
  return product.colors[0]?.images ?? [];
}

/** La primera foto del primer color — para tarjetas, OG, JSON-LD. */
export function defaultImage(product: Product): string {
  return defaultImages(product)[0] ?? "";
}

/** Fotos del color elegido; si no se reconoce, cae al primer color. */
export function imagesForColor(product: Product, colorName: string): string[] {
  return (
    product.colors.find((c) => c.name === colorName)?.images ??
    defaultImages(product)
  );
}

/**
 * Fotos placeholder para productos que aún no tienen su propia sesión de
 * fotos. Antes vivían en el CDN de Builder.io; se trajeron al proyecto
 * (no se usan en correos — eso solo pasa con `heroImage`/`imagesForColor`
 * de productos reales — así que no aplica la razón original para dejarlas
 * remotas).
 */
const LOOKS = [lookA, lookB, lookC, lookD, lookE];

/** Mismas 5 fotos, en un orden distinto — para que cada combinación
 * prenda×color se vea con un orden distinto mientras son placeholders. */
function rotate(offset: number): string[] {
  return LOOKS.map((_, i) => LOOKS[(i + offset) % LOOKS.length]!);
}

/**
 * Fotos reales del set Nala en borgoña — las primeras fotos reales del
 * catálogo, ya no placeholders. Reemplazan solo el color Borgoña de
 * Nala; los demás colores de Nala y el resto de prendas siguen con
 * `buildColors` hasta que lleguen sus propias fotos.
 */
const NALA_BORGONA_IMAGES = [
  nalaBorgona1,
  nalaBorgona2,
  nalaBorgona3,
  nalaBorgona4,
];

/** Fotos reales del set Nala en beige. */
const NALA_BEIGE_IMAGES = [
  nalaBeige1,
  nalaBeige2,
  nalaBeige3,
  nalaBeige4,
  nalaBeige5,
  nalaBeige6,
];

/** Fotos reales del set Nala en negro. */
const NALA_NEGRO_IMAGES = [
  nalaNegro1,
  nalaNegro2,
  nalaNegro3,
  nalaNegro4,
  nalaNegro5,
  nalaNegro6,
];

/** Fotos reales del set Nala en marfil. */
const NALA_MARFIL_IMAGES = [
  nalaMarfil1,
  nalaMarfil2,
  nalaMarfil3,
  nalaMarfil4,
  nalaMarfil5,
  nalaMarfil6,
];

/** Fotos reales del set Madrileño en negro. */
const MADRILENO_NEGRO_IMAGES = [
  madrilenoNegro3,
  madrilenoNegro1,
  madrilenoNegro2,
  madrilenoNegro4,
  madrilenoNegro5,
  madrilenoNegro6,
  madrilenoNegro7,
];

/** Fotos reales del set Madrileño en borgoña. */
const MADRILENO_BORGONA_IMAGES = [
  madrilenoBorgona1,
  madrilenoBorgona2,
  madrilenoBorgona3,
  madrilenoBorgona4,
  madrilenoBorgona5,
  madrilenoBorgona6,
  madrilenoBorgona7,
];

/** Fotos reales del set Madrileño en beige. */
const MADRILENO_BEIGE_IMAGES = [
  madrilenoBeige1,
  madrilenoBeige2,
  madrilenoBeige3,
  madrilenoBeige4,
  madrilenoBeige5,
  madrilenoBeige6,
];

/** Fotos reales del set Madrileño en marfil. */
const MADRILENO_MARFIL_IMAGES = [
  madrilenoMarfil4,
  madrilenoMarfil1,
  madrilenoMarfil2,
  madrilenoMarfil3,
  madrilenoMarfil5,
  madrilenoMarfil6,
  madrilenoMarfil7,
];

const COLOR_NAMES = ["Negro", "Marfil", "Beige", "Borgoña"];
const COLOR_HEX = ["#1c1410", "#e8dad1", "#d8c3a5", "#5c1a2b"];

/**
 * Arma los 4 colores de una prenda, cada uno con sus 5 fotos.
 * `seed` solo cambia el ORDEN de las mismas 5 fotos, para que color y
 * prenda no se vean todos idénticos mientras son placeholders — no hay
 * fotos reales distintas por color todavía.
 */
function buildColors(seed: number): ProductColor[] {
  return COLOR_NAMES.map((name, i) => ({
    name,
    hex: COLOR_HEX[i]!,
    images: rotate(seed + i),
  }));
}

/**
 * Un subconjunto de los 4 colores de siempre — a diferencia de los
 * sets (que vienen en los 4), cada pieza única solo viene en algunos.
 * Fotos aún placeholder hasta que lleguen las reales de cada color.
 */
function buildColorSubset(seed: number, names: string[]): ProductColor[] {
  return names.map((name) => {
    const i = COLOR_NAMES.indexOf(name);
    return { name, hex: COLOR_HEX[i]!, images: rotate(seed + i) };
  });
}

/**
 * Catálogo de la colección "sets".
 *
 * TODO (dueño de la tienda): reemplazar antes de publicar —
 *  - `images` de cada color: son placeholders (las fotos de "look" que
 *    ya usa el sitio en otras secciones), repetidas y solo reordenadas
 *    entre colores. Faltan las fotos reales de cada color de cada
 *    prenda.
 *  - `description`: texto genérico de relleno, sin confirmar.
 */
export const products: Product[] = [
  {
    slug: "nala",
    stock: 5,
    name: "Nala",
    category: "Sets",
    group: "sets",
    price: 120000,
    alt: "Set Nala de la colección YEI",
    description:
      "Set de silueta versátil, pensado para combinar sin esfuerzo. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(0).map((color) => {
      if (color.name === "Borgoña")
        return { ...color, images: NALA_BORGONA_IMAGES };
      if (color.name === "Beige")
        return { ...color, images: NALA_BEIGE_IMAGES };
      if (color.name === "Negro")
        return { ...color, images: NALA_NEGRO_IMAGES };
      if (color.name === "Marfil")
        return { ...color, images: NALA_MARFIL_IMAGES };
      return color;
    }),
  },
  {
    slug: "madrileno",
    stock: 5,
    name: "Madrileño",
    category: "Sets",
    group: "sets",
    price: 150000,
    alt: "Set Madrileño de la colección YEI",
    description:
      "Set con caída estructurada y aire de sastrería. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(1).map((color) => {
      if (color.name === "Negro")
        return { ...color, images: MADRILENO_NEGRO_IMAGES };
      if (color.name === "Borgoña")
        return { ...color, images: MADRILENO_BORGONA_IMAGES };
      if (color.name === "Beige")
        return { ...color, images: MADRILENO_BEIGE_IMAGES };
      if (color.name === "Marfil")
        return { ...color, images: MADRILENO_MARFIL_IMAGES };
      return color;
    }),
  },
  {
    slug: "girly",
    stock: 5,
    name: "Girly",
    category: "Sets",
    group: "sets",
    price: 170000,
    alt: "Set Girly de la colección YEI",
    description:
      "Set de líneas suaves y silueta femenina. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(2),
  },
  {
    slug: "emiliana",
    stock: 5,
    name: "Emiliana",
    category: "Sets",
    group: "sets",
    price: 150000,
    alt: "Set Emiliana de la colección YEI",
    description:
      "Set de corte limpio y caída fluida. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(3),
  },
  {
    slug: "comfy",
    stock: 5,
    name: "Comfy",
    category: "Sets",
    group: "sets",
    price: 170000,
    alt: "Set Comfy de la colección YEI",
    description:
      "Set relajado sin perder estructura, para el día completo. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(4),
  },
  {
    slug: "besties",
    stock: 5,
    name: "Besties",
    category: "Sets",
    group: "sets",
    price: 140000,
    alt: "Set Besties de la colección YEI",
    description:
      "Set clásico de la casa, pensado para repetirse temporada tras temporada. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(0),
  },
  {
    slug: "berea",
    stock: 5,
    name: "Berea",
    category: "Sets",
    group: "sets",
    price: 170000,
    alt: "Set Berea de la colección YEI",
    description:
      "Set de textura envolvente y detalles de autor. Disponible en negro, marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColors(1),
  },
  {
    slug: "blusa-nala",
    stock: 5,
    name: "Blusa Nala",
    category: "Piezas únicas",
    group: "piezas-unicas",
    price: 100000,
    alt: "Blusa Nala de la colección YEI",
    description:
      "Blusa de silueta suelta, pensada para combinar con cualquier básico del clóset. Disponible en marfil, beige y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColorSubset(0, ["Marfil", "Beige", "Borgoña"]),
  },
  {
    slug: "blusa-emiliana",
    stock: 5,
    name: "Blusa Emiliana",
    category: "Piezas únicas",
    group: "piezas-unicas",
    price: 100000,
    alt: "Blusa Emiliana de la colección YEI",
    description:
      "Blusa de corte limpio y caída fluida, para el día completo. Disponible en negro y beige.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColorSubset(1, ["Negro", "Beige"]),
  },
  {
    slug: "short-1",
    stock: 5,
    name: "Short",
    category: "Piezas únicas",
    group: "piezas-unicas",
    price: 80000,
    alt: "Short de la colección YEI",
    description:
      "Short versátil, cómodo para el uso diario. Disponible en negro, marfil y beige.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColorSubset(2, ["Negro", "Marfil", "Beige"]),
  },
  {
    slug: "short-2",
    stock: 5,
    name: "Short",
    category: "Piezas únicas",
    group: "piezas-unicas",
    price: 80000,
    alt: "Short de la colección YEI",
    description:
      "Short versátil, cómodo para el uso diario. Disponible en negro y borgoña.",
    sizes: ["XS", "S", "M", "L"],
    colors: buildColorSubset(3, ["Negro", "Borgoña"]),
  },
];

export const heroImage = heroNewCollection;

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);

export const getProductBySlug = getProduct;

/**
 * Orden de respaldo para "lo más vendido de la semana" mientras no
 * haya ventas reales todavía esa semana.
 */
const FALLBACK_FEATURED_SLUGS = ["comfy", "madrileno"];

/**
 * Arma "lo más vendido de la semana": `topSlugs` ya viene ordenado de
 * mayor a menor cantidad (ver `getWeeklyTopSellingSlugs` en
 * `src/lib/orders.ts`, que lee pedidos `APPROVED` de los últimos 7
 * días). Si esta semana todavía no hay ventas, cae al orden de
 * respaldo en vez de dejar la sección vacía.
 */
export function pickFeaturedProducts(
  topSlugs: string[],
  count: number,
): Product[] {
  const bySales = topSlugs
    .map(getProduct)
    .filter((p): p is Product => p !== undefined);

  const ordered =
    bySales.length > 0
      ? bySales
      : FALLBACK_FEATURED_SLUGS.map(getProduct).filter(
          (p): p is Product => p !== undefined,
        );

  return ordered.slice(0, count);
}

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
