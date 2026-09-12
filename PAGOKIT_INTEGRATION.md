# Integración de pagos — PagoKit

Generado por PagoKit el 2026-09-05 sobre una integración de Wompi que ya
existía. No se reemplazó lo que funcionaba: se auditó, se corrigió lo que
faltaba y se agregó lo que no estaba.

## Configuración

- **Pasarela:** Wompi (Colombia), Web Checkout
- **SDK:** ninguno. Wompi no publica paquete de npm; se usa `fetch` contra
  su API y su `widget.js`. No se instaló ninguna dependencia nueva.
- **Stack:** TanStack Start 1.168.32 + Nitro 3, React 19, Vite 8
- **Base de datos:** Supabase (`supabase-js` 2.112.3), sin ORM
- **Despliegue:** Cloudflare Workers (preset `cloudflare-module`)
- **Tipo de cobro:** pago único
- **Presentación:** widget en escritorio, redirección en móvil (corte en
  768 px, el mismo de `src/hooks/use-mobile.tsx`)
- **Medios habilitados:** tarjeta, PSE, Nequi, Efecty (se configuran en el
  panel de Wompi, no en el código)
- **Moneda:** COP, exponente 2 (ISO 4217)

## Archivos creados

| Archivo | Para qué |
|---|---|
| `src/lib/runtime-env.ts` | Lee variables de entorno del `env` del Worker y, si no, de `process.env`. |
| `src/lib/supabase-server.ts` | Cliente único de Supabase con clave de servicio. |
| `src/lib/money.ts` | Paso de pesos a centavos con el exponente de la moneda escrito. |
| `src/lib/wompi-api.ts` | Consulta de transacciones en Wompi y anulación de tarjeta. |
| `src/lib/webhook-dedup.ts` | Deduplicación durable de eventos. |
| `src/lib/wompi-refunds.ts` | Endpoint interno de devoluciones, con la bifurcación de rieles irreversibles. |
| `src/lib/wompi-errors.ts` | Traducción de estados y rechazos de Wompi a español. |
| `supabase/migrations/0001_orders.sql` | Tabla `orders`, versionada tal como estaba documentada. |
| `supabase/migrations/0002_processed_webhook_events.sql` | Tabla de eventos ya procesados. |
| `supabase/migrations/0003_refund_requests.sql` | Devoluciones y obligaciones de pago manual. |
| `payment-page-scripts.json` | Inventario de scripts de la página de pago (PCI DSS 4.0.1, req. 6.4.3). |
| `PAGOKIT_INTEGRATION.md` | Este documento. |
| `PAGOKIT_PRODUCTION_CHECKLIST.md` | Qué hacer antes de cobrar de verdad. |

## Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/lib/wompi-webhook.ts` | Reescrito. Ver "Qué estaba mal" abajo. |
| `src/lib/wompi.ts` | Lee el entorno con `readEnv`, convierte a centavos con `toMinorUnits` y ahora devuelve también la configuración del widget, firmada igual que el formulario. |
| `src/lib/checkout.ts` | Dos caminos (widget / redirección) con caída automática a redirección si `widget.js` no carga. |
| `src/lib/orders.ts` | Usa el cliente compartido, agrega `findOrder` y `TERMINAL_ORDER_STATUSES`. La DDL se movió a la migración. |
| `src/server.ts` | Guarda el `env` del Worker al entrar cada petición y enruta el endpoint de devoluciones. El webhook sigue primero. |
| `src/routes/finalizar-compra.tsx` | Elige widget o redirección según el dispositivo y muestra los mensajes del traductor de errores. |
| `.env.example` | Claves de prueba en vez de las de producción, más `WOMPI_PRIVATE_KEY` y `WOMPI_ADMIN_TOKEN`. |

## Qué estaba bien en el código que ya existía

Vale la pena decirlo porque no es lo común:

- La firma de integridad se calculaba en el servidor, dentro de una
  server function, y el secreto nunca salía al navegador.
- El monto se recalculaba desde el catálogo, no se aceptaba el del
  navegador.
- El webhook ya verificaba el checksum con `WOMPI_EVENTS_SECRET` y con
  una comparación en tiempo constante, y ya concatenaba las propiedades
  en el orden que dicta el evento.
- El webhook ya se atendía antes del router en `src/server.ts`.
- El enlace de pago ya caducaba a los 30 minutos.
- La tabla `orders` ya estaba pensada con RLS activo y sin políticas.

## Qué estaba mal o faltaba, y cómo quedó

