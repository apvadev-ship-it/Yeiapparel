import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Lock, ArrowLeft, Check, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/stateful-button";
import { formatPrice } from "@/lib/products";
import { FREE_SHIPPING_FROM } from "@/lib/stock";
import { startCheckout } from "@/lib/checkout";
import { previewCoupon } from "@/lib/coupons";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CHECKOUT_FAILED_MESSAGE,
  CHECKOUT_NOT_CONFIGURED_MESSAGE,
} from "@/lib/wompi-errors";

const COUPON_ERROR_MESSAGES: Record<string, string> = {
  not_found: "Ese código no existe.",
  expired: "Ese código ya caducó.",
  redeemed: "Ese código ya se usó.",
  unavailable: "No pudimos validar el código ahora mismo.",
};

export const Route = createFileRoute("/finalizar-compra")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — YEI Apparel" },
      // Un pedido en curso no debe aparecer en buscadores.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinalizarCompra,
});

const SHIPPING_COST = 15000;

type Buyer = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  direccion: string;
  ciudad: string;
  notas: string;
};

const EMPTY_BUYER: Buyer = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  documento: "",
  direccion: "",
  ciudad: "",
  notas: "",
};

/**
 * Solo para errores ANTES de llegar a pagar (sin credenciales, sin red).
 * El resultado del pago en sí ya no se muestra aquí: ver `/pedido/$reference`.
 */
type Feedback = { message: string };

