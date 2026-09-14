import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchTransaction } from "@/lib/wompi-api";

/**
 * Puente entre la redirección de Wompi y la página de agradecimiento.
 *
 * En el camino móvil (redirección, no widget) Wompi manda de vuelta al
 * comprador a `redirect-url` con `?id=<transacción>` en la URL — no con
 * la referencia del pedido. Esta función traduce ese id a la referencia,
 * volviendo a preguntarle a Wompi (nunca se confía en un id que llega
 * por query string sin verificar contra su API), para poder mandar al
 * comprador a `/pedido/$reference`.
 */

const transactionIdSchema = z.object({
  transactionId: z.string().trim().min(1).max(100),
});

export const resolveReferenceFromTransaction = createServerFn({
  method: "GET",
})
  .inputValidator((data: unknown) => transactionIdSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; reference: string } | { ok: false }> => {
      const result = await fetchTransaction(data.transactionId);
      if (!result.ok || !result.transaction.reference) return { ok: false };
      return { ok: true, reference: result.transaction.reference };
    },
  );