1. **El webhook creía lo que le contaban.** Tomaba `data.transaction.status`
   del cuerpo del evento y con eso marcaba el pedido. Ahora, con la firma
   ya validada, se consulta
   `GET /v1/transactions/{id}` y se actúa según esa respuesta. Es la
   corrección más importante de todo el trabajo.
2. **No había deduplicación.** Un evento legítimo capturado se podía
   reenviar indefinidamente y todas las veces pasaba la firma. Ahora se
   apunta en `processed_webhook_events`, en la base (en Workers no hay
   memoria compartida entre peticiones).
3. **No había ventana de tiempo.** Ahora se compara contra el `timestamp`
   del evento con 600 s de tolerancia. Ojo al matiz: no se rechaza a
   secas, porque Wompi reintenta a los 30 min, 3 h y 24 h con el cuerpo
   original y eso tiraría reintentos legítimos. Un evento viejo solo se
   rechaza si además no hay deduplicación disponible.
4. **No había tope de tamaño.** Ahora 256 KB, por cabecera y por
   contenido.
5. **El cuerpo se leía con `request.json()`.** Ahora se lee el texto
   crudo una sola vez y se parsea aparte, que es lo que exige la regla de
   verificar antes de tocar nada.
6. **`process.env` en Cloudflare.** El código leía los secretos de
   `process.env`, que en el preset `cloudflare-module` no se llena de
   forma fiable. Si eso fallaba en producción, `createWompiCheckout`
   devolvía `null` y la tienda decía "la pasarela no está configurada" sin
   más explicación. Ahora las variables se toman del `env` del Worker.
7. **El cliente de Supabase se apagaba solo.** `serverClient()` guardaba
   el resultado incluso cuando era `null`, así que si la primera lectura
   ocurría antes de que hubiera variables, ese aislado se quedaba sin base
   de datos para siempre. Ahora solo se guarda el cliente cuando se pudo
   crear.
8. **No se comparaba el monto cobrado.** Ahora, si Wompi confirma un
   `APPROVED` cuyo `amount_in_cents` no coincide con el que se firmó, el
   pedido **no** se marca como pagado: queda en `REVIEW_AMOUNT_MISMATCH`
   para que alguien lo mire.
9. **Los estados podían retroceder.** Un `PENDING` que llegara tarde
   pisaba un `APPROVED`. Ahora no.
10. **No había migraciones.** La estructura de `orders` vivía en un
    comentario. Ahora está en `supabase/migrations/`, con las mismas
    columnas.
11. **No había devoluciones.** Ahora hay un endpoint, y sobre todo hay una
    distinción explícita entre lo que se puede devolver por API y lo que
    no.
12. **Los rechazos se mostraban con una frase genérica.** Ahora hay un
    traductor de estados y causas frecuentes al español.

## Cómo fluye un pago

1. El comprador llena el formulario en `/finalizar-compra`.
2. `createWompiCheckout` (server function) recalcula el total desde
   `src/lib/products.ts`, suma envío, pasa a centavos y firma. Guarda el
   pedido como `PENDING`.
3. En escritorio se abre el widget; en móvil se envía el formulario a
   `checkout.wompi.co`. Los dos usan la misma firma.
4. Wompi cobra en su dominio y manda el evento a
   `POST /api/wompi/eventos`.
5. El webhook valida la firma, descarta repetidos, **le pregunta a Wompi**
   el estado real y actualiza el pedido.

Lo que el navegador diga al cerrarse el widget se muestra al comprador,
pero no marca nada como pagado. Eso solo lo hace el paso 5.

## Eventos manejados

- ✅ `transaction.updated` — mapea `APPROVED`, `DECLINED`, `VOIDED`,
  `ERROR` y `PENDING` al estado del pedido, siempre con el valor
  confirmado por la API.
- ⏳ Cualquier otro evento (por ejemplo `nequi_token.updated`) se registra
  y se responde 200 para que Wompi no reintente. Para atenderlo hay que
  agregarlo a `HANDLED_EVENTS` en `src/lib/wompi-webhook.ts` (hay un
  `TODO` en el sitio exacto).

## Webhooks de otras integraciones detectados

Ninguno. Se buscó `**/webhook*`, `**/api/webhook/**`, `**/notifications*`,
`**/ipn*` y `**/events*` en `src/`: lo único que aparece es Wompi.

