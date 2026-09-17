/**
 * Cabeceras de seguridad, aplicadas en el Worker sobre cada respuesta.
 *
 * Por qué aquí y no en `public/_headers`: ese archivo es sintaxis de
 * Cloudflare Pages y solo alcanza a lo que sirve el binding de assets.
 * Las páginas de esta tienda las genera el Worker por SSR, así que
 * nunca pasaban por ahí y salían sin ninguna cabecera. Se comprobó con
 * una petición real: la respuesta solo traía `vary` y `content-type`.
 * Poniéndolas en el código del Worker aplican siempre, en desarrollo y
 * en producción, sin depender del proveedor de hosting.
 *
 * SECURITY_RULES Regla 11: la página de pago recoge datos personales
 * (nombre, documento, dirección). La CSP es lo que impide que un script
 * ajeno inyectado en la página los lea y los mande fuera — el patrón
 * Magecart. `payment-page-scripts.json` es el inventario que pide PCI
 * DSS 6.4.3; esto es la parte que lo hace cumplir.
 */

import { readEnv, readPublicEnv } from "@/lib/runtime-env";

/**
 * Orígenes de terceros que la tienda necesita de verdad. Cada uno está
 * aquí porque algo se rompe sin él; no se añaden "por si acaso".
 */
const WOMPI_CHECKOUT = "https://checkout.wompi.co";
const WOMPI_API = ["https://production.wompi.co", "https://sandbox.wompi.co"];
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";
/**
 * Beacon de Cloudflare Web Analytics/Speed: si está activado en el panel
 * del dominio, Cloudflare lo inyecta solo en cada respuesta HTML. No lo
 * pide el código de la app, así que sin este origen el propio proxy que
 * sirve la página queda bloqueando su propio script.
 */
const CLOUDFLARE_INSIGHTS = "https://static.cloudflareinsights.com";
/**
 * Los mismos orígenes sirven imágenes y vídeo. `media-src` va aparte:
 * no hereda de `img-src`, y sin declararlo los vídeos de la portada y de
 * las fichas de producto se quedaban en negro contra `default-src`.
 */
const MEDIA_HOSTS = [
  "https://imagedelivery.net",
  "https://grainy-gradients.vercel.app",
  // Portadas de los videos de TikTok (instagram-sync.ts / tiktok-sync.ts):
  // las URL firmadas que trae la API vienen de subdominios que cambian
  // (p16-, p19-, ...), de ahí el comodín en vez de un host fijo.
  "https://*.tiktokcdn.com",
  "https://*.tiktokcdn-us.com",
  "https://*.tiktokv.com",
  // Publicaciones de Instagram: mismo motivo, el subdominio de scontent
  // varía por región (scontent-bog1-1.cdninstagram.com, etc).
  "https://*.cdninstagram.com",
  "https://*.fbcdn.net",
  // Behold (behold.so) re-aloja las imágenes del feed de Instagram en
  // su propio CDN para que no dependan de la URL firmada (y con
  // vencimiento) que da Instagram. El dominio pelado (behold.pictures)
  // sirve las fotos de cada post; los subdominios (cdn2., hop., ...)
  // se usan para el avatar y otras variantes — de ahí las dos formas.
  "https://behold.pictures",
  "https://*.behold.pictures",
];

/**
 * El origen de Supabase sale de la configuración, no de una constante:
 * cada proyecto tiene el suyo. Si no está puesto, se omite en vez de
 * abrir `connect-src` a cualquier destino.
 */
