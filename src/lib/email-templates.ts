/**
 * Plantillas de correo de YEI.
 *
 * Por qué tablas y estilos en línea y no el CSS moderno de la web:
 * Outlook de escritorio renderiza con el motor de Word, que no entiende
 * flexbox, grid ni hojas de estilo externas. Un correo maquetado como una
 * página se ve roto ahí. Esto es HTML de correo a propósito, no descuido.
 *
 * Las tipografías tampoco se cargan de Google Fonts: la mayoría de
 * clientes las bloquea. Se declara la familia de la marca y detrás una
 * pila de respaldo que existe en todas partes.
 */

import { readEnv } from "@/lib/runtime-env";

/** Paleta de la marca, la misma de la web. */
const CHOCOLATE = "#351A17";
const TERRACOTA = "#B74F3F";
const NUDE = "#EBD8CF";
const MARFIL = "#F7F3EE";
/** El mismo tono de "src/styles.css" que usa /nueva-coleccion. */
const ROSA = "#8A4552";

const DISPLAY =
  "'Cormorant Garamond', Didot, Georgia, 'Times New Roman', serif";
const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * URL absoluta del logo (el monograma "Y", `public/apple-touch-icon.png`).
 * Tiene que ser absoluta porque un correo no tiene forma de resolver una
 * ruta relativa: el destinatario nunca está "parado" en el dominio del
 * sitio. `SITE_URL` es la misma variable que ya usa `newsletter.ts` para
 * los enlaces del boletín.
 */
function logoUrl(): string {
  const base = (readEnv("SITE_URL") ?? "http://localhost:8080").replace(
    /\/+$/,
    "",
  );
  return `${base}/apple-touch-icon.png`;
}

/**
 * Escapa lo que va a interpolarse en el HTML.
 *
 * Importa de verdad: el cuerpo de las campañas lo escribe un modelo de
 * lenguaje y el destinatario es un correo que llegó de un formulario
 * público. Ninguno de los dos es de fiar como HTML. Sin esto, un texto
 * con `<` rompería la maqueta, y en el peor caso inyectaría marcado.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ShellOptions = {
  /** Texto oculto que los clientes muestran junto al asunto. */
  preheader: string;
  content: string;
  unsubscribeUrl: string;
};

/** Marco común: cabecera, cuerpo y pie con la baja. */
function shell({ preheader, content, unsubscribeUrl }: ShellOptions): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YEI Apparel</title>
</head>
<body style="margin:0;padding:0;background-color:${MARFIL};">
  <!-- Preencabezado: se ve en la bandeja, no en el correo abierto. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${MARFIL};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- Cabecera -->
          <tr>
            <td align="center" style="padding:8px 0 28px;">
              <span style="font-family:${DISPLAY};font-size:30px;letter-spacing:10px;color:${CHOCOLATE};">
                Y E I
              </span>
            </td>
          </tr>

          ${content}

          <!-- Pie -->
          <tr>
            <td style="padding:32px 24px 8px;border-top:1px solid ${NUDE};">
              <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;line-height:1.7;color:#8A7A73;">
                Recibes este correo porque dejaste tu dirección en yeiapparel.com.
              </p>
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:#8A7A73;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8A7A73;text-decoration:underline;">
                  Darme de baja
                </a>
                &nbsp;·&nbsp; YEI Apparel · Colombia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type AdminShellOptions = {
  preheader: string;
  content: string;
};

/**
 * Carcasa para correos INTERNOS (avisos de compra, reporte semanal) —
 * los que solo lee el dueño de la tienda, nunca un cliente. Comparte la
 * paleta y tipografía de `shell()`, pero con dos diferencias a propósito:
 *
 *  1. Lleva el logo real (imagen), no el wordmark en texto: esto es un
 *     panel de negocio, y el logo ayuda a distinguirlo de un vistazo en
 *     una bandeja llena de avisos de otros sistemas.
 *  2. Sin enlace de "darme de baja": nadie se da de baja de los avisos
 *     de su propio negocio. Ese pie solo tiene sentido en correo a
 *     clientes (ver `shell()`).
 */