Nota sobre la ruta: la convención de PagoKit es
`/api/webhook/<pasarela>/…`, pero aquí **se conservó**
`/api/wompi/eventos`, que es la que ya existía y la que probablemente ya
esté registrada en el panel de Wompi. Cambiarla obligaría a reconfigurar
el panel sin ganar nada.

## Tarjetas de prueba

No se incluyen números de tarjeta en este repositorio, ni de prueba
(regla 12 de PagoKit: nada de PAN ni CVV en el código o la
documentación). Las tarjetas de sandbox vigentes están publicadas en la
documentación de Wompi, en la sección de ambientes y llaves:
<https://docs.wompi.co/docs/colombia/ambientes-y-llaves/>

En sandbox el resultado también se puede forzar desde el panel de Wompi.

## Base de datos

Aplica las migraciones en el editor SQL de Supabase, en orden:

```
supabase/migrations/0001_orders.sql
supabase/migrations/0002_processed_webhook_events.sql
supabase/migrations/0003_refund_requests.sql
```

Todas usan `create table if not exists`, así que se pueden correr sobre
una base donde `orders` ya exista. Las tres quedan con RLS activo y sin
políticas: solo entra la clave de servicio, desde el servidor.

`processed_webhook_events` crece con cada evento. No hay limpieza
automática; si dentro de unos meses molesta, se pueden borrar las filas
con más de 90 días.

## Devoluciones

`POST /api/wompi/reembolsos`, con `Authorization: Bearer $WOMPI_ADMIN_TOKEN`.

```bash
curl -X POST https://tudominio.com/api/wompi/reembolsos \
  -H "Authorization: Bearer $WOMPI_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"reference":"YEI-XXXX-YYYY","reason":"pieza con defecto"}'
```

Sin `WOMPI_ADMIN_TOKEN` configurado el endpoint responde 503 y no hace
nada. No tiene interfaz: es para uso interno.

**Lo importante:** solo las tarjetas se devuelven por API. PSE, Nequi,
Efecty, Baloto, SuRed y las transferencias de Bancolombia son
irreversibles; para esos el endpoint registra una obligación de pago en
`refund_requests` con estado `PENDING_MANUAL_PAYOUT` y responde diciendo
que alguien tiene que hacer la transferencia. Cuando se haga, hay que
marcar esa fila como `PAID_OUT` a mano.

## Qué se verificó y qué no

Verificado ejecutando el código (con la API de Wompi simulada):

- La firma válida pasa; con otro secreto o con el monto alterado, no.
- `GET` al webhook responde 405; firma inválida, 401; cuerpo de más de
  256 KB, 413; evento sin manejador, 200.
- Un evento válido responde 200 **y hace exactamente una consulta a la
  API de Wompi** antes de tocar el pedido.
- Un evento fuera de ventana y sin deduplicación responde 400.
- `toMinorUnits(170000)` da `17000000`.
- El traductor de errores devuelve lo esperado para `DECLINED` y
  `PENDING`.

TypeScript y ESLint pasan limpios en todos los archivos de pagos. (El
proyecto tiene errores de tipos previos en componentes de interfaz, que no
se tocaron.)

**No verificado**, porque necesita credenciales reales:

- La deduplicación contra Supabase (se probó solo el camino sin base
  configurada, que avisa y sigue).
- Un cobro real en sandbox, ni el widget abriéndose en un navegador.
- La ruta de anulación de tarjeta (`POST /transactions/{id}/void`). Está
  centralizada en una constante de `src/lib/wompi-api.ts`; confírmala con
  la documentación vigente de Wompi y pruébala en sandbox antes de
  usarla en vivo.

## Próximos pasos

1. Copia `.env.example` a `.env` y pon las llaves de **sandbox**.
2. Aplica las tres migraciones en Supabase.
3. Corre `/pagokit:test` para mandarle al webhook un evento firmado y ver
   que responde 200.
4. Haz una compra de prueba en sandbox, con tarjeta y con PSE.
5. Lee `PAGOKIT_PRODUCTION_CHECKLIST.md` **antes** de cambiar a llaves de
   producción.

## Referencias

- Documentación de Wompi: <https://docs.wompi.co/docs/colombia/>
- Eventos: <https://docs.wompi.co/docs/colombia/eventos/>
- Widget: <https://docs.wompi.co/docs/colombia/widget-checkout-web/>

_El esquema de firma de eventos se verificó el 2026-05-20. Tarifas,
medios de pago disponibles y detalles de la API pueden haber cambiado
desde entonces: confírmalo en la documentación de Wompi antes de salir a
producción._