function supabaseOrigin(): string | null {
  const raw =
    readPublicEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL") ?? "";
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Construye la Content-Security-Policy.
 *
 * Sobre `'unsafe-inline'` en `script-src`: TanStack Start emite scripts
 * en línea para hidratar el HTML transmitido (`<script class="$tsr">`) y
 * para el JSON-LD. Sin nonce por parte del framework, quitarlo deja la
 * página en blanco. Lo que sí se consigue —y es la mitad que importa
 * frente a Magecart— es que NO se pueda cargar un script desde un
 * dominio que no esté en esta lista. Cerrar el hueco de lo inline
 * requiere soporte de nonces en TanStack Start.
 */
function buildCsp(isDev: boolean): string {
  const supabase = supabaseOrigin();

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    WOMPI_CHECKOUT,
    CLOUDFLARE_INSIGHTS,
  ];
  const connectSrc = ["'self'", ...WOMPI_API];
  if (supabase) connectSrc.push(supabase);

  if (isDev) {
    // Vite necesita eval para el recambio en caliente y un websocket
    // para avisar de los cambios. Nada de esto llega a producción.
    scriptSrc.push("'unsafe-eval'", "blob:");
    connectSrc.push("ws:", "wss:", "http://localhost:*");
  }

  const directives: Record<string, string[] | null> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    // Nadie puede incrustar esta tienda en un iframe ajeno.
    "frame-ancestors": ["'none'"],
    // El checkout por redirección envía un formulario a Wompi: sin este
    // destino, el pago deja de funcionar.
    "form-action": ["'self'", WOMPI_CHECKOUT],
    // El widget de Wompi se abre como iframe encima de la página. El
    // reproductor de TikTok, igual: el modal de una publicación embebe
    // el video real con el player oficial de TikTok (tiktok-sync.ts
    // guarda esa URL como `video_url`).
    "frame-src": [WOMPI_CHECKOUT, "https://www.tiktok.com"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
    "font-src": ["'self'", GOOGLE_FONTS_FILES, "data:"],
    // El propio Supabase (Storage): ahí es donde tiktok-sync.ts guarda
    // su copia de cada portada de TikTok (ver COVERS_BUCKET), para que
    // no dependan de la URL firmada y con vencimiento que da TikTok.
    "img-src": ["'self'", "data:", "blob:", ...MEDIA_HOSTS, ...(supabase ? [supabase] : [])],
    "media-src": ["'self'", "data:", "blob:", ...MEDIA_HOSTS, ...(supabase ? [supabase] : [])],
    "connect-src": connectSrc,
    // En producción, cualquier recurso pedido por http se sube a https.
    "upgrade-insecure-requests": isDev ? null : [],
  };

  return Object.entries(directives)
    .filter(([, values]) => values !== null)
    .map(([name, values]) =>
      values && values.length ? `${name} ${values.join(" ")}` : name,
    )
    .join("; ");
}

/** Cabeceras que se ponen en toda respuesta, sea HTML o no. */
function baseHeaders(isDev: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    // El navegador respeta el tipo declarado y no adivina que un archivo
    // subido es JavaScript.
    "X-Content-Type-Options": "nosniff",
    // No filtra la URL completa a sitios externos como Instagram.
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  // HSTS solo tiene sentido sobre https; en local haría que el navegador
  // se negara a abrir http://localhost durante un año.
  if (!isDev) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
  }

  return headers;
}

/** Cabeceras que solo aplican a documentos HTML. */
function documentHeaders(isDev: boolean): Record<string, string> {
  return {
    "Content-Security-Policy": buildCsp(isDev),
    // Duplica `frame-ancestors` para navegadores viejos que no leen CSP.
    "X-Frame-Options": "DENY",
    // La tienda no necesita cámara, micrófono ni ubicación. `payment` se
    // deja habilitado: apagarlo bloquea la Payment Request API, que es
    // por donde el widget ofrece las billeteras del navegador.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

const isDevBuild = Boolean(import.meta.env?.DEV);

/**
 * Devuelve la misma respuesta con las cabeceras de seguridad puestas.
 *
 * No pisa una cabecera que la respuesta ya traiga: si algún endpoint
 * necesita una política propia, la suya manda.
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  const isHtml = (headers.get("content-type") ?? "").includes("text/html");
  const toApply = {
    ...baseHeaders(isDevBuild),
    ...(isHtml ? documentHeaders(isDevBuild) : {}),
  };

  for (const [name, value] of Object.entries(toApply)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  // `body` de una respuesta ya construida se puede reusar mientras no se
  // haya leído. Aquí nadie la ha leído todavía.
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
