/**
 * Cupones del boletín: validación, previsualización y canje.
 *
 * El código en sí (`newsletter.coupon_code`) ya se genera único por
 * suscriptor en `newsletter.ts`, con `crypto.getRandomValues` y una
 * restricción `unique` en la base — eso resuelve "que no se repita
 * entre cuentas". Este archivo resuelve la otra mitad: que sirva una
 * sola vez y que caduque.
 *
 * Tres funciones, tres momentos distintos del mismo cupón:
 *
 *  - `previewCoupon` — se llama desde el checkout, ANTES de pagar, solo
 *    para mostrar el descuento en pantalla. No cambia nada en la base.
 *  - `applyCouponToSubtotal` — se llama DENTRO de `createWompiCheckout`
 *    (`wompi.ts`), sobre el mismo subtotal que se firma. Es la fuente
 *    de verdad del monto: lo que diga el navegador en `previewCoupon`
 *    no se usa para cobrar, solo para que la persona vea el descuento
 *    antes de pagar.
 *  - `redeemCoupon` — se llama SOLO cuando Wompi confirma `APPROVED`
 *    (`wompi-webhook.ts`). Ahí, y no antes, se marca el cupón como
 *    usado: un carrito que nunca se paga no debe quemarle el cupón a
 *    nadie.
 *
 * SECURITY_RULES Regla 4: el descuento se calcula aquí, en el
 * servidor, sobre el subtotal que el propio servidor recalculó desde
 * el catálogo. El navegador nunca dice cuánto vale el descuento.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase-server";

/** 15%, el mismo que promete el correo de bienvenida del boletín. */
export const COUPON_DISCOUNT_RATE = 0.15;

export type CouponInvalidReason =
  "not_found" | "expired" | "redeemed" | "unavailable";

export type CouponCheck =
  { ok: true; discount: number } | { ok: false; reason: CouponInvalidReason };

/**
 * Consulta el cupón contra la base y calcula el descuento sobre
 * `subtotal` (en pesos), sin escribir nada. La usan tanto la
 * previsualización como el checkout real — un solo lugar decide qué
 * hace a un cupón válido.
 */
async function checkCoupon(
  code: string,
  subtotal: number,
): Promise<CouponCheck> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "unavailable" };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "not_found" };

  const { data, error } = await db
    .from("newsletter")
    .select("coupon_expires_at, coupon_redeemed_at")
    .eq("coupon_code", normalized)
    .maybeSingle();

  if (error) {
    console.error(`[cupon] no se pudo consultar: ${error.message}`);
    return { ok: false, reason: "unavailable" };
  }
  if (!data) return { ok: false, reason: "not_found" };

  if (data["coupon_redeemed_at"]) return { ok: false, reason: "redeemed" };

  const expiresAt = data["coupon_expires_at"]
    ? new Date(String(data["coupon_expires_at"]))
    : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const discount = Math.round(subtotal * COUPON_DISCOUNT_RATE);
  return { ok: true, discount };
}

/**
 * Aplica el cupón al subtotal del checkout. Nunca lanza ni bloquea la
 * compra: un código inválido simplemente no descuenta nada, y el
 * motivo queda en `reason` para que el comprador sepa por qué.
 *
 * Se llama únicamente desde `createWompiCheckout`, sobre el subtotal
 * ya recalculado desde el catálogo — nunca sobre un monto que mande el
 * navegador.
 */
export async function applyCouponToSubtotal(
  code: string | undefined,
  subtotal: number,
): Promise<{
  discount: number;
  couponCode: string | null;
  reason?: CouponInvalidReason;
}> {
  if (!code || !code.trim()) {
    return { discount: 0, couponCode: null };
  }

  const normalized = code.trim().toUpperCase();
  const result = await checkCoupon(normalized, subtotal);

  if (!result.ok) {
    return { discount: 0, couponCode: null, reason: result.reason };
  }

  return { discount: result.discount, couponCode: normalized };
}

/**
 * Marca el cupón como usado. Se llama SOLO cuando el webhook de Wompi
 * confirma `APPROVED` de verdad, nunca al iniciar el checkout.
 *
 * La condición `coupon_redeemed_at is null` en el `update` es la
 * defensa contra el doble uso: si dos pagos con el mismo cupón se
 * aprobaran casi a la vez (carrera improbable, pero posible), solo el
 * primero en llegar aquí consigue marcarlo. El segundo no revierte el
 * cobro —eso ya pasó en Wompi—, pero sí queda registrado para revisar
 * a mano.
 */
export async function redeemCoupon(
  couponCode: string,
  orderReference: string,
): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const { data, error } = await db
    .from("newsletter")
    .update({
      coupon_redeemed_at: new Date().toISOString(),
      coupon_redeemed_order: orderReference,
    })
    .eq("coupon_code", couponCode)
    .is("coupon_redeemed_at", null)
    .select("email")
    .maybeSingle();

  if (error) {
    console.error(`[cupon] no se pudo marcar como usado: ${error.message}`);
    return;
  }

  if (!data) {
    // No se actualizó ninguna fila: o el código no existe, o ya estaba
    // canjeado por otro pedido. Con el pago ya aprobado en Wompi, no
    // hay nada que deshacer — queda anotado para revisión manual.
    console.warn(
      `[cupon] ${couponCode} no se marcó como usado (ya estaba canjeado o no existe); pedido ${orderReference} igual quedó aprobado`,
    );
  }
}

const previewSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().positive(),
});

export type CouponPreview =
  { ok: true; discount: number } | { ok: false; reason: CouponInvalidReason };

/**
 * Server function para el checkout: le dice al navegador cuánto
 * descontaría un código, ANTES de pagar. Es solo para mostrar en
 * pantalla — el monto que de verdad se cobra sale de
 * `applyCouponToSubtotal`, dentro de `createWompiCheckout`, que vuelve
 * a validar el mismo código sobre el subtotal ya recalculado del
 * servidor.
 */
export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewSchema.parse(data))
  .handler(async ({ data }): Promise<CouponPreview> => {
    const result = await checkCoupon(data.code, data.subtotal);
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true, discount: result.discount };
  });