function FinalizarCompra() {
  const { lines, subtotal, setQty } = useCart();
  const navigate = useNavigate();

  // El mismo punto de corte que usa el resto del sitio (768 px). En
  // móvil se redirige a Wompi: una ventana encima estorba más de lo que
  // ayuda en una pantalla pequeña. En escritorio se abre el widget.
  const isMobile = useIsMobile();

  const [buyer, setBuyer] = useState<Buyer>(EMPTY_BUYER);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // El cupón se muestra en pantalla con `previewCoupon` (solo lectura,
  // no cambia nada en la base). El descuento que de verdad se cobra
  // sale de `createWompiCheckout`, que vuelve a validar el mismo
  // código — esto es solo para que la persona vea el precio correcto
  // antes de pagar.
  const [couponInput, setCouponInput] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const shipping =
    subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_COST;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const set = (field: keyof Buyer) => (value: string) =>
    setBuyer((b) => ({ ...b, [field]: value }));

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || subtotal <= 0) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const result = await previewCoupon({ data: { code, subtotal } });
      if (result.ok) {
        setAppliedCoupon({
          code: code.toUpperCase(),
          discount: result.discount,
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(
          COUPON_ERROR_MESSAGES[result.reason] ??
            "No pudimos validar el código.",
        );
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError("No pudimos validar el código. Inténtalo de nuevo.");
    } finally {
      setCheckingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSending(true);
    try {
      // El servidor recalcula el total y firma la transacción. El
      // navegador solo dice qué piezas quiere, nunca cuánto valen.
      const result = await startCheckout({
        buyer,
        lines,
        mode: isMobile ? "redirect" : "widget",
        couponCode: appliedCoupon?.code,
      });

      if (!result.ok) {
        setFeedback({ message: CHECKOUT_NOT_CONFIGURED_MESSAGE });
        return;
      }

      // El servidor volvió a validar el cupón al cobrar, sobre el
      // subtotal recalculado. Si entre la vista previa y este momento
      // dejó de servir (alguien más lo usó, caducó), se avisa aquí:
      // el precio que se cobró es el correcto, pero puede no ser el
      // que se mostró antes de pagar.
      if (appliedCoupon && result.couponError) {
        setAppliedCoupon(null);
        setCouponError(
          COUPON_ERROR_MESSAGES[result.couponError] ??
            "El código dejó de servir justo antes de cobrar.",
        );
      }

      // Redirección: el navegador ya se está yendo a Wompi, no hay nada
      // que mostrar aquí.
      if (result.mode === "redirect") return;

      // El widget se cerró. Lo que haya dicho el navegador es solo
      // informativo — el pedido no se da por pagado aquí. Por eso no se
      // muestra ese estado en esta página: se manda a `/pedido/$reference`,
      // que lee el estado real (el que confirma el webhook tras volver a
      // preguntarle a Wompi) y se refresca sola mientras está PENDING.
      navigate({
        to: "/pedido/$reference",
        params: { reference: result.reference },
      });
    } catch {
      setFeedback({ message: CHECKOUT_FAILED_MESSAGE });
    } finally {
      setSending(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="bg-marfil px-5 pb-24 pt-36 lg:px-10 lg:pt-48">
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag
            className="mx-auto h-10 w-10 text-chocolate/30"
            strokeWidth={1.2}
          />
          <h1 className="mt-6 font-display text-4xl text-chocolate lg:text-5xl">
            Tu bolsa está vacía
          </h1>
          <p className="mt-4 text-sm text-chocolate/70 font-light">
            Agrega una pieza para poder finalizar la compra.
          </p>
          <Link
            to="/tienda"
            className="btn-yei notch-frame-sm mt-8 bg-chocolate text-marfil hover:bg-chocolate/85 px-8 py-4 text-xs font-semibold"
          >
            Ver la tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-marfil px-5 pb-24 pt-36 lg:px-10 lg:pt-48">
      <div className="mx-auto max-w-[1200px]">
        <button
          type="button"
          onClick={() => navigate({ to: "/tienda" })}
          className="link-underline inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-chocolate/70 hover:text-terracota transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Seguir comprando
        </button>

        <h1 className="mt-6 font-display text-5xl leading-[0.95] text-chocolate lg:text-7xl font-medium">
          Finalizar{" "}
          <span className="italic text-terracota font-normal">compra</span>
        </h1>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* Datos del comprador */}
          <form onSubmit={handlePay} id="checkout-form">
            <fieldset disabled={sending} className="space-y-8">
              <div>
                <legend className="label-xs text-xs font-semibold text-chocolate">
                  Tus datos
                </legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Nombre"
                    value={buyer.nombre}
                    onChange={set("nombre")}
                    autoComplete="given-name"
                    required
                  />
                  <Field
                    label="Apellido"
                    value={buyer.apellido}
                    onChange={set("apellido")}
                    autoComplete="family-name"
                    required
                  />
                  <Field
                    label="Correo electrónico"
                    type="email"
                    value={buyer.email}
                    onChange={set("email")}
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="Teléfono / WhatsApp"
                    type="tel"
                    value={buyer.telefono}
                    onChange={set("telefono")}
                    autoComplete="tel"
                    required
                  />
                  <Field
                    label="Documento de identidad"
                    value={buyer.documento}
                    onChange={set("documento")}
                    required
                  />
                  <Field
                    label="Ciudad"
                    value={buyer.ciudad}
                    onChange={set("ciudad")}
                    autoComplete="address-level2"
                    required
                  />
                </div>
              </div>

              <div>
                <legend className="label-xs text-xs font-semibold text-chocolate">
                  Envío
                </legend>
                <div className="mt-4 grid gap-3">
                  <Field
                    label="Dirección completa"
                    value={buyer.direccion}
                    onChange={set("direccion")}
                    autoComplete="street-address"
                    required
                  />
                  <Field
                    label="Indicaciones para la entrega (opcional)"
                    value={buyer.notas}
                    onChange={set("notas")}
                  />
                </div>
              </div>
            </fieldset>
          </form>

          {/* Resumen del pedido */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="notch-frame bg-nude p-6 lg:p-8">
              <h2 className="label-xs text-xs font-semibold text-chocolate">
                Tu pedido
              </h2>

              <ul className="mt-6 space-y-5">
                {lines.map((l) => (
                  <li key={l.id} className="flex gap-4">
                    <img
                      src={l.image}
                      alt={l.name}
                      className="notch-frame-sm h-20 w-16 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight text-chocolate">
                        {l.name}
                      </p>
                      <p className="mt-0.5 text-xs text-chocolate/60">
                        Talla {l.size} · {l.color}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Quitar una unidad de ${l.name}`}
                          onClick={() => setQty(l.id, l.qty - 1)}
                          className="notch-frame-sm grid h-7 w-7 place-items-center bg-chocolate/10 text-chocolate hover:bg-chocolate hover:text-marfil transition-colors"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-sm tabular-nums text-chocolate">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Agregar una unidad de ${l.name}`}
                          onClick={() => setQty(l.id, l.qty + 1)}
                          className="notch-frame-sm grid h-7 w-7 place-items-center bg-chocolate/10 text-chocolate hover:bg-chocolate hover:text-marfil transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-chocolate">
                      {formatPrice(l.price * l.qty)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Cupón del boletín */}
              <div className="mt-8 border-t border-terracota/30 pt-6">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between notch-frame-sm bg-terracota/10 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-semibold text-chocolate">
                      <Check className="h-3.5 w-3.5 text-terracota" />
                      {appliedCoupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      aria-label="Quitar cupón"
                      className="text-chocolate/50 hover:text-terracota transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="coupon-code"
                      className="block text-[11px] uppercase tracking-[0.18em] text-chocolate/60"
                    >
                      ¿Tienes un cupón?
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="coupon-code"
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          if (couponError) setCouponError(null);
                        }}
                        placeholder="YEI15-XXXXXXXX"
                        className="notch-frame-sm notch-outline min-w-0 flex-1 bg-nude px-4 py-3 text-sm text-chocolate outline-none transition-colors focus:bg-nude/70"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={checkingCoupon || !couponInput.trim()}
                        className="notch-frame-sm shrink-0 bg-chocolate px-5 text-xs font-semibold tracking-widest text-marfil hover:bg-chocolate/90 disabled:opacity-50 cursor-pointer"
                      >
                        {checkingCoupon ? "..." : "Aplicar"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="mt-1.5 text-xs text-terracota">
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <dl className="mt-6 space-y-2.5 text-sm">
                <div className="flex justify-between text-chocolate/75">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-terracota">
                    <dt>Descuento</dt>
                    <dd>−{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-chocolate/75">
                  <dt>Envío</dt>
                  <dd>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</dd>
                </div>
                {shipping > 0 && (
                  <p className="pt-1 text-xs font-light text-terracota">
                    Te faltan {formatPrice(FREE_SHIPPING_FROM - subtotal)} para
                    el envío gratis.
                  </p>
                )}
                <div className="flex items-baseline justify-between pt-3">
                  <dt className="label-xs text-xs font-semibold text-chocolate">
                    Total
                  </dt>
                  <dd className="font-display text-3xl text-chocolate lg:text-4xl">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>

              <Button
                type="submit"
                form="checkout-form"
                status={sending ? "loading" : "idle"}
                className="mt-7 w-full bg-terracota text-marfil hover:bg-terracota/90 disabled:opacity-60 py-4 text-xs font-semibold tracking-[0.22em] shadow-md"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Pagar con Wompi</span>
              </Button>

              {feedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 text-xs leading-relaxed text-terracota"
                >
                  {feedback.message}
                </div>
              )}

              <p className="mt-4 text-center text-[11px] font-light text-chocolate/55">
                El pago se procesa en Wompi, la pasarela de Bancolombia. No
                guardamos los datos de tu tarjeta.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, "-");

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.18em] text-chocolate/60"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="notch-frame-sm notch-outline mt-1.5 w-full bg-nude px-4 py-3 text-sm text-chocolate outline-none transition-colors focus:bg-nude/70"
      />
    </div>
  );
}
