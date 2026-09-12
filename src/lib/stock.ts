import { useEffect, useState } from "react";
import {
  AVAILABILITY_PATH,
  variantKey,
  type AvailabilityMap,
  type AvailabilitySnapshot,
} from "@/lib/availability";

/**
 * Inventario real de un producto.
 *
 * El dato manda desde una hoja de cálculo de Google: quien lleva la
 * tienda escribe ahí las unidades y la ficha se actualiza sola, sin
 * desplegar nada. La hoja no se consulta desde el navegador; se pide a
 * `/api/disponibilidad`, que la lee en el servidor y la cachea (ver
 * `availability-sheet.ts`).
 *
 * Si la hoja no está configurada, falla o no incluye esta pieza, se usa
 * el valor de respaldo que trae el producto en `products.ts`. Así la
 * ficha nunca queda sin información.
 */
export type StockState = {
  stock: number | null;
  loading: boolean;
  /** "sheet" si el dato vino de la hoja, "fallback" si es el local. */
  source: "sheet" | "fallback";
};

/** Se reutiliza la misma respuesta durante un minuto. */
const CLIENT_TTL_MS = 60_000;

let cache: { at: number; stock: AvailabilityMap } | null = null;
let inFlight: Promise<AvailabilityMap> | null = null;

/**
 * Pide el inventario de toda la tienda una sola vez y lo comparte.
 *
 * Está fuera del hook a propósito: en una página con varias fichas
 * (productos relacionados, la tienda entera) cada componente llamaría
 * por su cuenta y saldrían diez peticiones idénticas.
 */
async function loadAvailability(): Promise<AvailabilityMap> {
  if (cache && Date.now() - cache.at < CLIENT_TTL_MS) return cache.stock;

  if (!inFlight) {
    inFlight = fetch(AVAILABILITY_PATH, {
      headers: { accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<AvailabilitySnapshot>;
      })
      .then((snapshot) => {
        const stock =
          snapshot.stock && typeof snapshot.stock === "object"
            ? snapshot.stock
            : {};
        cache = { at: Date.now(), stock };
        return stock;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

/**
 * Talla y color elegidos en la ficha, para pedir el stock de esa
 * variante concreta en vez del total del producto.
 */
export type StockVariant = { size?: string; color?: string };

export function useProductStock(
  slug: string,
  fallback: number | undefined,
  variant?: StockVariant,
): StockState {
  const [state, setState] = useState<StockState>({
    stock: fallback ?? null,
    loading: true,
    source: "fallback",
  });

  const size = variant?.size;
  const color = variant?.color;

  useEffect(() => {
    let cancelled = false;

    const applyFallback = () => {
      if (cancelled) return;
      setState({ stock: fallback ?? null, loading: false, source: "fallback" });
    };

    loadAvailability()
      .then((stock) => {
        if (cancelled) return;

        // Primero se busca la variante exacta (talla+color). Si la hoja
        // no la trae —o no llegaron talla/color todavía— se cae al
        // stock del producto entero, para no dejar la ficha sin dato
        // mientras la hoja solo tiene el nivel viejo (producto, sin
        // variantes).
        const variantValue =
          size || color ? stock[variantKey(slug, size, color)] : undefined;
        const value = variantValue !== undefined ? variantValue : stock[slug];

        // Se comprueba el valor en vez de confiar en la forma de la
        // respuesta: un NaN o un número negativo pintaría una
        // disponibilidad absurda en la ficha.
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
          setState({ stock: value, loading: false, source: "sheet" });
        } else {
          applyFallback();
        }
      })
      .catch(applyFallback);

    return () => {
      cancelled = true;
    };
  }, [slug, fallback, size, color]);

  return state;
}

/** Cómo se le presenta el inventario al cliente. */
export function describeStock(stock: number | null): {
  label: string;
  detail: string;
  tone: "ok" | "bajo" | "agotado" | "desconocido";
} {
  if (stock === null) {
    return {
      label: "Consultar disponibilidad",
      detail: "Escríbenos y te confirmamos el inventario de esta pieza.",
      tone: "desconocido",
    };
  }
  if (stock <= 0) {
    return {
      label: "Agotado",
      detail: "Esta pieza se agotó. Escríbenos si quieres que te avisemos.",
      tone: "agotado",
    };
  }
  if (stock <= 3) {
    return {
      label: `Últimas ${stock} unidades`,
      detail: "Serie limitada 2026. Quedan muy pocas en el atelier.",
      tone: "bajo",
    };
  }
  return {
    label: "Disponible",
    detail: `${stock} unidades en el atelier · Serie limitada 2026`,
    tone: "ok",
  };
}

/**
 * Suma días hábiles saltando sábados y domingos. Se usa para estimar la
 * fecha de entrega a partir de hoy.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let added = 0;

  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }

  return date;
}

export const DELIVERY_BUSINESS_DAYS = 3;
export const FREE_SHIPPING_FROM = 300000;

/** Día calendario en Bogotá, como "2026-09-04". */
function bogotaDayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

/**
 * Fechas de compra y de entrega, siempre al día de hoy.
 *
 * El primer render usa la fecha del servidor para que la ficha se pinte
 * de inmediato, pero al montar se recalcula en el navegador. Eso corrige
 * tres casos en los que si no se mostraría una fecha vieja:
 *
 *  - la página quedó guardada en caché o se generó en el build;
 *  - alguien la dejó abierta y cruzó la medianoche;
 *  - la pestaña estuvo en segundo plano varios días.
 *
 * Por eso además de recalcular al montar, se vuelve a calcular al
 * regresar a la pestaña y justo después de cada medianoche.
 */
export function useDeliveryDates() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const refresh = () => {
      const ahora = new Date();
      // Solo re-renderiza si de verdad cambió el día.
      setToday((anterior) =>
        bogotaDayKey(anterior) === bogotaDayKey(ahora) ? anterior : ahora,
      );
    };

    const scheduleMidnight = () => {
      const ahora = new Date();
      const proxima = new Date(ahora);
      proxima.setHours(24, 0, 5, 0);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, proxima.getTime() - ahora.getTime());
    };

    const onVisible = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    scheduleMidnight();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return {
    today,
    delivery: addBusinessDays(today, DELIVERY_BUSINESS_DAYS),
  };
}
