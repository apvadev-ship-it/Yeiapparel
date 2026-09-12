/**
 * Límite de peticiones por IP, en ventana deslizante.
 *
 * Qué problema resuelve: sin esto, cualquiera puede llamar al checkout en
 * bucle y crear filas `PENDING` sin fin en Supabase. No roba dinero, pero
 * infla la base, cuesta, y esconde los pedidos reales entre basura.
 *
 * LÍMITE CONOCIDO, dicho sin adornos: el contador vive en la memoria del
 * isolate. Cloudflare levanta varios isolates por región, así que un
 * atacante repartido entre muchas conexiones ve un límite más alto que el
 * nominal, y un isolate reciclado empieza de cero. Esto frena el abuso
 * ingenuo desde una sola fuente, que es el caso común.
 *
 * La defensa duradera es una regla de rate limiting en el borde de
 * Cloudflare (Security > WAF > Rate limiting rules), que sí es global y
 * no consume tiempo del Worker. Esto no la reemplaza: la acompaña, y
 * cubre también el desarrollo local, donde no hay borde ninguno.
 */

type Bucket = {
  /** Marcas de tiempo (ms) de las peticiones dentro de la ventana. */
  hits: number[];
};

const buckets = new Map<string, Bucket>();

/**
 * Tope de entradas del mapa. Sin esto, un atacante que rota IPs haría
 * crecer la memoria del isolate hasta tumbarlo — el propio antídoto
 * convertido en el problema.
 */
const MAX_TRACKED_CLIENTS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  /** Segundos que debe esperar quien se pasó del límite. */
  retryAfterSeconds: number;
};

/**
 * Identifica al cliente. En Cloudflare la IP real llega en
 * `CF-Connecting-IP`; las otras cabeceras son las de un proxy delante.
 *
 * `x-forwarded-for` lo puede falsificar el cliente, así que solo se usa
 * cuando no hay cabecera de Cloudflare (desarrollo local). Eso es
 * aceptable aquí: en local no hay a quién defenderse.
 */
function clientKey(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();

  return "local";
}

/**
 * Registra una petición y dice si se permite.
 *
 * El contador se lleva por (cliente, ámbito), no solo por cliente. Lo
 * descubrí probando: con un único contador compartido, las rutas de
 * límite bajo se quedaban sin cupo por el tráfico de las de límite alto
 * —cargar unas páginas dejaba el endpoint de campañas dando 429 antes de
 * atender ninguna—. Cada ruta cuenta lo suyo.
 *
 * @param scope    nombre de la ruta o familia de rutas
 * @param limit    peticiones permitidas por ventana
 * @param windowMs tamaño de la ventana en milisegundos
 */
export function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const key = `${scope}:${clientKey(request)}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Si el mapa se desbordó, se vacía entero. Es tosco, pero es acotado y
  // predecible: prefiero perder el historial a quedarme sin memoria.
  if (buckets.size > MAX_TRACKED_CLIENTS) buckets.clear();

  const bucket = buckets.get(key) ?? { hits: [] };
  // Fuera lo que ya salió de la ventana.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0] ?? now;
    const waitMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Respuesta estándar cuando alguien se pasa del límite. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: "Demasiadas peticiones. Espera un momento y vuelve a intentarlo.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}
