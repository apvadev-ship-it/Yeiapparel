import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Truck,
  ShoppingBag,
  PackageCheck,
  Ruler,
  Minus,
  Plus,
} from "lucide-react";
import {
  defaultImage,
  defaultImages,
  formatPrice,
  getProductBySlug,
  imagesForColor,
  products,
} from "@/lib/products";
import {
  useProductStock,
  describeStock,
  useDeliveryDates,
  DELIVERY_BUSINESS_DAYS,
} from "@/lib/stock";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/yei/ProductCard";
import { ProductGallery } from "@/components/yei/ProductGallery";
import { Reveal } from "@/components/yei/Reveal";
import { SizeGuide } from "@/components/yei/SizeGuide";
import { motion } from "motion/react";

export const Route = createFileRoute("/producto/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    return {
      meta: [
        { title: `${p?.name ?? "Producto"} — YEI` },
        {
          name: "description",
          content: `${p?.name}: ${p?.description ?? "Moda femenina contemporánea."}`,
        },
        { property: "og:title", content: `${p?.name} — YEI` },
        {
          property: "og:description",
          content: p?.description ?? "Moda femenina contemporánea.",
        },
        { property: "og:image", content: p ? defaultImage(p) : undefined },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: p?.name,
            image: p ? defaultImages(p) : undefined,
            description: p?.description,
            offers: {
              "@type": "Offer",
              priceCurrency: "COP",
              price: p?.price,
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  component: ProductoDetalle,
});

/** "9 de septiembre" */
function formatShortDate(d: Date) {
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
}

/** "09/09/2026" — la fecha exacta en números */
function formatNumericDate(d: Date) {
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

/** "miércoles" */
function weekday(d: Date) {
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    timeZone: "America/Bogota",
  });
}

/** Redondea el % de descuento a partir del precio "de antes". */
function discountPercent(price: number, compareAt: number | undefined) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}

/** Ficha técnica genérica de confección, la misma para todas las piezas. */
const TECH_SPECS = [
  {
    label: "Composición",
    detail: "Telas nobles seleccionadas por caída y durabilidad, según la pieza.",
  },
  {
    label: "Confección",
    detail:
      "Producida en series cortas, con patronaje propio y costuras reforzadas.",
  },
  {
    label: "Origen",
    detail: "Diseñada y confeccionada en Colombia, en el atelier YEI.",
  },
];

/** Instrucciones de cuidado, en su propio acordeón. */
const CARE_SPECS = [
  {
    label: "Lavado",
    detail: "En frío, a mano o en ciclo delicado. Nunca con blanqueador.",
  },
  {
    label: "Secado",
    detail: "A la sombra, extendida o en gancho. Sin secadora.",
  },
  {
    label: "Planchado",
    detail:
      "Temperatura baja y del revés. Evita el contacto directo con el satín.",
  },
  {
    label: "Guardado",
    detail:
      "En gancho o doblada sin apilar, lejos de la humedad y la luz directa.",
  },
];

