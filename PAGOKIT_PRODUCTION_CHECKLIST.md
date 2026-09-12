# Lista de verificación para producción — Wompi

PagoKit dejó la tienda lista para cobrar en **sandbox**. El paso a dinero
real es manual a propósito: hay cosas que ningún código puede hacer por ti
y dos de ellas son requisitos legales.

Empieza por las dos primeras secciones. Si alguna de esas dos no está
resuelta, no tiene sentido seguir.

---

## 0. Dos cosas que bloquean todo (léelas primero)

### 0.1 Sin cuenta Bancolombia con 30 días, Wompi no te desembolsa

Si la cuenta de Wompi está a nombre de una **persona natural**, Wompi
exige una **cuenta de Bancolombia con al menos 30 días de actividad** para
poder dispersarte el dinero. No es un trámite que se resuelva después:
mientras no exista esa cuenta, puedes cobrarle a la gente y **el dinero no
sale de Wompi**.

- [ ] La cuenta bancaria de desembolso es de Bancolombia.
- [ ] Tiene 30 días o más de haber sido abierta y con movimientos.
- [ ] Está cargada y verificada en el panel de Wompi.
- [ ] Se hizo un desembolso de prueba y llegó.

Si el negocio está constituido como persona jurídica, confirma con Wompi
qué aplica en ese caso: las condiciones son distintas.

### 0.2 La factura electrónica DIAN es obligación tuya, no de Wompi

En Colombia **toda venta debe facturarse electrónicamente ante la DIAN**.
Wompi es una pasarela de pagos: **no es comerciante registrado (merchant
of record)**, no vende en tu nombre y **no emite ningún documento fiscal
por ti**. Que el cobro aparezca en Wompi no significa que la venta esté
facturada.

- [ ] Hay un proveedor tecnológico de facturación electrónica contratado
      (o habilitación propia ante la DIAN).
- [ ] El responsable del negocio está habilitado en el portal de la DIAN.
- [ ] Está definido quién emite la factura y en qué momento (lo habitual:
      cuando el pedido queda `APPROVED`).
- [ ] Se probó emitir una factura real de punta a punta.
- [ ] Está resuelto qué se hace con las devoluciones (nota crédito).

Esta integración **no** emite facturas. Si vas a automatizarlo, el punto
donde engancharlo es el webhook, justo después de que el pedido pasa a
`APPROVED` en `src/lib/wompi-webhook.ts`.

---

## 1. Cambiar las llaves de prueba por las de producción

En el panel de Wompi, entra a "Mi cuenta" → "Llaves" y cambia a modo
producción. Las llaves de producción llevan otro prefijo:
`pub_prod_`, `prv_prod_`, `prod_integrity_`, `prod_events_`.

- [ ] `WOMPI_PUBLIC_KEY` → `pub_prod_…`
- [ ] `WOMPI_PRIVATE_KEY` → `prv_prod_…`
- [ ] `WOMPI_INTEGRITY_SECRET` → `prod_integrity_…`
- [ ] `WOMPI_EVENTS_SECRET` → `prod_events_…` (es **otro** secreto,
      distinto al de integridad; no los intercambies)
- [ ] `WOMPI_REDIRECT_URL` → tu dominio real
- [ ] `WOMPI_ADMIN_TOKEN` → un valor largo y aleatorio, distinto al de
      desarrollo

**Ninguna de estas va en `.env.example`.** Ese archivo se sube al
repositorio y solo lleva valores de prueba. Las de producción van en el
gestor de secretos de la plataforma (siguiente sección).

Detalle que se sale solo de la mano: `src/lib/wompi-api.ts` decide si
habla con `sandbox.wompi.co` o con `production.wompi.co` mirando el
prefijo de `WOMPI_PUBLIC_KEY`. Si cambias todas las llaves menos esa,
seguirás golpeando sandbox.

---

## 2. Registrar la URL de eventos en el panel de Wompi

- [ ] En el panel, en modo **producción**, registra la URL de eventos:

      https://<tu-dominio>/api/wompi/eventos

- [ ] Confirma que quedó suscrito `transaction.updated`.
- [ ] Copia el secreto de eventos **de producción** y ponlo en
      `WOMPI_EVENTS_SECRET`. Es distinto al de sandbox: si dejas el de
      pruebas, todos los eventos reales se rechazarán con 401 y los
      pedidos se quedarán en `PENDING` para siempre.
- [ ] Manda un evento de prueba desde el panel y revisa en los registros
      del Worker que salga `[wompi] … → APPROVED`.

---

## 3. Secretos en Cloudflare Workers

Este proyecto se despliega con el preset `cloudflare-module` de Nitro. En
Cloudflare las variables llegan por el `env` del Worker, y así las lee el
código (`src/lib/runtime-env.ts`).

