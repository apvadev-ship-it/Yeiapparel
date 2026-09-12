import type { CartLine } from "@/lib/cart";
import {
  createWompiCheckout,
  type BuyerInput,
  type WompiCheckout,
  type WompiWidgetConfig,
} from "@/lib/wompi";

export type Buyer = BuyerInput;

/** Cómo se le muestra el pago al comprador. */
export type CheckoutMode = "widget" | "redirect";

export type CheckoutOrder = {
  buyer: Buyer;
  lines: CartLine[];
  /**
   * `widget` abre la ventana de Wompi encima de la página (escritorio).
   * `redirect` manda el navegador a checkout.wompi.co (móvil).
   * Si el widget no carga, se cae solo a `redirect`.
   */
  mode?: CheckoutMode;
  /**
   * Código del cupón del boletín, si la persona puso uno. Se vuelve a
   * validar en el servidor sobre el subtotal recalculado — lo que se
   * mande aquí no decide cuánto se cobra.
   */
  couponCode?: string | undefined;
};

export type CheckoutResult =
  /** El navegador se está yendo a Wompi; esta página ya no importa. */
  | {
      ok: true;
      mode: "redirect";
      reference: string;
      discount: number;
      couponError: string | null;
    }
  /**
   * El widget se cerró. `status` es lo que dijo el navegador, que sirve
   * para mostrar algo al comprador pero NO para dar el pedido por
   * pagado: eso solo lo decide el webhook.
   */
  | {
      ok: true;
      mode: "widget";
      reference: string;
      status: string | null;
      statusMessage: string | null;
      discount: number;
      couponError: string | null;
    }
  /** Falta configurar las credenciales de Wompi en el servidor. */
  | { ok: false; reason: "not_configured" };

/**
 * Lleva al comprador a pagar con Wompi.
 *
 * El servidor recalcula el precio y firma la transacción; aquí solo se
 * usa lo que devuelve. El navegador nunca elige el monto.
 *
 * SECURITY_RULES Regla 4: los dos caminos —widget y redirección— salen
 * de la MISMA firma calculada en el servidor. Si cada uno armara su
 * propio monto, acabarían cobrando distinto.
 *
 * SECURITY_RULES Regla 1: lo que el widget devuelve al cerrarse es
 * informativo. La confirmación de que el dinero entró llega por el
 * webhook, que además vuelve a preguntarle a Wompi. Aquí no se marca
 * nada como pagado.
 */
export async function startCheckout(
  order: CheckoutOrder,
): Promise<CheckoutResult> {
  const checkout = await createWompiCheckout({
    data: {
      buyer: order.buyer,
      lines: order.lines.map((l) => ({
        slug: l.slug,
        qty: l.qty,
        size: l.size,
        color: l.color,
      })),
      couponCode: order.couponCode,
    },
  });

  if (!checkout) return { ok: false, reason: "not_configured" };

  if (order.mode === "widget") {
    const opened = await openWidget(checkout.widget);
    if (opened.opened) {
      return {
        ok: true,
        mode: "widget",
        reference: checkout.reference,
        status: opened.status,
        statusMessage: opened.statusMessage,
        discount: checkout.discount,
        couponError: checkout.couponError,
      };
    }
    // El script del widget no cargó (bloqueador, red, CSP). En vez de
    // dejar al comprador sin poder pagar, se usa la redirección.
    console.warn("[wompi] el widget no cargó; se usa la redirección");
  }

  submitRedirectForm(checkout);
  return {
    ok: true,
    mode: "redirect",
    reference: checkout.reference,
    discount: checkout.discount,
    couponError: checkout.couponError,
  };
}

/**
 * Camino por redirección: Wompi recibe los datos por POST, así que se
 * envía un formulario real para que el navegador navegue a su dominio y
 * el pago ocurra allá.
 */
function submitRedirectForm(checkout: WompiCheckout): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

// ---- Widget embebido ------------------------------------------------

const WIDGET_SCRIPT_URL = "https://checkout.wompi.co/widget.js";
const WIDGET_SCRIPT_TIMEOUT_MS = 8000;

type WidgetTransaction = {
  id?: string;
  status?: string;
  status_message?: string | null;
};

type WidgetResult = { transaction?: WidgetTransaction | null };

type WidgetCheckoutInstance = {
  open: (callback: (result: WidgetResult) => void) => void;
};

declare global {
  interface Window {
    WidgetCheckout?: new (config: WompiWidgetConfig) => WidgetCheckoutInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;

/** Carga widget.js una sola vez, con tiempo máximo de espera. */
function loadWidgetScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.WidgetCheckout) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SCRIPT_URL}"]`,
    );
    const script = existing ?? document.createElement("script");

    const timer = setTimeout(() => resolve(false), WIDGET_SCRIPT_TIMEOUT_MS);

    script.addEventListener("load", () => {
      clearTimeout(timer);
      resolve(Boolean(window.WidgetCheckout));
    });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      resolve(false);
    });

    if (!existing) {
      script.src = WIDGET_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

type OpenResult =
  | { opened: true; status: string | null; statusMessage: string | null }
  | { opened: false };

/**
 * Abre el widget y espera a que se cierre.
 *
 * La configuración llega firmada desde el servidor y se pasa tal cual:
 * no se toca ni un campo aquí, porque cualquier cambio invalidaría la
 * firma de integridad (que es justamente el punto).
 */
async function openWidget(config: WompiWidgetConfig): Promise<OpenResult> {
  const ready = await loadWidgetScript();
  const WidgetCheckout =
    typeof window !== "undefined" ? window.WidgetCheckout : undefined;
  if (!ready || !WidgetCheckout) return { opened: false };

  return new Promise<OpenResult>((resolve) => {
    let instance: WidgetCheckoutInstance;
    try {
      instance = new WidgetCheckout(config);
    } catch {
      resolve({ opened: false });
      return;
    }

    instance.open((result) => {
      const transaction = result?.transaction ?? null;
      resolve({
        opened: true,
        status: transaction?.status ?? null,
        statusMessage: transaction?.status_message ?? null,
      });
    });
  });
}