/** Un ítem de acordeón: título con "+", contenido que se despliega. */
function AccordionItem({
  title,
  open,
  onToggle,
  items,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  items: { label: string; detail: string }[];
}) {
  return (
    <div className="py-4.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-center gap-2 text-xs font-semibold text-chocolate transition-colors hover:text-terracota lg:justify-between"
        aria-expanded={open}
      >
        <span className="label-xs">{title}</span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-chocolate/20 text-chocolate transition-transform duration-300 ${
            open ? "rotate-45 border-terracota text-terracota" : ""
          }`}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <dl className="mt-3 space-y-3 text-left">
            {items.map((spec) => (
              <div key={spec.label}>
                <dt className="text-xs font-semibold text-terracota">
                  {spec.label}
                </dt>
                <dd className="mt-0.5 text-chocolate/80 font-light">
                  {spec.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * "Características técnicas" y "Cuidados de la ropa": mismo patrón de
 * acordeón que las preguntas frecuentes de la home. Se usa dos veces
 * (una para celular/tablet, otra para escritorio) porque en cada
 * tamaño va en un lugar distinto del layout — ver los dos usos en
 * `ProductoDetalle`.
 */
function SpecsAccordions({
  techOpen,
  setTechOpen,
  careOpen,
  setCareOpen,
}: {
  techOpen: boolean;
  setTechOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  careOpen: boolean;
  setCareOpen: (v: boolean | ((p: boolean) => boolean)) => void;
}) {
  return (
    <dl className="divide-y divide-border border-y border-border text-sm lg:text-base">
      <AccordionItem
        title="Características técnicas"
        open={techOpen}
        onToggle={() => setTechOpen((v) => !v)}
        items={TECH_SPECS}
      />
      <AccordionItem
        title="Cuidados de la ropa"
        open={careOpen}
        onToggle={() => setCareOpen((v) => !v)}
        items={CARE_SPECS}
      />
    </dl>
  );
}

function ProductoDetalle() {
  const { product } = Route.useLoaderData();
  const { add, setQty: setCartQty, lines: cartLines } = useCart();
  const navigate = useNavigate();
  const router = useRouter();

  // En celular/tablet no hay breadcrumb visible ni botón "Atrás" del
  // navegador siempre a mano, así que un botón flotante ayuda a volver
  // al catálogo sin tener que subir hasta el header. Si se llegó por
  // un enlace directo (sin historial propio) cae de vuelta a /tienda.
  const handleGoBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/tienda" });
  };

  // Fechas siempre al dia de hoy (se recalculan al montar, al volver a
  // la pestana y despues de cada medianoche).
  const { today, delivery: deliveryDate } = useDeliveryDates();
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0] ?? "M");
  const [color, setColor] = useState(product.colors[0]?.name ?? "Marfil");

  // Inventario real de ESTA talla y color; si la hoja todavía no trae
  // variantes, cae sola al total del producto (ver `useProductStock`).
  const { stock, loading: stockLoading } = useProductStock(
    product.slug,
    product.stock,
    { size, color },
  );
  const stockInfo = describeStock(stock);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);

  const discount = discountPercent(product.price, product.compareAtPrice);

  // Las fotos son del color elegido — la talla no cambia nada de esto.
  const galleryImages = imagesForColor(product, color);

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 3);

  const line = () => ({
    slug: product.slug,
    name: product.name,
    image: galleryImages[0] ?? "",
    price: product.price,
    size,
    color,
  });

  /**
   * Mete la pieza en el carrito con la cantidad elegida aquí.
   *
   * `add()` solo agrega de a una (o suma una a la línea si ya
   * existía) — por eso, si se pidió más de una, se corrige con
   * `setQty` justo después, sobre la cantidad que YA había en esa
   * línea antes de este clic (capturada de `cartLines`, del render
   * actual) más las que se acaban de elegir. Las dos llamadas quedan
   * en la misma cola de actualizaciones de React, así que el orden se
   * respeta aunque se agrupen en un solo repintado.
   */
  const addSelectedToCart = () => {
    const l = line();
    const id = `${l.slug}-${l.size}-${l.color}`;
    add(l, { open: false });
    if (qty > 1) {
      const before = cartLines.find((x) => x.id === id)?.qty ?? 0;
      setCartQty(id, before + qty);
    }
  };

  // Suma la pieza y va derecho a finalizar la compra.
  const handleBuyNow = () => {
    addSelectedToCart();
    navigate({ to: "/finalizar-compra" });
  };

  const handleAddToCart = () => {
    addSelectedToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-marfil">
      {/* Solo en celular/tablet: el header no siempre está a la vista
          al bajar por la ficha de producto, así que este botón
          flotante deja volver al catálogo sin tener que subir. */}
      <button
        type="button"
        onClick={handleGoBack}
        aria-label="Volver"
        className="fixed left-4 top-24 z-40 grid h-11 w-11 place-items-center rounded-full bg-chocolate text-marfil shadow-lg active:scale-90 transition-transform lg:hidden"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="px-5 pb-24 pt-24 lg:px-10 lg:pt-48">
        <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-x-20 lg:gap-y-4">
          <div className="lg:col-start-1 lg:row-start-1">
            <ProductGallery
              key={color}
              images={galleryImages}
              alt={`${product.name} en ${color}`}
            />
          </div>

          {/* En escritorio, características técnicas y cuidados van
              debajo de las fotos, en la misma columna (fila 2, columna
              1) — no en el panel de compra. En celular/tablet se
              ocultan aquí: la misma información aparece más abajo,
              después de la guía de tallas. */}
          <div className="hidden lg:col-start-1 lg:row-start-2 lg:block">
            <SpecsAccordions
              techOpen={techOpen}
              setTechOpen={setTechOpen}
              careOpen={careOpen}
              setCareOpen={setCareOpen}
            />
          </div>

          <div className="min-w-0 text-center lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:h-fit lg:text-left">
            <nav className="label-xs text-muted-foreground text-xs">
              <Link
                to="/tienda"
                className="link-underline text-chocolate font-medium"
              >
                Tienda
              </Link>{" "}
              / {product.category}
            </nav>
            <div className="mt-5 flex flex-col items-center gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-center sm:gap-3 lg:justify-start">
              <h1 className="font-display text-5xl leading-[0.95] lg:text-7xl text-chocolate font-medium">
                {product.name}
              </h1>
              <p className="-mt-3 font-display text-[3.2rem] lg:text-[3.6rem] sm:mt-0 text-terracota font-medium">
                {formatPrice(product.price)}
              </p>
              {discount !== null && (
                <>
                  <p className="text-lg text-chocolate/45 line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </p>
                  <span className="notch-frame-sm bg-terracota px-2.5 py-1 text-[11px] font-bold tracking-wide text-marfil">
                    −{discount}%
                  </span>
                </>
              )}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-base lg:text-lg leading-relaxed text-chocolate/80 font-light lg:mx-0">
              {product.description}
            </p>

            {/* Talla y cantidad, una al lado de la otra. */}
            <div className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-6 lg:justify-start">
              <div>
                <p className="label-xs text-xs font-semibold text-chocolate">
                  Talla seleccionada:{" "}
                  <span className="text-terracota">{size}</span>
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2.5 lg:justify-start">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-14 px-5 py-2.5 text-xs lg:text-sm font-semibold tracking-[0.2em] transition-colors duration-300 notch-frame-sm cursor-pointer ${
                        size === s
                          ? "bg-chocolate text-marfil shadow-sm"
                          : "bg-nude text-chocolate hover:bg-chocolate/15"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <p className="label-xs text-xs font-semibold text-chocolate">
                  Cantidad
                </p>
                <div className="mt-3 flex items-center justify-center gap-3 lg:justify-start">
                  <button
                    type="button"
                    aria-label="Quitar una unidad"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="notch-frame-sm grid h-10 w-10 place-items-center bg-chocolate/10 text-chocolate hover:bg-chocolate hover:text-marfil transition-colors cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center font-display text-xl text-chocolate tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Agregar una unidad"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    className="notch-frame-sm grid h-10 w-10 place-items-center bg-chocolate/10 text-chocolate hover:bg-chocolate hover:text-marfil transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="label-xs text-xs font-semibold text-chocolate">
                Color · <span className="text-terracota">{color}</span>
              </p>
              <div className="mt-3 flex gap-3.5 items-center justify-center lg:justify-start">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setColor(c.name)}
                    className={`h-9 w-9 rounded-full border transition-all duration-300 cursor-pointer ${
                      color === c.name
                        ? "scale-110 ring-2 ring-chocolate ring-offset-2"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Disponibilidad en vivo desde la base de datos — arriba de
                los botones de compra, para que se vea antes de comprar
                cuántas unidades quedan. */}
            <div className="mt-8">
              <div className="flex items-center justify-center gap-2.5 lg:justify-start">
                {stockLoading ? (
                  <span className="text-chocolate/60 font-light">
                    Consultando inventario…
                  </span>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rotate-45 ${
                        stockInfo.tone === "ok"
                          ? "bg-terracota"
                          : stockInfo.tone === "bajo"
                            ? "bg-terracota/70"
                            : "bg-chocolate/30"
                      }`}
                    />
                    <span className="font-semibold text-chocolate">
                      {stockInfo.label}
                    </span>
                  </>
                )}
              </div>
              {!stockLoading && (
                <p className="mt-1 text-sm text-chocolate/80 font-light">
                  {stockInfo.detail}
                </p>
              )}
            </div>

            {/* Añadir al carrito / Comprar ahora, uno junto al otro */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                className={`btn-yei notch-frame-sm flex-1 text-xs lg:text-sm py-4 active:scale-[0.99] transition-all font-semibold tracking-[0.22em] ${
                  added
                    ? "bg-terracota text-marfil shadow-lg"
                    : "bg-chocolate text-marfil hover:bg-chocolate/85 shadow-md"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>¡Añadido!</span>
                  </>
                ) : (
                  <span>Añadir al carrito</span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuyNow}
                className="btn-yei notch-frame-sm flex-1 bg-terracota text-marfil hover:bg-terracota/90 text-xs lg:text-sm py-4 active:scale-[0.99] shadow-lg font-semibold tracking-[0.22em]"
              >
                <ArrowRight className="btn-yei-arrow h-4 w-4" />
                <span>Comprar ahora</span>
              </motion.button>
            </div>

            {/* Envíos: tres cuadritos con fechas reales */}
            <div className="mt-12">
              <p className="label-xs text-xs font-semibold text-chocolate">
                Envíos
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  {
                    icon: ShoppingBag,
                    top: "Si compras hoy",
                    main: formatShortDate(today),
                    bottom: weekday(today),
                    extra: formatNumericDate(today),
                  },
                  {
                    icon: Truck,
                    top: "Te llega el",
                    main: formatShortDate(deliveryDate),
                    bottom: weekday(deliveryDate),
                    extra: formatNumericDate(deliveryDate),
                    nota: `${DELIVERY_BUSINESS_DAYS} días hábiles`,
                  },
                  {
                    icon: PackageCheck,
                    top: "Envío gratis",
                    main: "$300.000",
                    bottom: "desde esta compra",
                  },
                ].map((box) => (
                  <div
                    key={box.top}
                    className="notch-frame-sm bg-nude px-2.5 py-4 text-center"
                  >
                    <box.icon
                      className="mx-auto h-4 w-4 text-terracota"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                    <p className="mt-2.5 text-[10px] uppercase tracking-[0.16em] text-chocolate/60">
                      {box.top}
                    </p>
                    <p className="mt-1 font-display text-lg leading-tight text-chocolate lg:text-xl">
                      {box.main}
                    </p>
                    {box.extra && (
                      <p className="mt-1 text-[13px] font-semibold tabular-nums text-terracota">
                        {box.extra}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] font-light text-chocolate/65">
                      {box.bottom}
                    </p>
                    {box.nota && (
                      <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-chocolate/50">
                        {box.nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <dl className="mt-10 divide-y divide-border border-y border-border text-sm lg:text-base">
              {/* Guía de tallas */}
              <div className="py-4.5">
                <dt className="label-xs flex items-center justify-center gap-2 text-xs font-semibold text-chocolate lg:justify-start">
                  <Ruler
                    className="h-4 w-4 text-terracota"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Guía de tallas
                </dt>
                <dd className="mt-1 text-chocolate/80 font-light">
                  Fit regular estilizado. Si dudas entre dos, elige tu talla
                  habitual.
                </dd>
                <dd className="mt-3">
                  {product.sizeGuideImage ? (
                    <img
                      src={product.sizeGuideImage}
                      alt={`Guía de tallas de ${product.name}`}
                      loading="lazy"
                      className="notch-frame-sm w-full bg-nude"
                    />
                  ) : (
                    <SizeGuide activeSize={size} />
                  )}
                </dd>
              </div>
            </dl>

            {/* En celular/tablet, características técnicas y cuidados
                van aquí, después de la guía de tallas. En escritorio
                (lg+) se ocultan aquí: la misma información aparece
                debajo de las fotos (ver más abajo). */}
            <div className="lg:hidden">
              <SpecsAccordions
                techOpen={techOpen}
                setTechOpen={setTechOpen}
                careOpen={careOpen}
                setCareOpen={setCareOpen}
              />
            </div>
          </div>
        </div>

        <section className="mx-auto mt-10 max-w-[1500px] pt-10 lg:mt-28 lg:border-t lg:border-border lg:pt-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-4xl lg:text-6xl text-chocolate font-medium">
              Completa el look
            </h2>
            <Link
              to="/tienda"
              className="link-underline text-xs lg:text-sm tracking-[0.22em] uppercase font-semibold text-terracota hover:text-chocolate transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Ver catálogo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 70}>
                <ProductCard product={p} compact />
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