function adminShell({ preheader, content }: AdminShellOptions): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YEI Apparel — panel interno</title>
</head>
<body style="margin:0;padding:0;background-color:${MARFIL};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${MARFIL};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- Cabecera con el logo real -->
          <tr>
            <td align="center" style="padding:8px 0 24px;">
              <img src="${escapeHtml(logoUrl())}" width="44" height="44" alt="YEI"
                   style="display:block;width:44px;height:44px;border-radius:6px;" />
              <p style="margin:10px 0 0;font-family:${SANS};font-size:10px;letter-spacing:3px;
                        text-transform:uppercase;color:#8A7A73;">
                Panel interno
              </p>
            </td>
          </tr>

          <!-- Tarjeta de contenido -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid ${NUDE};border-radius:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${content}
              </table>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td align="center" style="padding:20px 24px 8px;">
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:#8A7A73;">
                Correo automático de yeiapparel.co · no reenviar a clientes
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Botón. Se maqueta con tabla porque Outlook ignora el padding de un <a>. */
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${TERRACOTA}" style="border-radius:2px;">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:15px 38px;font-family:${SANS};font-size:12px;
                  letter-spacing:2.5px;text-transform:uppercase;color:${MARFIL};text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export type WelcomeEmail = { subject: string; html: string; text: string };

/**
 * Correo de bienvenida con el cupón del 15%.
 *
 * Este es el que la interfaz ya prometía ("te llegará en unos minutos")
 * y que hasta ahora no salía de ninguna parte.
 */
export function renderWelcomeEmail(params: {
  couponCode: string;
  /** Hasta cuándo sirve el cupón. Se muestra en el correo, no se oculta. */
  expiresAt: Date;
  storeUrl: string;
  unsubscribeUrl: string;
}): WelcomeEmail {
  const { couponCode, expiresAt, storeUrl, unsubscribeUrl } = params;
  const expiresLabel = expiresAt.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });

  const content = `
    <tr>
      <td align="center" style="padding:0 24px;">
        <p style="margin:0 0 14px;font-family:${SANS};font-size:11px;letter-spacing:3px;
                  text-transform:uppercase;color:${TERRACOTA};">
          Bienvenida a YEI
        </p>
        <h1 style="margin:0 0 20px;font-family:${DISPLAY};font-size:44px;line-height:1.1;
                   font-weight:500;color:${CHOCOLATE};">
          Tu 15% <em style="color:${TERRACOTA};">te espera</em>
        </h1>
        <p style="margin:0 0 30px;font-family:${SANS};font-size:15px;line-height:1.8;
                  color:#5C4A44;max-width:420px;">
          Gracias por sumarte. Este código es solo tuyo, sirve una sola
          vez, y vale hasta el <strong>${expiresLabel}</strong>.
        </p>
      </td>
    </tr>

    <!-- Cupón -->
    <tr>
      <td align="center" style="padding:0 24px 30px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="max-width:380px;background-color:${CHOCOLATE};border-radius:3px;">
          <tr>
            <td align="center" style="padding:26px 20px;">
              <p style="margin:0 0 10px;font-family:${SANS};font-size:10px;letter-spacing:3px;
                        text-transform:uppercase;color:${NUDE};opacity:0.75;">
                Tu código
              </p>
              <p style="margin:0;font-family:${SANS};font-size:26px;letter-spacing:4px;
                        font-weight:600;color:${MARFIL};">
                ${escapeHtml(couponCode)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 24px 36px;">
        ${button("Ver la colección", storeUrl)}
      </td>
    </tr>`;

  const text = [
    "BIENVENIDA A YEI",
    "",
    "Tu 15% te espera.",
    "",
    `Tu código: ${couponCode}`,
    "",
    `Es solo tuyo, sirve una sola vez, y vale hasta el ${expiresLabel}.`,
    "",
    `Ver la colección: ${storeUrl}`,
    "",
    "---",
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    subject: `Tu 15% de descuento en YEI — ${couponCode}`,
    html: shell({
      preheader: `Tu código ${couponCode} ya está listo para usar.`,
      content,
      unsubscribeUrl,
    }),
    text,
  };
}

/** Cuerpo que produce el agente, ya validado. */
export type CampaignBody = {
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
};

