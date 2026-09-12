import { Link, useNavigate } from "@tanstack/react-router";
import { Check, ShoppingBag, ArrowRight, Plus } from "lucide-react";
import { formatPrice, imagesForColor, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import { motion } from "motion/react";

export function ProductCard({
  product,
  showAddToCart = true,
  compact = false,
}: {
  product: Product;
  /** Oculta el botón "Añadir al carrito", dejando solo "Comprar ahora". */
  showAddToCart?: boolean;
  /**
   * Tarjeta más chica en celular/tablet, para que quepan 2 por fila
   * sin verse apretadas (p. ej. la grilla de /tienda). En escritorio
   * (lg+) se ve exactamente igual que la tarjeta normal.
   */
  compact?: boolean;
}) {
  const { add } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [activeColor, setActiveColor] = useState(product.colors[0]?.name ?? "");

  // Las fotos que se ven en la tarjeta son las del color elegido, no
  // siempre las del primer color — así el swatch de abajo sí cambia lo
  // que se ve, y no solo el nombre.
  const activeImages = imagesForColor(product, activeColor);

  const line = () => ({
    slug: product.slug,
    name: product.name,
    image: activeImages[0] ?? "",
    price: product.price,
    size: product.sizes[1] ?? "M",
    color: activeColor || product.colors[0]!.name,
  });

  // Suma la pieza y deja seguir viendo el catálogo.
  const handleAdd = () => {
    add(line(), { open: false });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Suma la pieza y va derecho a finalizar la compra.
  const handleBuyNow = () => {
    add(line(), { open: false });
    navigate({ to: "/finalizar-compra" });
  };

  return (
    <article className="group flex flex-col">
      <div className="relative">
        <Link
          to="/producto/$slug"
          params={{ slug: product.slug }}
          className="hover-lift hover-zoom relative block overflow-hidden notch-frame bg-nude shadow-sm active:scale-[0.98]"
        >
          <img
            src={activeImages[0]}
            alt={product.name}
            loading="lazy"
            width={900}
            height={1200}
            className="aspect-[3/4] w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-0"
          />
          <img
            src={activeImages[1] ?? activeImages[0]}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
          />
          <span
            className={`label-xs absolute bottom-0 left-0 right-0 translate-y-full bg-chocolate/90 text-center text-marfil backdrop-blur-sm transition-transform duration-500 ease-out group-hover:translate-y-0 font-semibold ${
              compact
                ? "py-2 text-[10px] tracking-[0.15em] lg:py-3.5 lg:text-xs lg:tracking-[0.25em]"
                : "py-3.5 text-xs tracking-[0.25em]"
            }`}
          >
            Ver prenda ✦
          </span>
        </Link>

        {/* En celular/tablet no hay espacio para los dos botones de
            texto, así que se reemplazan por este cuadrito: un toque
            agrega la pieza al carrito, sin salir del catálogo. En
            escritorio (lg+) no se muestra — ahí siguen los botones. */}
        {compact && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd();
            }}
            aria-label={
              added ? "Pieza añadida al carrito" : "Añadir al carrito"
            }
            className={`absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center notch-frame-sm shadow-md backdrop-blur-sm transition-all active:scale-90 lg:hidden ${
              added
                ? "bg-chocolate text-marfil"
                : "bg-terracota text-marfil hover:bg-terracota/90"
            }`}
          >
            {added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div
        className={`flex gap-4 ${
          compact
            ? "mt-2.5 flex-col items-center text-center lg:mt-5 lg:flex-row lg:items-start lg:justify-between lg:text-left"
            : "mt-5 items-start justify-between"
        }`}
      >
        <div className="flex-1">
          <h3
            className={`font-display leading-tight text-chocolate font-medium ${
              compact
                ? "text-2xl sm:text-3xl lg:text-3xl"
                : "text-2xl lg:text-3xl"
            }`}
          >
            <Link
              to="/producto/$slug"
              params={{ slug: product.slug }}
              className="hover:text-terracota transition-colors"
            >
              {product.name}
            </Link>
          </h3>
          <p
            className={`font-display font-medium text-chocolate/85 ${
              compact
                ? "-mt-1.5 text-4xl sm:-mt-2 sm:text-5xl lg:mt-1.5 lg:text-5xl"
                : "mt-0.5 text-2xl sm:text-3xl lg:text-5xl"
            }`}
          >
            {formatPrice(product.price)}
          </p>
          <div
            className={`flex items-center gap-2 ${
              compact
                ? "mt-1.5 justify-center lg:mt-3 lg:justify-start"
                : "mt-3"
            }`}
          >
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                title={c.name}
                onClick={() => setActiveColor(c.name)}
                className={`grid shrink-0 place-items-center rounded-full transition-all cursor-pointer ${
                  compact ? "h-5 w-5 lg:h-6 lg:w-6" : "h-6 w-6"
                }`}
              >
                <span
                  className={`rounded-full border transition-all ${
                    compact ? "h-3.5 w-3.5 lg:h-4 lg:w-4" : "h-4 w-4"
                  } ${
                    activeColor === c.name
                      ? "scale-125 border-chocolate ring-2 ring-chocolate/40 ring-offset-1"
                      : "border-border/80"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              </button>
            ))}
            {!compact && (
              <span className="text-xs lg:text-sm text-muted-foreground ml-1">
                {activeColor}
              </span>
            )}
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleBuyNow}
        className={`btn-yei notch-frame-sm w-full bg-terracota text-marfil hover:bg-terracota/90 shadow-sm font-semibold ${
          compact
            ? "hidden lg:inline-flex lg:mt-5 lg:py-2 lg:text-xs lg:tracking-[0.15em]"
            : "mt-5 py-3.5 text-xs tracking-[0.22em] lg:py-2 lg:text-xs lg:tracking-[0.15em]"
        }`}
      >
        <ArrowRight
          className={`btn-yei-arrow ${compact ? "h-3 w-3 lg:h-3.5 lg:w-3.5" : "h-4 w-4 lg:h-3.5 lg:w-3.5"}`}
        />
        <span>Comprar ahora</span>
      </motion.button>

      {showAddToCart && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className={`btn-yei notch-frame-sm w-full transition-all duration-300 font-semibold ${
            compact
              ? "hidden lg:inline-flex lg:mt-2 lg:py-2 lg:text-xs lg:tracking-[0.15em]"
              : "mt-2 py-3.5 text-xs tracking-[0.22em] lg:py-2 lg:text-xs lg:tracking-[0.15em]"
          } ${
            added
              ? "bg-terracota text-marfil shadow-md"
              : "bg-chocolate text-marfil hover:bg-chocolate/85 shadow-sm"
          }`}
        >
          {added ? (
            <>
              <Check
                className={
                  compact
                    ? "h-3 w-3 lg:h-3.5 lg:w-3.5"
                    : "h-4 w-4 lg:h-3.5 lg:w-3.5"
                }
              />
              <span>¡Añadido a la bolsa!</span>
            </>
          ) : (
            <>
              <ShoppingBag
                className={`opacity-80 ${compact ? "h-3 w-3 lg:h-3.5 lg:w-3.5" : "h-4 w-4 lg:h-3.5 lg:w-3.5"}`}
              />
              <span>Añadir al carrito</span>
            </>
          )}
        </motion.button>
      )}
    </article>
  );
}
