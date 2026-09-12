import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProduct } from "@/lib/products";
import { FREE_SHIPPING_FROM } from "@/lib/stock";
import { savePendingOrder, type OrderItem } from "@/lib/orders";
import { DEFAULT_CURRENCY, toMinorUnits } from "@/lib/money";
import { readEnv } from "@/lib/runtime-env";
import { applyCouponToSubtotal, type CouponInvalidReason } from "@/lib/coupons";

/**
 * Integración con Wompi (Colombia) — Web Checkout.
 *
 * Documentación: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 *
 * Cómo funciona: se arma un cobro con el monto, una referencia única y una
 * "firma de integridad". Wompi cobra en su propio dominio y devuelve al
 * comprador a `redirect-url`.
 *
 * Hay dos formas de presentarlo y esta función alimenta las dos con
 * EXACTAMENTE los mismos datos firmados:
 *
 *  - `fields`: formulario que se envía por POST a checkout.wompi.co. Es lo
 *    que se usa en móvil, donde una ventana emergente estorba más de lo
 *    que ayuda.
 *  - `widget`: los mismos valores con los nombres que espera el widget
 *    embebido de Wompi, para escritorio.
 *
 * Que ambos salgan de la misma firma es deliberado: si cada camino armara
 * su propio monto, tarde o temprano se separarían y uno cobraría distinto.
 *
 * Tres reglas de seguridad definen este archivo:
 *
 *  1. Regla 3 — el secreto de integridad NUNCA puede salir al navegador:
 *     quien lo tenga puede firmar cobros a nombre de la tienda. Por eso la
 *     firma se calcula aquí, en el servidor, dentro de una server function.
 *
 *  2. Regla 4 — el monto NO se toma de lo que manda el navegador. Se
 *     recalcula desde el catálogo, o el comprador podría editarlo y pagar
 *     menos. El navegador solo dice QUÉ quiere comprar, nunca CUÁNTO vale.
 *
 *  3. Regla 6 — el paso a centavos se hace con un ayudante que dice cuál
 *     es el exponente de la moneda, no con un 100 suelto. Ver
 *     `src/lib/money.ts`.
 */

/** Costo de envío, en pesos. Debe coincidir con el de la página de pago. */
const SHIPPING_COST = 15000;

/** Máximo de líneas distintas en un pedido. */
const MAX_LINES = 50;

/** Minutos que vale el enlace firmado antes de caducar. */
const CHECKOUT_EXPIRES_MINUTES = 30;

export type CheckoutLineInput = {
  slug: string;
  qty: number;
  size: string;
  color: string;
};

export type BuyerInput = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  direccion: string;
  ciudad: string;
  notas: string;
};

/**
 * Los mismos datos firmados, con los nombres que espera el widget
 * embebido (`new WidgetCheckout({...})`). Nada de esto es secreto: la
 * llave pública y la firma de integridad están hechas para viajar al
 * navegador. El secreto de integridad se queda en el servidor.
 */
export type WompiWidgetConfig = {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
  expirationTime: string;
  redirectUrl?: string;
  customerData: {
    email: string;
    fullName: string;
    phoneNumber: string;
    phoneNumberPrefix: string;
    legalId: string;
    legalIdType: string;
  };
  shippingAddress: {
    addressLine1: string;
    city: string;
    phoneNumber: string;
    region: string;
    country: string;
  };
};

export type WompiCheckout = {
  /** URL del formulario de Wompi. */
  action: string;
  /** Campos a enviar como inputs ocultos (camino por redirección). */
  fields: Record<string, string>;
  /** Los mismos valores para el widget embebido (camino de escritorio). */
  widget: WompiWidgetConfig;
  /** Referencia del pedido, para poder rastrearlo. */
  reference: string;
  /** Total cobrado, en pesos, ya recalculado en el servidor. */
  total: number;
  /** Subtotal antes de envío y descuento, en pesos. */
  subtotal: number;
  /** Descuento aplicado, en pesos. 0 si no había cupón o no era válido. */
  discount: number;
  /**
   * Por qué NO se aplicó un cupón que sí se mandó. `null` si no se
   * mandó cupón, o si se aplicó bien.
   */
  couponError: CouponInvalidReason | null;
};