/** Correo de actualización de marca, escrito por el agente. */
export function renderCampaignEmail(params: {
  preheader: string;
  body: CampaignBody;
  unsubscribeUrl: string;
}): { html: string; text: string } {
  const { preheader, body, unsubscribeUrl } = params;

  const paragraphs = body.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.85;color:#5C4A44;">
           ${escapeHtml(p)}
         </p>`,
    )
    .join("\n");

  const content = `
    <tr>
      <td style="padding:0 24px;">
        <h1 style="margin:0 0 24px;font-family:${DISPLAY};font-size:40px;line-height:1.12;
                   font-weight:500;color:${CHOCOLATE};text-align:center;">
          ${escapeHtml(body.headline)}
        </h1>
        ${paragraphs}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:18px 24px 36px;">
        ${button(body.ctaLabel, body.ctaUrl)}
      </td>
    </tr>`;

  const text = [
    body.headline.toUpperCase(),
    "",
    ...body.paragraphs,
    "",
    `${body.ctaLabel}: ${body.ctaUrl}`,
    "",
    "---",
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    html: shell({ preheader, content, unsubscribeUrl }),
    text,
  };
}

/** Una prenda tal como se muestra en el correo de anuncio de catálogo. */
export type AnnouncementProduct = {
  name: string;
  /** Ya formateado, p. ej. "$150.000". */
  price: string;
  image: string;
  url: string;
};

/**
 * Correo de "hay novedades en el catálogo" — diseño fijo, sin IA de por
 * medio. A diferencia de `renderCampaignEmail` (que escribe el agente),
 * este siempre muestra datos reales del catálogo: foto, nombre y
 * precio de cada prenda, tal cual están en `products.ts`. Así no hay
 * forma de que el correo invente una prenda o un precio que no existe.
 *
 * Las prendas se acomodan de a dos por fila — es la forma más simple
 * de hacer una rejilla que Outlook (que no entiende `flex` ni `grid`)
 * también respete.
 */
export function renderCatalogAnnouncementEmail(params: {
  headline: string;
  intro: string;
  products: AnnouncementProduct[];
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): { html: string; text: string } {
  const { headline, intro, products, ctaLabel, ctaUrl, unsubscribeUrl } =
    params;

  const rows: AnnouncementProduct[][] = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  const cell = (p: AnnouncementProduct) => `
    <td width="48%" valign="top" style="padding-bottom:24px;">
      <a href="${escapeHtml(p.url)}" style="text-decoration:none;">
        <img src="${escapeHtml(p.image)}" width="260" alt="${escapeHtml(p.name)}"
             style="width:100%;max-width:260px;height:auto;display:block;border-radius:2px;" />
        <p style="margin:12px 0 2px;font-family:${DISPLAY};font-size:19px;
                  font-weight:500;color:${CHOCOLATE};">
          ${escapeHtml(p.name)}
        </p>
        <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:600;color:${TERRACOTA};">
          ${escapeHtml(p.price)}
        </p>
      </a>
    </td>`;

  const grid = rows
    .map(
      (row) => `
    <tr>
      ${cell(row[0]!)}
      <td width="4%">&nbsp;</td>
      ${row[1] ? cell(row[1]) : `<td width="48%">&nbsp;</td>`}
    </tr>`,
    )
    .join("\n");

  const content = `
    <tr>
      <td align="center" style="padding:0 24px 28px;">
        <p style="margin:0 0 14px;font-family:${SANS};font-size:11px;letter-spacing:3px;
                  text-transform:uppercase;color:${TERRACOTA};">
          Novedades YEI
        </p>
        <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:40px;line-height:1.12;
                   font-weight:500;color:${CHOCOLATE};">
          ${escapeHtml(headline)}
        </h1>
        <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.8;color:#5C4A44;">
          ${escapeHtml(intro)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${grid}
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:12px 24px 36px;">
        ${button(ctaLabel, ctaUrl)}
      </td>
    </tr>`;

  const text = [
    headline.toUpperCase(),
    "",
    intro,
    "",
    ...products.map((p) => `${p.name} — ${p.price}\n${p.url}`),
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    "---",
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    html: shell({ preheader: intro, content, unsubscribeUrl }),
    text,
  };
}

/**
 * Avisos de cuenta regresiva para la próxima colección — plantilla
 * predefinida, no algo que se escriba a mano cada vez. La usa
 * `launch-reminders.ts` en los tres momentos que pidió la marca:
 * a los 10 días, a los 3 días, y el día del lanzamiento.
 *
 * El diseño es el MISMO que `/nueva-coleccion` (la página del
 * cronómetro real): los mismos dos tonos rosa/rosa-claro, la misma
 * rejilla de 4 casillas (Días · Horas · Minutos · Segundos). La única
 * diferencia obligada es que un correo no puede correr JavaScript: el
 * cronómetro de la página tica cada segundo, el del correo es una
 * FOTO fija del momento en que se mandó. Por eso el texto dice "al
 * momento de este correo" en vez de fingir que sigue corriendo.
 */
export function renderLaunchCountdownEmail(params: {
  headline: string;
  intro: string;
  remaining: { dias: number; horas: number; minutos: number; segundos: number };
  launchDateLabel: string;
  /** URL de la página del cronómetro real en el sitio. */
  ctaUrl: string;
  /**
   * Enlace de "agregar a Google Calendar" — abre directo la pantalla
   * de crear evento, sin descargar nada, cuando la persona tiene
   * sesión de Google activa en el navegador donde abre el correo (el
   * caso normal). Ver `googleCalendarUrl` en `next-collection.ts`.
   */
  googleCalendarUrl: string;
  /**
   * URL del archivo .ics (ver `calendar-ics.ts` + la ruta en
   * `server.ts`). Alternativa para Apple Calendar, Outlook, o cuando
   * el cliente de correo abre el enlace en una ventana sin sesión de
   * Google (pasa en algunas apps de celular).
   */
  icsUrl: string;
  unsubscribeUrl: string;
}): { html: string; text: string } {
  const {
    headline,
    intro,
    remaining,
    launchDateLabel,
    ctaUrl,
    googleCalendarUrl,
    icsUrl,
    unsubscribeUrl,
  } = params;

  // Casillas fijas en HTML, no una imagen: una imagen SVG no se ve en
  // Gmail (se probó — solo aparece el texto alternativo), así que esto
  // es lo único que se ve bien e igual de "lujoso" en TODOS los
  // clientes de correo. El precio es que el número queda fijo al
  // momento del envío, no se recalcula al abrir.
  const units: [string, number][] = [
    ["Días", remaining.dias],
    ["Horas", remaining.horas],
    ["Minutos", remaining.minutos],
    ["Segundos", remaining.segundos],
  ];

  const cell = ([label, value]: [string, number]) => `
    <td width="25%" align="center" style="padding:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background-color:${ROSA};border-radius:3px;">
        <tr>
          <td align="center" style="padding:16px 4px;">
            <span style="display:block;font-family:${DISPLAY};font-size:34px;line-height:1;
                        font-weight:500;color:${MARFIL};">
              ${String(value).padStart(2, "0")}
            </span>
            <span style="display:block;margin-top:8px;font-family:${SANS};font-size:9px;
                        letter-spacing:2px;text-transform:uppercase;color:${NUDE};">
              ${label}
            </span>
          </td>
        </tr>
      </table>
    </td>`;

  const content = `
    <tr>
      <td align="center" style="padding:0 24px 24px;">
        <p style="margin:0 0 14px;font-family:${SANS};font-size:11px;letter-spacing:3px;
                  text-transform:uppercase;color:${ROSA};">
          Próximo lanzamiento
        </p>
        <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:38px;line-height:1.14;
                   font-weight:500;color:${CHOCOLATE};">
          ${escapeHtml(headline)}
        </h1>
        <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.8;color:#5C4A44;">
          ${escapeHtml(intro)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 20px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${units.map(cell).join("\n")}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 24px 8px;">
        <p style="margin:0;font-family:${SANS};font-size:11px;color:#8A7A73;">
          Al momento de este correo · abre el ${escapeHtml(launchDateLabel)}
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:20px 24px 4px;">
        ${button("Recuérdamelo en Google Calendar", googleCalendarUrl)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:10px 24px 8px;">
        <a href="${escapeHtml(icsUrl)}" style="font-family:${SANS};font-size:11px;
                  letter-spacing:0.5px;color:#8A7A73;text-decoration:underline;">
          ¿Usas Apple Calendar u Outlook? Descarga el evento aquí
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 24px 36px;">
        <a href="${escapeHtml(ctaUrl)}" style="font-family:${SANS};font-size:12px;
                  letter-spacing:1px;color:${ROSA};text-decoration:underline;">
          Ver el cronómetro en la página
        </a>
      </td>
    </tr>`;

  const text = [
    headline.toUpperCase(),
    "",
    intro,
    "",
    `Al momento de este correo: ${remaining.dias}d ${remaining.horas}h ${remaining.minutos}m ${remaining.segundos}s`,
    `Abre el ${launchDateLabel}.`,
    "",
    `Agregar a Google Calendar: ${googleCalendarUrl}`,
    `Descargar evento (.ics): ${icsUrl}`,
    `Ver el cronómetro: ${ctaUrl}`,
    "",
    "---",
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    html: shell({ preheader: intro, content, unsubscribeUrl }),
    text,
  };
}

/** Una prenda dentro del aviso de compra pagada. */
export type NotifiedOrderItem = {
  name: string;
  qty: number;
  size?: string;
  color?: string;
};

/**
 * Aviso de compra pagada — diseño fijo, sin IA. Lo dispara el webhook de
 * Wompi (`order-notify.ts`) apenas confirma un pago. Usa `adminShell`
 * (logo real, sin baja) porque es un correo para el dueño de la tienda,
 * no para el cliente que compró.
 */
export function renderOrderApprovedEmail(params: {
  reference: string;
  totalLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  shippingAddress: string;
  shippingCity: string;
  items: NotifiedOrderItem[];
}): { subject: string; html: string; text: string } {
  const {
    reference,
    totalLabel,
    customerName,
    customerEmail,
    customerPhone,
    customerDocument,
    shippingAddress,
    shippingCity,
    items,
  } = params;

  const itemLine = (item: NotifiedOrderItem) =>
    `${item.name} × ${item.qty}${item.size ? ` (talla ${item.size})` : ""}${
      item.color ? ` · ${item.color}` : ""
    }`;

  const itemsHtml = items.length
    ? items
        .map(
          (item) => `
      <tr>
        <td style="padding:6px 0;font-family:${SANS};font-size:14px;color:#5C4A44;border-bottom:1px solid ${MARFIL};">
          ${escapeHtml(itemLine(item))}
        </td>
      </tr>`,
        )
        .join("\n")
    : `<tr><td style="padding:6px 0;font-family:${SANS};font-size:14px;color:#8A7A73;">
         (sin detalle de productos)
       </td></tr>`;

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:7px 0;font-family:${SANS};font-size:13px;color:#8A7A73;width:38%;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:7px 0;font-family:${SANS};font-size:14px;color:${CHOCOLATE};font-weight:600;">
        ${escapeHtml(value)}
      </td>
    </tr>`;

  const content = `
    <tr>
      <td style="padding:28px 28px 8px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2.5px;
                  text-transform:uppercase;color:${TERRACOTA};">
          Nueva compra pagada
        </p>
        <h1 style="margin:0;font-family:${DISPLAY};font-size:32px;line-height:1.15;
                   font-weight:500;color:${CHOCOLATE};">
          ${escapeHtml(totalLabel)}
        </h1>
        <p style="margin:6px 0 0;font-family:${SANS};font-size:12px;color:#8A7A73;">
          Referencia ${escapeHtml(reference)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${detailRow("Cliente", customerName)}
          ${detailRow("Correo", customerEmail)}
          ${detailRow("Teléfono", customerPhone)}
          ${detailRow("Documento", customerDocument)}
          ${detailRow("Dirección", `${shippingAddress}, ${shippingCity}`)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 28px;">
        <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;letter-spacing:2px;
                  text-transform:uppercase;color:#8A7A73;border-top:1px solid ${MARFIL};padding-top:16px;">
          Productos
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsHtml}
        </table>
      </td>
    </tr>`;

  const text = [
    `NUEVA COMPRA PAGADA — ${reference}`,
    "",
    `Total: ${totalLabel}`,
    `Cliente: ${customerName}`,
    `Correo: ${customerEmail}`,
    `Teléfono: ${customerPhone}`,
    `Documento: ${customerDocument}`,
    `Dirección: ${shippingAddress}, ${shippingCity}`,
    "",
    "Productos:",
    ...(items.length ? items.map((i) => `- ${itemLine(i)}`) : ["(sin detalle de productos)"]),
  ].join("\n");

  return {
    subject: `Nueva compra: ${reference} (${totalLabel})`,
    html: adminShell({
      preheader: `${totalLabel} · ${customerName}`,
      content,
    }),
    text,
  };
}

/** Un pedido dentro de la tabla del reporte semanal. */
export type WeeklyReportOrderRow = {
  dateLabel: string;
  reference: string;
  status: string;
  totalLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
};

/**
 * Reporte semanal de ventas — diseño fijo. Lo dispara el cron de los
 * lunes (`weekly-report.ts`). Mismo `adminShell` que el aviso de
 * compra, para que los dos avisos internos se vean como parte del
 * mismo sistema.
 */
export function renderWeeklyReportEmail(params: {
  rangeLabel: string;
  orderCount: number;
  paidCount: number;
  revenueLabel: string;
  orders: WeeklyReportOrderRow[];
}): { subject: string; html: string; text: string } {
  const { rangeLabel, orderCount, paidCount, revenueLabel, orders } = params;

  const stat = (label: string, value: string) => `
    <td width="33%" align="center" style="padding:16px 6px;">
      <span style="display:block;font-family:${DISPLAY};font-size:26px;font-weight:500;color:${CHOCOLATE};">
        ${escapeHtml(value)}
      </span>
      <span style="display:block;margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:1.5px;
                  text-transform:uppercase;color:#8A7A73;">
        ${escapeHtml(label)}
      </span>
    </td>`;

  const orderRow = (order: WeeklyReportOrderRow) => `
    <tr>
      <td style="padding:8px 6px;font-family:${SANS};font-size:12px;color:#5C4A44;border-bottom:1px solid ${MARFIL};white-space:nowrap;">
        ${escapeHtml(order.dateLabel)}
      </td>
      <td style="padding:8px 6px;font-family:${SANS};font-size:12px;color:#5C4A44;border-bottom:1px solid ${MARFIL};">
        ${escapeHtml(order.reference)}
      </td>
      <td style="padding:8px 6px;font-family:${SANS};font-size:11px;font-weight:600;color:${TERRACOTA};border-bottom:1px solid ${MARFIL};white-space:nowrap;">
        ${escapeHtml(order.status)}
      </td>
      <td style="padding:8px 6px;font-family:${SANS};font-size:12px;font-weight:600;color:${CHOCOLATE};border-bottom:1px solid ${MARFIL};white-space:nowrap;">
        ${escapeHtml(order.totalLabel)}
      </td>
      <td style="padding:8px 6px;font-family:${SANS};font-size:12px;color:#5C4A44;border-bottom:1px solid ${MARFIL};">
        ${escapeHtml(order.customerName)}<br/>
        <span style="color:#8A7A73;font-size:11px;">${escapeHtml(order.customerEmail)} · ${escapeHtml(order.customerPhone)}</span>
      </td>
      <td style="padding:8px 6px;font-family:${SANS};font-size:12px;color:#5C4A44;border-bottom:1px solid ${MARFIL};white-space:nowrap;">
        ${escapeHtml(order.shippingCity)}
      </td>
    </tr>`;

  const tableRows = orders.length
    ? orders.map(orderRow).join("\n")
    : `<tr><td colspan="6" style="padding:16px 6px;font-family:${SANS};font-size:13px;color:#8A7A73;text-align:center;">
         Sin pedidos esta semana
       </td></tr>`;

  const content = `
    <tr>
      <td style="padding:28px 28px 4px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2.5px;
                  text-transform:uppercase;color:${TERRACOTA};">
          Reporte semanal
        </p>
        <h1 style="margin:0;font-family:${DISPLAY};font-size:30px;line-height:1.15;
                   font-weight:500;color:${CHOCOLATE};">
          ${escapeHtml(rangeLabel)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 22px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${MARFIL};border-radius:4px;">
          <tr>
            ${stat("Pedidos", String(orderCount))}
            ${stat("Pagados", String(paidCount))}
            ${stat("Ingresos", revenueLabel)}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px 28px;overflow-x:auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="min-width:520px;">
          <thead>
            <tr>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Fecha</th>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Referencia</th>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Estado</th>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Total</th>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Cliente</th>
              <th align="left" style="padding:0 6px 8px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8A7A73;border-bottom:2px solid ${NUDE};">Ciudad</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </td>
    </tr>`;

  const text = [
    `REPORTE SEMANAL YEI — ${rangeLabel}`,
    "",
    `Pedidos creados: ${orderCount}`,
    `Pedidos pagados: ${paidCount}`,
    `Ingresos (pagados): ${revenueLabel}`,
    "",
    "Fecha | Referencia | Estado | Total | Cliente | Correo | Teléfono | Ciudad",
    ...(orders.length
      ? orders.map(
          (o) =>
            `${o.dateLabel} | ${o.reference} | ${o.status} | ${o.totalLabel} | ${o.customerName} | ${o.customerEmail} | ${o.customerPhone} | ${o.shippingCity}`,
        )
      : ["(sin pedidos esta semana)"]),
  ].join("\n");

  return {
    subject: `Reporte semanal YEI (${orderCount} pedidos)`,
    html: adminShell({
      preheader: `${orderCount} pedidos · ${paidCount} pagados · ${revenueLabel}`,
      content,
    }),
    text,
  };
}
