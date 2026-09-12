/**
 * Conversión de pesos a la unidad menor de la moneda.
 *
 * SECURITY_RULES Regla 6: multiplicar por 100 "porque sí" es una de las
 * formas más comunes de cobrar de más o de menos. El factor no es una
 * propiedad del código sino de la moneda: es el exponente ISO 4217.
 * Por eso el exponente está escrito y nombrado, y no aparece un 100
 * suelto en medio del checkout.
 *
 * Caso concreto de este proyecto: el peso colombiano (COP) tiene
 * exponente 2 en ISO 4217, y el campo de Wompi se llama
 * `amount_in_cents`. Así que ×100 es correcto AQUÍ. No lo sería para el
 * yen (JPY, exponente 0) ni para el dinar kuwaití (KWD, exponente 3).
 *
 * En la práctica los precios del catálogo son pesos enteros: nadie cobra
 * centavos de peso. Aun así se redondea explícitamente para que un
 * decimal accidental (por un descuento, por ejemplo) no arrastre un
 * error de coma flotante hasta el monto cobrado.
 */

/** Exponente ISO 4217 por moneda: cuántos decimales tiene. */
const MINOR_UNIT_EXPONENT = {
  COP: 2,
} as const;

export type SupportedCurrency = keyof typeof MINOR_UNIT_EXPONENT;

export const DEFAULT_CURRENCY: SupportedCurrency = "COP";

/**
 * Pasa un monto expresado en la unidad mayor (pesos) a la unidad menor
 * (centavos), que es lo que espera el campo `amount_in_cents` de Wompi.
 */
export function toMinorUnits(
  amount: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Monto inválido: ${amount}`);
  }

  const exponent = MINOR_UNIT_EXPONENT[currency];
  const factor = 10 ** exponent;
  return Math.round(amount * factor);
}

/** El camino inverso: de centavos a pesos, para mostrar o comparar. */
export function fromMinorUnits(
  minor: number,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
): number {
  const exponent = MINOR_UNIT_EXPONENT[currency];
  const factor = 10 ** exponent;
  return minor / factor;
}
