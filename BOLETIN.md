# Boletín YEI — cupón del 15% y agente de IA

Qué hace ahora la sección del 15%:

1. Alguien deja su correo → **el servidor** lo guarda y le manda el cupón.
2. Un agente (Claude Opus 5) redacta las actualizaciones de marca y **se envían solas**.

---

## Lo que estaba mal antes

El formulario insertaba en Supabase **desde el navegador** con la clave anónima.
Dos consecuencias: cualquiera podía llenar la tabla de correos sin pasar por la web,
y **el cupón nunca salía por correo** aunque la pantalla dijera *"te llegará en unos
minutos"*. El cupón además se generaba en el navegador, o sea que el cliente decidía
su propio código de descuento.

Ahora todo eso ocurre en el servidor.

---

## Encenderlo (3 pasos)

### 1. Base de datos

Aplica `supabase/migrations/0004_newsletter.sql` en tu proyecto de Supabase.
Crea `newsletter` y `newsletter_campaigns`, las dos con RLS activada y sin políticas:
solo la clave de servicio entra.

### 2. Correo — Resend

Crea la cuenta en [resend.com](https://resend.com), saca una API key y ponla en `.env`:

```
RESEND_API_KEY=re_...
SITE_URL=http://localhost:8080
```

> **Sin dominio verificado, Resend solo entrega a la dirección de tu propia cuenta.**
> Es un límite del proveedor, no del código. Deja `EMAIL_FROM` vacío y se usará su
> remitente de pruebas. Cuando verifiques tu dominio (registros SPF y DKIM en Resend),
> pon `EMAIL_FROM=YEI Apparel <hola@tudominio.com>` y ya escribe a clientes reales.

### 3. Agente

```
ANTHROPIC_API_KEY=sk-ant-...
NEWSLETTER_ADMIN_TOKEN=<algo largo y aleatorio>
```

Genera el token con:

```bash
node -e "console.log(crypto.randomUUID())"
```

Sin `NEWSLETTER_ADMIN_TOKEN` el endpoint de campañas queda **apagado**, a propósito:
una ruta que escribe a toda tu lista de clientes no puede quedar abierta por olvidar
una variable.

---

## Probarlo

**El cupón** — rellena el formulario del 15% en la portada. Debe llegarte el correo
con el código. Si falta alguna variable, la pantalla te lo dice en vez de prometer un
envío que no ocurrió.

**El agente, sin enviar nada a nadie** (`dryRun`) — esto es lo que conviene correr
primero:

```bash
curl -X POST "http://localhost:8080/api/boletin/campana?dryRun=1" -H "Authorization: Bearer TU_TOKEN" -H "Content-Type: application/json" -d "{\"brief\":\"la camisa de seda marfil\"}"
```

Devuelve el asunto, el cuerpo y el HTML ya montado, **sin enviar**. Léelo antes de
disparar de verdad.

**Enviar de verdad** — el mismo comando sin `?dryRun=1`. Sale a toda la lista.

**Darse de baja** — el enlace del pie de cada correo. También responde al botón
nativo de Gmail (`List-Unsubscribe`), que hace un POST de un clic.

---

## Cómo se evita que el agente diga tonterías

El envío es automático, así que **nadie lee el texto antes de que llegue a tus
clientes**. Eso pone todo el peso en dos defensas:

- **Anclaje.** Al modelo se le pasa el catálogo real (`src/lib/products.ts`) y tiene
  prohibido inventar prendas, precios, materiales, fechas o plazos de envío.
- **Validación posterior** (`brand-agent.ts`). Antes de enviar se comprueba que:
  - todo importe que aparezca en el texto exista en el catálogo;
  - el botón apunte a una ruta real de la tienda, nunca fuera del dominio;
  - asunto, titular y párrafos quepan en la maqueta.

  Una campaña que no pase se **descarta**: se guarda como `failed` con el motivo y no
  se escribe a nadie.

Cada campaña queda registrada en `newsletter_campaigns` con el texto y el modelo que
lo escribió. Con envío automático, esa tabla es el único registro de qué se le dijo a
tus clientes.

---

## Límites que conviene saber

- **Tope de 200 destinatarios por ejecución.** Un Worker tiene tiempo de CPU acotado;
  con la lista crecida hay que llamar varias veces. La respuesta trae `truncated: true`
  cuando quedaron personas fuera.
- **Coste.** Cada campaña gasta una llamada a Claude Opus 5 y un correo por
  destinatario. Ninguna de las dos cosas es gratis.
- **Sin `RESEND_API_KEY`** el alta sigue funcionando y queda en `pending`: la persona
  queda registrada y se le avisa en pantalla de que el correo no salió.

---

## Obligaciones legales (Colombia)

Se recoge **solo el correo** — ni nombre, ni teléfono, ni fecha de nacimiento. El
mejor modo de custodiar un dato es no pedirlo. Aun así, un correo es dato personal
bajo la **Ley 1581 de 2012**: hace falta finalidad declarada, poder darse de baja
(está) y poder solicitar supresión.

Todo correo lleva enlace de baja y cabecera `List-Unsubscribe`. Sin eso la gente
marca como spam en vez de darse de baja, y eso sí quema la reputación del dominio.
