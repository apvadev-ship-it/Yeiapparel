-- ---------------------------------------------------------------------
-- Canje de cupones del boletín.
--
-- El cupón único por suscriptor ya existía (columna `coupon_code` de
-- `newsletter`, generada con `crypto.getRandomValues` y protegida por
-- `unique`). Lo que faltaba era la mitad de "canjear": que caduque, que
-- se pueda usar una sola vez, y que el pedido quede marcado con qué
-- cupón y cuánto descuento se aplicó.
--
-- `coupon_redeemed_at` es la guarda contra el doble uso: se pone SOLO
-- cuando el pago queda `APPROVED` de verdad (webhook de Wompi), nunca
-- al iniciar el checkout — un carrito abandonado no debe quemar el
-- cupón de nadie.
-- ---------------------------------------------------------------------

alter table newsletter
  add column if not exists coupon_expires_at timestamptz,
  add column if not exists coupon_redeemed_at timestamptz,
  add column if not exists coupon_redeemed_order text;

-- Suscriptores de antes de esta migración no tenían fecha de
-- caducidad. Se les da la misma ventana que a los nuevos, contada
-- desde que se dieron de alta (no desde hoy), para no regalarles menos
-- ni más tiempo que a quien se suscribió el mismo día.
update newsletter
set coupon_expires_at = created_at + interval '30 days'
where coupon_expires_at is null;

alter table orders
  add column if not exists coupon_code text,
  add column if not exists discount_in_cents bigint not null default 0;