/** Referencia única e irrepetible del pedido. */
function buildReference() {
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();
  return `YEI-${Date.now().toString(36).toUpperCase()}-${random}`;
}

/**
 * Firma de integridad: SHA-256 de referencia + monto en centavos + moneda
 * + fecha de caducidad + secreto. El orden importa; si se altera, Wompi
 * rechaza la transacción. La caducidad va antes del secreto y solo cuando
 * se envía el campo `expiration-time`.
 */
async function signIntegrity(
  reference: string,
  amountInCents: number,
  currency: string,
  expiresAt: string,
  secret: string,
) {
  const payload = `${reference}${amountInCents}${currency}${expiresAt}${secret}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validación de lo que llega del navegador.
 *
 * Antes solo se comprobaba que el correo llevara "@" y se hacía `.trim()`
 * más adelante. Sin tope de longitud, un campo de varios megas viajaba
 * entero hasta Supabase antes de que Wompi lo rechazara.
 *
 * Los topes siguen a los del propio Wompi para los campos que se le
 * reenvían, con margen. No sustituyen a la comprobación del precio: el
 * monto NUNCA sale de aquí, se recalcula desde el catálogo más abajo.
 *
 * SECURITY_RULES Regla 11: se piden los datos mínimos del envío y nada
 * más. Aquí no hay fecha de nacimiento ni datos demográficos.
 */
const textField = (max: number) => z.string().trim().min(1).max(max);

const buyerSchema = z.object({
  nombre: textField(80),
  apellido: textField(80),
  email: z.string().trim().min(3).max(150).email(),
  telefono: textField(30),
  documento: textField(40),
  direccion: textField(200),
  ciudad: textField(80),
  // Las notas son opcionales: se acepta cadena vacía.
  notas: z.string().trim().max(500).default(""),
});

const lineSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  // El entero se fuerza aquí; el recorte a 1..20 sigue más abajo, junto
  // al precio, que es donde importa para el monto.
  qty: z.number().int().positive().max(20),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(40),
});

const checkoutInputSchema = z.object({
  buyer: buyerSchema,
  // Tope al tamaño del pedido: sin esto, alguien podría mandar miles de
  // líneas y poner al servidor a trabajar de gratis.
  lines: z.array(lineSchema).min(1).max(MAX_LINES),
  // Opcional: el código del cupón del boletín. Se vuelve a validar aquí
  // sobre el subtotal recalculado — lo que haya mostrado antes
  // `previewCoupon` en pantalla no es lo que se cobra.
  couponCode: z.string().trim().max(40).optional(),
});

export const createWompiCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInputSchema.parse(data))
  .handler(async ({ data }) => {
    // Regla 3: los secretos se leen aquí, en el servidor. `readEnv` mira
    // primero el `env` del Worker de Cloudflare y después `process.env`,
    // porque en el preset cloudflare-module `process.env` viene vacío y
    // leer solo de ahí apagaba la pasarela en producción sin avisar.
    const publicKey = readEnv("WOMPI_PUBLIC_KEY");
    const integritySecret = readEnv("WOMPI_INTEGRITY_SECRET");

    // Sin credenciales no se puede firmar nada: se avisa en vez de fingir.
    if (!publicKey || !integritySecret) return null;

    // El precio se reconstruye desde el catálogo, nunca desde el navegador.
    let subtotal = 0;
    const items: OrderItem[] = [];
    for (const line of data.lines) {
      const product = getProduct(line.slug);
      if (!product) throw new Error(`Producto desconocido: ${line.slug}`);
      const qty = Math.max(1, Math.min(20, Math.floor(line.qty)));
      subtotal += product.price * qty;
      items.push({
        slug: product.slug,
        name: product.name,
        qty,
        size: line.size,
        color: line.color,
        unit_price: product.price,
      });
    }

    // El envío decide por el tamaño del pedido, no por lo que quede
    // después del descuento: un cupón no debe además decidir si hay
    // envío gratis.
    const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;

    // Regla 4: el cupón se valida y se aplica aquí, sobre el subtotal
    // que el propio servidor acaba de recalcular desde el catálogo —
    // nunca sobre un descuento que mande el navegador.
    const coupon = await applyCouponToSubtotal(data.couponCode, subtotal);
    const total = subtotal - coupon.discount + shipping;
    // Regla 6: en la práctica nadie cobra centavos de peso, pero el campo
    // de Wompi es `amount_in_cents` y el COP tiene exponente 2 en ISO
    // 4217. La conversión va por `toMinorUnits`, que deja escrito ese
    // exponente, en vez de un ×100 suelto que nadie puede auditar.
    const currency = DEFAULT_CURRENCY;
    const amountInCents = toMinorUnits(total, currency);

    const reference = buildReference();
    // El enlace firmado caduca: si alguien lo intercepta o lo guarda, deja
    // de servir en media hora.
    const expiresAt = new Date(
      Date.now() + CHECKOUT_EXPIRES_MINUTES * 60_000,
    ).toISOString();
    const signature = await signIntegrity(
      reference,
      amountInCents,
      currency,
      expiresAt,
      integritySecret,
    );

    const { buyer } = data;
    const fields: Record<string, string> = {
      "public-key": publicKey,
      currency,
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": signature,
      "expiration-time": expiresAt,
      "customer-data:email": buyer.email.trim(),
      "customer-data:full-name": `${buyer.nombre} ${buyer.apellido}`.trim(),
      "customer-data:phone-number": buyer.telefono.replace(/\D/g, ""),
      "customer-data:phone-number-prefix": "+57",
      "customer-data:legal-id": buyer.documento.trim(),
      "customer-data:legal-id-type": "CC",
      "shipping-address:address-line-1": buyer.direccion.trim(),
      "shipping-address:country": "CO",
      "shipping-address:city": buyer.ciudad.trim(),
      "shipping-address:region": buyer.ciudad.trim(),
      "shipping-address:phone-number": buyer.telefono.replace(/\D/g, ""),
      "shipping-address:name": `${buyer.nombre} ${buyer.apellido}`.trim(),
    };

    if (buyer.notas.trim()) {
      fields["shipping-address:address-line-2"] = buyer.notas.trim();
    }

    const redirectUrl = readEnv("WOMPI_REDIRECT_URL");
    if (redirectUrl) fields["redirect-url"] = redirectUrl;

    // Los mismos valores, con los nombres del widget. Se arman a partir
    // de las mismas variables que los `fields`: no hay un segundo cálculo
    // de monto ni una segunda firma que se puedan desincronizar.
    const widget: WompiWidgetConfig = {
      currency,
      amountInCents,
      reference,
      publicKey,
      signature: { integrity: signature },
      expirationTime: expiresAt,
      ...(redirectUrl ? { redirectUrl } : {}),
      customerData: {
        email: buyer.email.trim(),
        fullName: `${buyer.nombre} ${buyer.apellido}`.trim(),
        phoneNumber: buyer.telefono.replace(/\D/g, ""),
        phoneNumberPrefix: "+57",
        legalId: buyer.documento.trim(),
        legalIdType: "CC",
      },
      shippingAddress: {
        addressLine1: buyer.direccion.trim(),
        city: buyer.ciudad.trim(),
        phoneNumber: buyer.telefono.replace(/\D/g, ""),
        region: buyer.ciudad.trim(),
        country: "CO",
      },
    };

    // Queda constancia del pedido antes de enviar a pagar, para que el
    // webhook tenga qué confirmar cuando Wompi responda.
    await savePendingOrder({
      reference,
      total,
      amountInCents,
      customer: {
        name: `${buyer.nombre} ${buyer.apellido}`.trim(),
        email: buyer.email.trim(),
        phone: buyer.telefono.replace(/\D/g, ""),
        document: buyer.documento.trim(),
      },
      shipping: {
        address: buyer.direccion.trim(),
        city: buyer.ciudad.trim(),
        notes: buyer.notas.trim(),
      },
      items,
      couponCode: coupon.couponCode,
      discount: coupon.discount,
    });

    return {
      action: "https://checkout.wompi.co/p/",
      fields,
      widget,
      reference,
      total,
      subtotal,
      discount: coupon.discount,
      couponError: coupon.reason ?? null,
    } satisfies WompiCheckout;
  });
