import { X, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";

export function CartDrawer() {
  const { open, setOpen, lines, remove, setQty, subtotal } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-tinta/45 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Drawer principal */}
          <motion.aside
            aria-label="Carrito de compras"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-marfil shadow-2xl"
          >
            {/* Header del carrito */}
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-terracota" />
                <h2 className="label-xs font-sans font-bold tracking-widest text-chocolate text-xs lg:text-sm">
                  Tu Bolsa ({lines.reduce((acc, l) => acc + l.qty, 0)})
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="grid h-9 w-9 place-items-center rounded-full text-chocolate hover:bg-nude/70 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-16">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-nude/60 text-chocolate/50 mb-4">
                    <ShoppingBag className="h-7 w-7" strokeWidth={1.2} />
                  </div>
                  <p className="font-display text-2xl text-chocolate font-medium">
                    Tu bolsa está vacía
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-[220px]">
                    Descubre nuestras piezas de la nueva colección 2026.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="btn-yei notch-frame-sm mt-6 bg-chocolate text-marfil text-xs px-7 py-3.5"
                  >
                    Explorar tienda
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          x: 20,
                          height: 0,
                          overflow: "hidden",
                        }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-6"
                      >
                        <img
                          src={l.image}
                          alt={l.name}
                          loading="lazy"
                          className="h-28 w-[88px] notch-frame-sm object-cover bg-nude shadow-sm"
                        />
                        <div className="min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="font-display text-xl leading-tight text-chocolate font-medium">
                              {l.name}
                            </p>
                            <p className="label-xs mt-1 text-muted-foreground text-xs">
                              {l.size} · {l.color}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center notch-frame-sm bg-nude">
                              <button
                                className="px-3 py-1.5 text-xs font-bold text-chocolate hover:bg-nude transition-colors"
                                aria-label="Restar una unidad"
                                onClick={() => setQty(l.id, l.qty - 1)}
                              >
                                −
                              </button>
                              <span className="px-2 text-xs font-semibold text-chocolate">
                                {l.qty}
                              </span>
                              <button
                                className="px-3 py-1.5 text-xs font-bold text-chocolate hover:bg-nude transition-colors"
                                aria-label="Sumar una unidad"
                                onClick={() => setQty(l.id, l.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                            <span className="text-base font-semibold text-chocolate">
                              {formatPrice(l.price * l.qty)}
                            </span>
                          </div>

                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => remove(l.id)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-terracota transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer con subtotal y CTA */}
            {lines.length > 0 && (
              <div className="border-t border-border/70 bg-nude/20 px-6 py-6">
                <div className="flex items-center justify-between">
                  <span className="label-xs font-bold text-chocolate text-xs lg:text-sm">
                    Subtotal
                  </span>
                  <span className="font-display text-2xl lg:text-3xl text-chocolate font-medium">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <Link
                  to="/finalizar-compra"
                  onClick={() => setOpen(false)}
                  className="btn-yei notch-frame-sm mt-4 w-full bg-chocolate text-marfil hover:bg-chocolate/90 active:scale-[0.99] shadow-md transition-all font-semibold tracking-[0.22em] text-xs lg:text-sm py-4 cursor-pointer"
                >
                  Finalizar compra
                </Link>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Envío estándar prioritario ✦ Pagos 100% seguros
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