Con Wrangler:

```bash
wrangler secret put WOMPI_PUBLIC_KEY
wrangler secret put WOMPI_PRIVATE_KEY
wrangler secret put WOMPI_INTEGRITY_SECRET
wrangler secret put WOMPI_EVENTS_SECRET
wrangler secret put WOMPI_ADMIN_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

O, si despliegas desde el panel de Cloudflare: Workers & Pages → tu
proyecto → Settings → Variables and Secrets, y agrégalas **como Secret**,
no como Variable de texto plano.

- [ ] Los siete valores están cargados en producción.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está como *secret* (salta la seguridad
      por fila: quien la tenga lee y edita todos los pedidos).
- [ ] Ninguna variable secreta lleva el prefijo `VITE_`. Ese prefijo hace
      que Vite la incruste en el JavaScript que descarga cualquiera.
- [ ] Las llaves de sandbox ya no están en el entorno de producción.

---

## 4. Base de datos

- [ ] Las tres migraciones de `supabase/migrations/` están aplicadas en el
      proyecto de Supabase de **producción**.
- [ ] `orders`, `processed_webhook_events` y `refund_requests` tienen RLS
      activo y ninguna política.
- [ ] Con la clave anónima (la del navegador) no se puede leer `orders`.
      Compruébalo de verdad, no lo supongas.

---

## 5. Medios de pago y widget

- [ ] En el panel de Wompi están activos los medios que quieres cobrar:
      tarjeta, PSE, Nequi y Efecty.
- [ ] Cada uno se probó al menos una vez en sandbox.
- [ ] El widget abre bien en escritorio en Chrome, Safari y Firefox.
- [ ] En móvil sale la redirección, no el widget.
- [ ] Con un bloqueador de anuncios activo, si `widget.js` no carga, la
      compra cae sola a la redirección (así está programado; verifícalo).

Nota sobre Apple Pay y Google Pay: no están integrados aquí. Además,
`public/_headers` manda `Permissions-Policy: payment=()`, que apaga la
Payment Request API en el sitio. Si algún día quieres billeteras, hay que
tocar esa cabecera y probar en dispositivo real.

---

## 6. Devoluciones: define el procedimiento antes de necesitarlo

- [ ] Está claro quién puede pedir una devolución y con qué token.
- [ ] Alguien revisa `refund_requests` con estado
      `PENDING_MANUAL_PAYOUT` de forma periódica. Esas son
      **transferencias que el negocio debe hacer a mano**: PSE, Nequi,
      Efecty y demás no se devuelven por API.
- [ ] Está definido el plazo para devolver (y publicado en las políticas
      de la tienda).
- [ ] Está definido quién emite la nota crédito ante la DIAN.
- [ ] Si vas a usar la anulación de tarjeta por API, confirma la ruta
      `POST /transactions/{id}/void` con la documentación vigente de
      Wompi y pruébala en sandbox. PagoKit la dejó centralizada en
      `src/lib/wompi-api.ts` pero **no pudo probarla contra la API real**.

---

## 7. Prueba final con dinero real

- [ ] Haz una compra real por el monto más bajo que puedas, desde otro
      dispositivo y otra red.
- [ ] Confirma en los registros del Worker que llegó el evento y que se
      consultó la transacción.
- [ ] Confirma que el pedido quedó `APPROVED` en `orders` y con
      `paid_at`.
- [ ] Confirma que se emitió la factura electrónica.
- [ ] Devuelve esa compra por el camino que corresponda y confirma que
      quedó registrada.
- [ ] Revisa que el dinero llegue a la cuenta de Bancolombia en el
      siguiente ciclo de desembolso.

---

## 8. Vigilancia de los primeros días

- [ ] Alerta o revisión diaria de pedidos que se quedan en `PENDING` más
      de una hora (suele significar que el webhook no está llegando).
- [ ] Revisión de pedidos en `REVIEW_AMOUNT_MISMATCH`: son cobros cuyo
      monto no coincidió con el firmado. Deberían ser cero; si aparece
      uno, míralo el mismo día.
- [ ] Revisión de `refund_requests` pendientes.
- [ ] Mira los registros del Worker las primeras 24 horas. `[wompi] firma
      inválida` repetido significa que el secreto de eventos está mal o
      que alguien está probando suerte.

---

## Recordatorio final

- Las llaves de producción **nunca** se escriben en `.env.example` ni en
  ningún archivo del repositorio.
- Si una llave de producción se filtra alguna vez, rótala en el panel de
  Wompi de inmediato. El secreto de eventos se regenera para cada
  endpoint que crees.
- Los datos de tarjeta no pasan ni pasarán por este servidor: los captura
  Wompi en su dominio. No agregues columnas ni campos para número de
  tarjeta, CVV o fecha de vencimiento.
