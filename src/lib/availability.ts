/**
 * Contrato de la disponibilidad: la ruta y la forma de la respuesta.
 *
 * Vive en un archivo aparte, sin imports ni estado, porque lo usan los
 * dos lados: el servidor que lee la hoja de cálculo
 * (`availability-sheet.ts`) y el navegador que la consulta
 * (`stock.ts`). Si esto estuviera en el módulo del servidor, el bundle
 * público arrastraría la lectura de variables de entorno.
 */

/** Ruta del endpoint que devuelve la disponibilidad de toda la tienda. */
export const AVAILABILITY_PATH = "/api/disponibilidad";

/**
 * Clave del mapa de disponibilidad -> unidades disponibles.
 *
 * Una fila de la hoja sin talla/color usa el slug solo (stock por
 * producto, como siempre). Una fila con talla y/o color usa
 * `variantKey`, para que la misma prenda pueda tener números distintos
 * por combinación — un vestido puede agotarse en M/Negro y seguir
 * disponible en L/Beige.
 */
export type AvailabilityMap = Record<string, number>;

/** Minúsculas y sin tildes, para que "Negro" y "negro" sean la misma clave. */
function normalizeKeyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Clave compuesta para una variante talla+color de un producto.
 *
 * Usada tanto al leer la hoja (`availability-sheet.ts`) como al
 * consultar el stock desde la ficha (`stock.ts`), así las dos partes
 * siempre arman la misma clave para la misma combinación aunque la
 * hoja o el catálogo tengan las mayúsculas o tildes distintas.
 */
export function variantKey(
  slug: string,
  size: string | undefined,
  color: string | undefined,
): string {
  const s = size ? normalizeKeyPart(size) : "";
  const c = color ? normalizeKeyPart(color) : "";
  if (!s && !c) return slug;
  return `${slug}::${s}::${c}`;
}

/**
 * De dónde salió el dato que se está devolviendo:
 *
 *  - `sheet`        se acaba de leer la hoja;
 *  - `cache`        lectura reciente guardada en memoria del servidor;
 *  - `stale`        la hoja falló y se sirve la última lectura buena;
 *  - `unconfigured` no hay hoja configurada (no es un error);
 *  - `error`        la hoja falló y no hay nada anterior que servir.
 */
export type AvailabilitySource =
  "sheet" | "cache" | "stale" | "unconfigured" | "error";

export type AvailabilitySnapshot = {
  stock: AvailabilityMap;
  /** Momento de la última lectura buena, en ISO. `null` si nunca hubo. */
  updatedAt: string | null;
  source: AvailabilitySource;
  /**
   * Cuántas filas de la hoja no corresponden a ningún producto. Sirve
   * para notar que alguien escribió mal un nombre, sin publicar lo que
   * dicen esas celdas: la hoja de un negocio lleva al lado cosas que no
   * son para la calle, y este endpoint lo ve cualquiera. Los nombres
   * concretos quedan en el registro del servidor.
   */
  unknownCount: number;
  /** Motivo del fallo, ya sin datos sensibles. `null` si todo fue bien. */
  error: string | null;
};
