import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, ShoppingBag } from "lucide-react";
import lottie from "lottie-web";
import { getOrderSummary, type PublicOrderSummary } from "@/lib/orders";
import { getProduct, imagesForColor, defaultImage, formatPrice } from "@/lib/products";
import { describeWompiOutcome } from "@/lib/wompi-errors";
import { Reveal } from "@/components/yei/Reveal";
import shoppingDoneData from "@/assets/shopping-done.json";

export const Route = createFileRoute("/pedido/$reference")({
  loader: async ({ params }) => {
    const summary = await getOrderSummary({
      data: { reference: params.reference },
    });
    return { summary };
  },
  head: () => ({
    meta: [
      { title: "Gracias por tu compra — YEI Apparel" },
      // Un pedido de otra persona no debe aparecer en buscadores.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PedidoConfirmado,
});

/**
 * Cuánto tiempo se sigue preguntando por el pedido mientras el webhook
 * de Wompi todavía no ha llegado. 8 intentos cada 4s son 32s, más que
 * suficiente para tarjeta (que confirma casi al instante); para PSE,
 * Nequi o Efecty puede tardar más, y ahí es normal que se deje de
 * refrescar solo y quede el aviso de "te escribimos cuando se confirme".
 */
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 8;

function PedidoConfirmado() {
  const { reference } = Route.useParams();
  const { summary: initialSummary } = Route.useLoaderData();

  const [summary, setSummary] = useState<PublicOrderSummary | null>(
    initialSummary,
  );
  const attemptsRef = useRef(0);

  // El pedido se guarda como PENDING antes de cobrar y solo cambia
  // cuando llega el webhook de Wompi (que a su vez vuelve a preguntarle
  // a Wompi el estado real). Mientras siga PENDING, esta página refresca
  // sola en vez de dejar a la persona mirando un estado viejo.
  useEffect(() => {
    if (!summary || summary.status !== "PENDING") return;
    if (attemptsRef.current >= POLL_MAX_ATTEMPTS) return;

    const timer = setTimeout(async () => {
      attemptsRef.current += 1;
      try {
        const fresh = await getOrderSummary({ data: { reference } });
        if (fresh) setSummary(fresh);
      } catch {
        // Sin red o sin base: se deja el último estado conocido y se
        // reintenta en el siguiente ciclo, si quedan intentos.
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [summary, reference]);

  const contactHref = `/contacto?ref=${encodeURIComponent(reference)}`;

  if (!summary) {
    return (
      <div className="bg-marfil px-5 pb-24 pt-24 lg:px-10 lg:pt-32">
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag
            className="mx-auto h-10 w-10 text-chocolate/30"
            strokeWidth={1.2}
          />
          <h1 className="mt-6 font-display text-3xl text-chocolate lg:text-4xl">
            No encontramos el detalle de este pedido
          </h1>
          <p className="mt-4 text-sm text-chocolate/70 font-light">
            Puede que la página tarde en confirmarlo. Guarda este número y
            escríbenos si tu pago ya salió de tu cuenta:
          </p>
          <ReferenceBadge reference={reference} />
          <Link
            to={contactHref}
            className="btn-yei notch-frame-sm mt-8 bg-chocolate text-marfil hover:bg-chocolate/85 px-8 py-4 text-xs font-semibold"
          >
            <MessageCircle className="h-4 w-4" />
            Escríbenos por este pedido
          </Link>
        </div>
      </div>
    );
  }

  const outcome = describeWompiOutcome(summary.status);
  const isApproved = summary.status.toUpperCase() === "APPROVED";
  const isPending = summary.status.toUpperCase() === "PENDING";

  return (
    <div className="bg-marfil px-5 pb-24 pt-24 lg:px-10 lg:pt-32">
      <div className="mx-auto max-w-[760px]">
        <Reveal className="text-center">
          {isApproved ? (
            <SuccessAnimation />
          ) : (
            <div
              className={`mx-auto grid h-16 w-16 place-items-center notch-frame-sm ${
                isPending
                  ? "bg-chocolate/15 text-chocolate"
                  : "bg-chocolate/10 text-chocolate/60"
              }`}
            >
              {isPending ? (
                <span className="h-3 w-3 animate-pulse rounded-full bg-chocolate/60" />
              ) : (
                <Check className="h-8 w-8 stroke-[2.5] opacity-40" />
              )}
            </div>
          )}

          <h1 className="mt-6 font-display text-4xl leading-[1.05] text-chocolate lg:text-6xl font-medium">
            {isApproved ? (
              <>
                ¡Gracias por tu{" "}
                <span className="italic text-terracota font-normal">
                  compra
                </span>
                !
              </>
            ) : (
              outcome.title
            )}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm text-chocolate/70 font-light">
            {isApproved
              ? garmentThanks(summary.items)
              : outcome.message}
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10 notch-frame bg-nude p-6 lg:p-8">
          <p className="label-xs text-xs font-semibold text-chocolate">
            Tu pedido
          </p>

          <ul className="mt-5 space-y-4">
            {summary.items.map((item, i) => {
              const product = getProduct(item.slug);
              const image = product
                ? (imagesForColor(product, item.color)[0] ?? defaultImage(product))
                : "";
              return (
                <li key={`${item.slug}-${i}`} className="flex gap-4">
                  {image && (
                    <img
                      src={image}
                      alt={item.name}
                      className="notch-frame-sm h-20 w-16 shrink-0 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg leading-tight text-chocolate">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-chocolate/60">
                      Talla {item.size} · {item.color} · x{item.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-chocolate">
                    {formatPrice(item.unit_price * item.qty)}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-terracota/30 pt-5">
            <span className="label-xs text-xs font-semibold text-chocolate">
              Total pagado
            </span>
            <span className="font-display text-2xl text-chocolate">
              {formatPrice(summary.total)}
            </span>
          </div>

          <div className="mt-6 border-t border-terracota/30 pt-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-chocolate/60">
              Número de referencia
            </p>
            <ReferenceBadge reference={summary.reference} />
            <p className="mt-2 text-xs font-light text-chocolate/55">
              Guárdalo: es el que necesitamos si nos escribes por este
              pedido.
            </p>
          </div>
        </Reveal>

        <Reveal
          delay={140}
          className="mt-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center"
        >
          <Link
            to={contactHref}
            className="btn-yei notch-frame-sm w-full sm:w-auto bg-chocolate text-marfil hover:bg-chocolate/90 px-8 py-4 text-xs font-semibold tracking-widest shadow-md"
          >
            <MessageCircle className="h-4 w-4" />
            Contáctanos por este pedido
          </Link>
          <Link
            to="/tienda"
            className="btn-yei notch-frame-sm w-full sm:w-auto bg-nude text-chocolate hover:bg-chocolate/15 px-8 py-4 text-xs font-semibold tracking-widest"
          >
            Seguir viendo la tienda
          </Link>
        </Reveal>
      </div>
    </div>
  );
}

/**
 * Animación de bolsa de compra con check, en los colores de la marca
 * (terracota + chocolate en vez del verde original). Se reproduce una
 * sola vez; respeta `prefers-reduced-motion` mostrando el ícono
 * estático de siempre en su lugar.
 */
function SuccessAnimation() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (calm || !boxRef.current) return;

    const anim = lottie.loadAnimation({
      container: boxRef.current,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData: shoppingDoneData,
    });

    return () => anim.destroy();
  }, [calm]);

  if (calm) {
    return (
      <div className="mx-auto grid h-16 w-16 place-items-center notch-frame-sm bg-terracota text-marfil">
        <Check className="h-8 w-8 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="mx-auto h-64 w-64 lg:h-72 lg:w-72"
    />
  );
}

/** Agradecimiento que nombra la(s) prenda(s), no solo "tu pedido". */
function garmentThanks(items: PublicOrderSummary["items"]): string {
  if (items.length === 0) {
    return "Recibimos tu pago. Te enviamos la confirmación a tu correo.";
  }
  const names = [...new Set(items.map((i) => i.name))];
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return `Tu pago por ${list} fue procesado con éxito. Te enviamos la confirmación a tu correo.`;
}

function ReferenceBadge({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la persona igual puede seleccionar
      // el texto a mano, así que no hace falta avisar de un error.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="notch-frame-sm mt-2 inline-flex items-center gap-2 bg-chocolate/10 px-4 py-2.5 font-mono text-sm text-chocolate hover:bg-chocolate/15 transition-colors cursor-pointer"
    >
      {reference}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-terracota" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-chocolate/50" />
      )}
    </button>
  );
}
