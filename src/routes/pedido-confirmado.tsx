import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MessageCircle } from "lucide-react";
import { resolveReferenceFromTransaction } from "@/lib/order-lookup";

/**
 * Wompi vuelve aquí tras el pago por REDIRECCIÓN (móvil), agregando
 * `?id=<transacción>` a la URL — no manda la referencia del pedido. Esta
 * página traduce ese id a la referencia (volviendo a preguntarle a
 * Wompi, nunca confiando en el id de la URL a ciegas) y de ahí manda a
 * `/pedido/$reference`, que es la que de verdad muestra el resultado.
 *
 * El camino de escritorio (widget) nunca pasa por aquí: ya conoce la
 * referencia sin necesitar este paso, porque no salió de la página.
 */
export const Route = createFileRoute("/pedido-confirmado")({
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ id: z.string().trim().min(1).optional() }).parse(search),
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: PedidoConfirmadoPuente,
});

function PedidoConfirmadoPuente() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    resolveReferenceFromTransaction({ data: { transactionId: id } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          navigate({
            to: "/pedido/$reference",
            params: { reference: result.reference },
            replace: true,
          });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (failed) {
    return (
      <div className="bg-marfil px-5 pb-24 pt-36 lg:px-10 lg:pt-48">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl text-chocolate lg:text-4xl">
            No pudimos confirmar tu pago automáticamente
          </h1>
          <p className="mt-4 text-sm text-chocolate/70 font-light">
            Eso no significa que haya fallado: si Wompi ya te descontó el
            dinero, escríbenos y lo confirmamos a mano.
          </p>
          <Link
            to="/contacto"
            className="btn-yei notch-frame-sm mt-8 bg-chocolate text-marfil hover:bg-chocolate/85 px-8 py-4 text-xs font-semibold"
          >
            <MessageCircle className="h-4 w-4" />
            Escríbenos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-marfil px-5 pb-24 pt-36 text-center lg:px-10 lg:pt-48">
      <p className="text-sm text-chocolate/60 font-light">
        Confirmando tu pago…
      </p>
    </div>
  );
}
