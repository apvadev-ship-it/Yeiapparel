/**
 * Disponibilidad de los productos, leída de una hoja de cálculo de
 * Google Sheets.
 *
 * Por qué existe: el inventario lo lleva una persona del negocio, no un
 * programador. Una hoja de Google se edita desde el móvil, la puede
 * tocar cualquiera del equipo y no hace falta desplegar nada para que
 * un producto pase a "Agotado". Antes el dato vivía en una tabla de
 * Supabase que nunca se creó, así que la ficha siempre acababa usando
 * el número escrito a mano en `products.ts`.
 *
 * Cómo llega el dato hasta el navegador:
 *
 *   Google Sheets -> este módulo (servidor) -> /api/disponibilidad
 *                 -> useProductStock (navegador) -> ficha de producto
 *
 * La hoja NUNCA se lee desde el navegador. Va por el servidor por tres
 * razones: la clave de API (si se usa) no se publica, no hay problemas
 * de CORS, y una sola lectura cacheada sirve a todas las visitas en vez
 * de que cada visitante golpee a Google.
 *
 * Este módulo es solo de servidor: lee variables de entorno y no debe
 * importarse desde un componente de navegador.
 *
 * ---------------------------------------------------------------------
 * Qué se defiende aquí, y de qué
 *
 *  1. `/api/disponibilidad` es PÚBLICO. Solo salen slugs del catálogo y
 *     números. Nada de lo que diga la hoja se copia tal cual a la
 *     respuesta: una hoja de inventario suele llevar al lado columnas y
 *     filas que no son para publicar (costos, proveedores, notas).
 *  2. Los mensajes de error que salen a la calle son de una lista
 *     cerrada, escrita aquí. Nunca el texto de `fetch`, que lleva la
 *     URL dentro — y esa URL es el enlace a la hoja entera, con todas
 *     sus pestañas, o la clave de API.
 *  3. El destino de la petición es siempre docs.google.com o
 *     sheets.googleapis.com. El identificador se valida antes de
 *     meterlo en la URL, así que una variable mal puesta no puede
 *     apuntar el servidor a otro sitio.
 *  4. Una petición a la tienda no se convierte en una petición a
 *     Google: la caché, la lectura compartida y la espera tras un fallo
 *     hacen que el tráfico saliente no dependa del entrante.
 *  5. Lo que se lee está acotado en tamaño y en filas. Un Worker tiene
 *     la memoria y la CPU medidas, y una hoja enorme no debe tumbarlo.
 * ---------------------------------------------------------------------
 */

import { products } from "@/lib/products";
import { readEnv, readBinding } from "@/lib/runtime-env";
import {
  AVAILABILITY_PATH,
  variantKey,
  type AvailabilityMap,
  type AvailabilitySnapshot,
} from "@/lib/availability";

export { AVAILABILITY_PATH };

/** Segundos que se reutiliza una lectura antes de volver a Google. */
const DEFAULT_CACHE_SECONDS = 60;

/**
 * Suelo de la caché. No se puede poner a cero: sin caché, cada visita a
 * una ficha se convierte en una llamada a Google, y entonces cualquiera
 * puede usar la tienda para generar tráfico contra Google y quemar de
 * paso la CPU del Worker. Cinco segundos siguen siendo "casi en vivo".
 */
const MIN_CACHE_SECONDS = 5;
const MAX_CACHE_SECONDS = 3600;

/** Si Google no contesta en este tiempo, se sirve lo último bueno. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Tras un fallo se espera esto antes de volver a intentarlo. Sin esta
 * pausa, con Google caído cada petición reintentaría, que es justo
 * cuando menos conviene multiplicar el trabajo.
 */
const FAILURE_BACKOFF_MS = 15_000;

/** Tope de lo que se acepta descargar y parsear. */
const MAX_BODY_BYTES = 1_000_000;
const MAX_ROWS = 5000;

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------

/**
 * Acepta tanto el identificador suelto como la URL entera que sale de
 * la barra de direcciones. Es lo que de verdad va a pegar quien
 * configure esto, y equivocarse ahí deja la tienda sin inventario.
 */
function sheetSetting(): string | null {
  const raw = readEnv("GOOGLE_SHEET_URL") ?? readEnv("GOOGLE_SHEET_ID");
  const value = raw?.trim();
  return value ? value : null;
}

function apiKey(): string | null {
  const value = readEnv("GOOGLE_SHEETS_API_KEY")?.trim();
  return value ? value : null;
}

function cacheTtlMs(): number {
  const raw = readEnv("GOOGLE_SHEET_CACHE_SECONDS");
  const seconds = raw === undefined ? NaN : Number(raw);
  if (!Number.isFinite(seconds)) return DEFAULT_CACHE_SECONDS * 1000;
  const clamped = Math.min(
    Math.max(seconds, MIN_CACHE_SECONDS),
    MAX_CACHE_SECONDS,
  );
  return clamped * 1000;
}

/** Identificador de la pestaña, si viene en la URL o en el entorno. */
function tabGid(raw: string): string | null {
  const inUrl = raw.match(/[?#&]gid=([0-9]+)/);
  if (inUrl?.[1]) return inUrl[1];
  const fromEnv = readEnv("GOOGLE_SHEET_GID")?.trim();
  return fromEnv && /^[0-9]+$/.test(fromEnv) ? fromEnv : null;
}

type SheetSource = {
  url: string;
  /** `csv` para las URLs de docs.google.com, `api` para la API v4. */
  kind: "csv" | "api";
};

/**
 * Resultado de mirar la configuración. Se distingue "no hay hoja" de
 * "la hoja está mal puesta": lo primero es una tienda que todavía no la
 * usa, y lo segundo es un error que hay que ver.
 */
type Resolution =
  | { kind: "ok"; source: SheetSource }
  | { kind: "unconfigured" }
  | { kind: "invalid"; reason: string };

// Una hoja publicada en la web usa /d/e/<token>/pub, que NO es el mismo
// identificador que el de la URL normal. Se comprueba primero porque el
// patrón de abajo, más laxo, capturaría la "e" como identificador.
const PUBLISHED_RE = /\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/;
const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/**
 * Un identificador de Google Sheets solo tiene letras, dígitos, guion y
 * guion bajo. Se valida antes de construir la URL: es lo único que
 * viaja sin codificar dentro de la ruta, y una variable mal puesta no
 * debe poder llevar la petición a un sitio distinto del previsto.
 */
const SAFE_ID_RE = /^[A-Za-z0-9-_]+$/;

/**
 * Decide a qué URL se le pide la hoja. Hay tres formas de publicar un
 * Google Sheet y aquí se soportan las tres, porque cada persona llega
 * con la que le dio el buscador:
 *
 *  1. "Publicar en la web" (Archivo > Compartir > Publicar en la web).
 *  2. Clave de API de Google Cloud, si está configurada.
 *  3. Enlace normal con acceso "cualquiera con el enlace puede ver".
 *
 * Las tres piden que la hoja se pueda leer sin sesión. Eso está bien
 * aquí: el inventario ya es público, se ve en la ficha del producto.
 * Para una hoja privada de verdad haría falta una cuenta de servicio.
 *
 * El dominio de destino está escrito en el código y no sale nunca de la
 * configuración: aunque alguien ponga la URL de otro sitio, de ahí solo
 * se extrae el identificador y la petición sigue yendo a Google.
 */
function resolveSource(): Resolution {
  const raw = sheetSetting();
  if (!raw) return { kind: "unconfigured" };

  const gid = tabGid(raw);
  const tab = readEnv("GOOGLE_SHEET_NAME")?.trim();

  const published = raw.match(PUBLISHED_RE)?.[1];
  if (published) {
    const url = new URL(
      `https://docs.google.com/spreadsheets/d/e/${published}/pub`,
    );
    url.searchParams.set("output", "csv");
    url.searchParams.set("single", "true");
    if (gid) url.searchParams.set("gid", gid);
    return { kind: "ok", source: { url: url.toString(), kind: "csv" } };
  }

  const id = raw.match(SHEET_ID_RE)?.[1] ?? raw;
  if (!SAFE_ID_RE.test(id)) {
    return {
      kind: "invalid",
      reason:
        "La hoja configurada no es un enlace ni un identificador de Google Sheets.",
    };
  }

  const key = apiKey();
  if (key) {
    // Sin nombre de pestaña, "A:Z" se aplica a la primera hoja.
    const range = tab ? `${tab}!A:Z` : "A:Z";
    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        id,
      )}/values/${encodeURIComponent(range)}`,
    );
    url.searchParams.set("key", key);
    url.searchParams.set("majorDimension", "ROWS");
    return { kind: "ok", source: { url: url.toString(), kind: "api" } };
  }

  const url = new URL(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  if (tab) url.searchParams.set("sheet", tab);
  if (gid) url.searchParams.set("gid", gid);
  return { kind: "ok", source: { url: url.toString(), kind: "csv" } };
}

/** `true` si hay una hoja configurada y bien puesta. */
export function isSheetConfigured(): boolean {
  return resolveSource().kind === "ok";
}

// ---------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------

/**
 * Error cuyo mensaje se puede publicar. Todo lo demás —fallos de red,
 * JSON roto, lo que traiga `fetch`— sale como un mensaje genérico,
 * porque esos textos llevan la URL dentro: el enlace a la hoja
 * completa, o la clave de API.
 */
class SheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetError";
  }
}

/** Mensaje que puede ver cualquiera. Lista cerrada, escrita aquí. */
function publicError(error: unknown): string {
  if (error instanceof SheetError) return error.message;
  if (error instanceof Error && error.name === "AbortError") {
    return "Google Sheets tardó demasiado en responder.";
  }
  return "No se pudo contactar con Google Sheets.";
}

/**
 * Detalle para el registro del servidor, ya sin la clave de API. Esto
 * no sale nunca en una respuesta HTTP: se ve con `wrangler tail` o en
 * la terminal de desarrollo.
 */
function logDetail(error: unknown): string {
  const text =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const key = apiKey();
  return key ? text.split(key).join("***") : text;
}

// ---------------------------------------------------------------------
// Lectura y parseo
// ---------------------------------------------------------------------

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { accept: "text/csv, application/json;q=0.9, */*;q=0.1" },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * CSV según RFC 4180, que es lo que devuelve Google: comillas dobles
 * para los campos con comas o saltos de línea, y `""` para una comilla
 * literal. Se hace a mano —son treinta líneas— en vez de añadir una
 * dependencia al bundle del Worker.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Fuera las filas en blanco: la hoja siempre trae de sobra.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const DEMASIADO_GRANDE =
  "La hoja es demasiado grande para leerla entera. Deja el inventario en su propia pestaña.";

/**
 * Descarga el cuerpo sin pasar del tope.
 *
 * Se lee por trozos y se corta en cuanto se supera, en vez de pedir
 * `response.text()` y medir después: eso último ya habría metido la
 * hoja entera en la memoria del Worker, que es justo lo que se quiere
 * evitar. La cabecera `content-length` se mira primero porque ahorra
 * incluso empezar, pero no siempre viene.
 */
async function readBody(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new SheetError(DEMASIADO_GRANDE);
  }

  const stream = response.body;
  if (!stream) return "";

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      // Se le dice a Google que ya no interesa el resto.
      await reader.cancel();
      throw new SheetError(DEMASIADO_GRANDE);
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

async function readRows(source: SheetSource): Promise<string[][]> {
  const response = await fetchWithTimeout(source.url);

  if (!response.ok) {
    // Nunca se interpola la URL: lleva dentro el enlace a la hoja o la
    // clave de API, y este mensaje sí sale a la calle.
    const hint =
      response.status === 404
        ? "no existe o la pestaña indicada no está en ella"
        : response.status === 403 || response.status === 401
          ? "no es pública (compártela como «cualquiera con el enlace puede ver»)"
          : "no se pudo leer";
    throw new SheetError(`La hoja ${hint} (HTTP ${response.status}).`);
  }

  const body = await readBody(response);
  let rows: string[][];

  if (source.kind === "api") {
    let payload: { values?: unknown };
    try {
      payload = JSON.parse(body) as { values?: unknown };
    } catch {
      throw new SheetError("Google devolvió una respuesta que no se entiende.");
    }
    if (!Array.isArray(payload.values)) return [];
    rows = payload.values.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [],
    );
  } else {
    // Cuando el enlace no es público, Google responde 200 con una
    // página de login en HTML. Sin esta comprobación se parsearía como
    // CSV y saldría un inventario vacío, que es peor que un error.
    if (/^\s*</.test(body)) {
      throw new SheetError(
        "Google devolvió una página en vez de la hoja: seguramente no es pública.",
      );
    }
    rows = parseCsv(body);
  }

  if (rows.length > MAX_ROWS) {
    console.warn(
      `[disponibilidad] la hoja trae ${rows.length} filas; se leen las primeras ${MAX_ROWS}.`,
    );
    return rows.slice(0, MAX_ROWS);
  }
  return rows;
}

// ---------------------------------------------------------------------
// De filas de la hoja a inventario
// ---------------------------------------------------------------------

/** Minúsculas y sin tildes, para comparar cabeceras y nombres. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const SLUG_HEADERS = [
  "slug",
  "producto",
  "prenda",
  "id",
  "codigo",
  "referencia",
  "nombre",
];
const STOCK_HEADERS = [
  "stock",
  "inventario",
  "cantidad",
  "unidades",
  "existencias",
  "disponibles",
];
const FLAG_HEADERS = ["disponible", "activo", "estado", "publicado", "visible"];
const SIZE_HEADERS = ["talla", "size", "talle"];
const COLOR_HEADERS = ["color", "colour"];

const NO_VALUES = ["no", "false", "0", "agotado", "inactivo", "oculto", "off"];
const YES_VALUES = [
  "si",
  "sí",
  "true",
  "1",
  "activo",
  "disponible",
  "publicado",
  "visible",
  "on",
];

/**
 * `true` solo cuando la celda dice claramente que sí; `false` para un
 * "no" reconocido O para cualquier texto ambiguo. Antes solo "no" y
 * variantes bajaban el producto, y todo lo demás —incluido un typo en
 * la hoja— se leía como disponible. Un error en la fuente de verdad no
 * puede terminar mostrando como comprable algo que no lo es: fallar
 * hacia "no disponible" es el lado seguro.
 */
function parseFlag(value: string): boolean | null {
  const text = normalize(value);
  if (text === "") return null;
  if (YES_VALUES.includes(text)) return true;
  if (NO_VALUES.includes(text)) return false;
  return false;
}

/**
 * "12", "12 unidades" y "1.000" son todos números para quien escribe la
 * hoja. Se queda con los dígitos y descarta lo demás.
 */
function parseCount(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const count = Number(digits);
  return Number.isFinite(count) ? count : null;
}

function findColumn(header: string[], names: string[]): number {
  return header.findIndex((cell) => names.includes(normalize(cell)));
}

/**
 * Índice de "cómo lo escriba la hoja" -> slug real del catálogo.
 *
 * Se acepta el slug y también el nombre visible, porque en esta tienda
 * no se parecen en nada (el slug `vestido-satin-eterno` es la pieza
 * "Besties negro"). Obligar a escribir el slug sería garantizar que la
 * hoja se llene mal.
 *
 * Que el catálogo mande tiene además un efecto de seguridad: la
 * respuesta pública solo puede contener slugs que ya existen en el
 * código. Nada que alguien escriba en la hoja llega a publicarse.
 */
function catalogIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const product of products) {
    index.set(normalize(product.slug), product.slug);
    index.set(normalize(product.name), product.slug);
  }
  return index;
}

type ParsedSheet = {
  stock: AvailabilityMap;
  /** Nombres de la hoja que no son de ningún producto. Solo para el log. */
  unknown: string[];
};

/**
 * Convierte las filas en inventario.
 *
 * Reglas, en este orden:
 *  - si la columna de disponibilidad dice que no, son 0 unidades;
 *  - si hay número de stock, ese es el valor;
 *  - si no hay ninguno de los dos, la fila se ignora y el producto se
 *    queda con su valor de respaldo. Ignorar es más seguro que asumir
 *    cero: una celda vacía no debería agotar una pieza.
 *
 * Talla y color son opcionales. Si la hoja trae esas columnas, cada
 * fila describe una variante concreta (por ejemplo "Nala, M, Negro")
 * y se guarda bajo su propia clave (`variantKey`), así una talla puede
 * agotarse sin afectar a las demás. Una fila sin talla ni color sigue
 * funcionando como antes: stock a nivel de producto.
 */
export function rowsToAvailability(rows: string[][]): ParsedSheet {
  const stock: AvailabilityMap = Object.create(null) as AvailabilityMap;
  const unknown: string[] = [];
  if (rows.length === 0) return { stock, unknown };

  const header = rows[0] ?? [];
  let slugCol = findColumn(header, SLUG_HEADERS);
  let stockCol = findColumn(header, STOCK_HEADERS);
  let flagCol = findColumn(header, FLAG_HEADERS);
  let sizeCol = findColumn(header, SIZE_HEADERS);
  let colorCol = findColumn(header, COLOR_HEADERS);

  // Sin cabecera reconocible se asume el orden natural: producto en la
  // primera columna, cantidad en la segunda, y la primera fila también
  // cuenta como dato.
  const hasHeader = slugCol >= 0 && (stockCol >= 0 || flagCol >= 0);
  if (!hasHeader) {
    slugCol = 0;
    stockCol = 1;
    flagCol = -1;
    sizeCol = -1;
    colorCol = -1;
  }

  const catalog = catalogIndex();
  const body = hasHeader ? rows.slice(1) : rows;

  for (const row of body) {
    const key = (row[slugCol] ?? "").trim();
    if (key === "") continue;

    const slug = catalog.get(normalize(key));
    if (!slug) {
      // Recortado: esto va al registro del servidor, y una celda puede
      // traer un párrafo entero.
      unknown.push(key.slice(0, 60));
      continue;
    }

    const size = sizeCol >= 0 ? (row[sizeCol] ?? "").trim() : "";
    const color = colorCol >= 0 ? (row[colorCol] ?? "").trim() : "";
    const entryKey = variantKey(slug, size || undefined, color || undefined);

    const flag = flagCol >= 0 ? parseFlag(row[flagCol] ?? "") : null;
    if (flag === false) {
      stock[entryKey] = 0;
      continue;
    }

    const count = stockCol >= 0 ? parseCount(row[stockCol] ?? "") : null;
    if (count !== null) stock[entryKey] = Math.max(0, count);
  }

  return { stock, unknown };
}

// ---------------------------------------------------------------------
// Caché y snapshot
// ---------------------------------------------------------------------

type CacheEntry = {
  stock: AvailabilityMap;
  unknownCount: number;
  fetchedAt: number;
  updatedAt: string;
};

/**
 * Subconjunto de la API de KV de Cloudflare que se usa aquí. Se declara
 * a mano en vez de traer `@cloudflare/workers-types` para no acoplar
 * este archivo a un paquete de tipos que solo aplica en producción.
 */
type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
};

/** Nombre del binding esperado en `wrangler.toml` / la config del Worker. */
const KV_BINDING_NAME = "AVAILABILITY_KV";
const KV_KEY = "availability:v1";
/**
 * KV no admite "para siempre": se pone un TTL generoso. Si nadie
 * refresca antes, se recalcula igual desde `getAvailability`.
 */
const KV_TTL_SECONDS = 3600;

function kv(): KVNamespace | undefined {
  return readBinding<KVNamespace>(KV_BINDING_NAME);
}

/**
 * Caché compartida entre isolates, en KV, cuando el binding
 * `AVAILABILITY_KV` está configurado (ver `wrangler.toml`). Sin ese
 * binding —desarrollo local, o producción sin configurarlo todavía—
 * esta capa simplemente no hace nada y todo sigue funcionando como
 * antes, con la caché en memoria de más abajo.
 */
async function readFromKv(): Promise<CacheEntry | null> {
  const store = kv();
  if (!store) return null;
  try {
    const raw = await store.get(KV_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch (error) {
    console.warn("[disponibilidad] no se pudo leer KV:", error);
    return null;
  }
}

async function writeToKv(entry: CacheEntry): Promise<void> {
  const store = kv();
  if (!store) return;
  try {
    await store.put(KV_KEY, JSON.stringify(entry), {
      expirationTtl: KV_TTL_SECONDS,
    });
  } catch (error) {
    // KV caído no debe tumbar la lectura de disponibilidad: se sigue
    // sirviendo desde memoria, solo deja de compartirse con otros
    // isolates hasta que KV vuelva.
    console.warn("[disponibilidad] no se pudo escribir en KV:", error);
  }
}

/**
 * LÍMITE CONOCIDO si no hay KV configurado (igual que en
 * `rate-limit.ts`): esta caché vive en la memoria del isolate.
 * Cloudflare levanta varios y los recicla, así que la hoja se leerá
 * algo más a menudo que una vez por minuto, y dos isolates pueden
 * mostrar disponibilidad distinta hasta por un minuto. Con
 * `AVAILABILITY_KV` enlazado, `getAvailability` primero revisa KV antes
 * de volver a llamar a Google, así que ese margen baja a la latencia de
 * una lectura de KV en vez de al TTL completo.
 */
let cached: CacheEntry | null = null;
/** Lectura en curso, para que diez visitas a la vez no sean diez fetch. */
let inFlight: Promise<CacheEntry> | null = null;
/** Hasta cuándo no se vuelve a molestar a Google después de un fallo. */
let retryAfter = 0;
/** Último fallo, para poder seguir explicándolo mientras se espera. */
let lastError: string | null = null;

/**
 * Tira la lectura guardada para que la siguiente consulta vuelva a la
 * hoja. Se llama después de descontar una venta: sin esto, la ficha
 * seguiría mostrando el número anterior hasta un minuto, justo en el
 * momento en que más importa que baje.
 *
 * Limpia la memoria de ESTE isolate y, si hay KV, también la copia
 * compartida: así el resto de isolates deja de servir el número viejo
 * en su siguiente lectura, en vez de esperar el TTL completo.
 */
export function invalidateAvailabilityCache(): void {
  cached = null;
  const store = kv();
  if (store) {
    store.delete(KV_KEY).catch((error) => {
      console.warn("[disponibilidad] no se pudo invalidar KV:", error);
    });
  }
}

async function readSheet(source: SheetSource): Promise<CacheEntry> {
  const rows = await readRows(source);
  const parsed = rowsToAvailability(rows);
  const now = Date.now();

  if (parsed.unknown.length > 0) {
    // Al registro del servidor, no a la respuesta: en esas celdas puede
    // haber cualquier cosa que alguien apuntara en la hoja. Se quitan
    // saltos de línea y caracteres de control antes de loguear: un
    // texto pegado sin querer en la hoja no debe poder forjar líneas de
    // registro que parezcan otra entrada.
    // eslint-disable-next-line no-control-regex -- a propósito, para quitar caracteres de control de la hoja
    const sanitize = (s: string) => s.replace(/[\r\n\x00-\x1f]/g, " ");
    console.warn(
      `[disponibilidad] ${parsed.unknown.length} fila(s) de la hoja no coinciden con ningún producto:`,
      parsed.unknown.slice(0, 20).map(sanitize).join(" | "),
    );
  }

  return {
    stock: parsed.stock,
    unknownCount: parsed.unknown.length,
    fetchedAt: now,
    updatedAt: new Date(now).toISOString(),
  };
}

function snapshotFrom(
  entry: CacheEntry,
  source: AvailabilitySnapshot["source"],
  error: string | null,
): AvailabilitySnapshot {
  return {
    stock: { ...entry.stock },
    updatedAt: entry.updatedAt,
    source,
    unknownCount: entry.unknownCount,
    error,
  };
}

function emptySnapshot(
  source: AvailabilitySnapshot["source"],
  error: string | null,
): AvailabilitySnapshot {
  return { stock: {}, updatedAt: null, source, unknownCount: 0, error };
}

/**
 * Inventario de toda la tienda. Nunca lanza: si la hoja falla devuelve
 * la última lectura buena, y si tampoco la hay devuelve un mapa vacío,
 * con lo que cada producto se queda con su valor de respaldo. Un fallo
 * de Google no debe tumbar la ficha de producto.
 */
export async function getAvailability(): Promise<AvailabilitySnapshot> {
  const resolved = resolveSource();
  if (resolved.kind === "unconfigured") {
    return emptySnapshot("unconfigured", null);
  }
  if (resolved.kind === "invalid") {
    return emptySnapshot("error", resolved.reason);
  }

  let now = Date.now();

  if (cached && now - cached.fetchedAt < cacheTtlMs()) {
    return snapshotFrom(cached, "cache", null);
  }

  // Antes de llamar a Google, se pregunta a KV: si otro isolate ya
  // refrescó la hoja hace poco, se reusa esa lectura en vez de hacer
  // otra. Sin binding de KV, `readFromKv` devuelve `null` de inmediato
  // y el comportamiento es idéntico al de antes.
  const fromKv = await readFromKv();
  if (fromKv && now - fromKv.fetchedAt < cacheTtlMs()) {
    cached = fromKv;
    return snapshotFrom(fromKv, "cache", null);
  }

  // Google acaba de fallar: se sirve lo que haya sin volver a llamar.
  now = Date.now();
  if (now < retryAfter) {
    const fallback = cached ?? fromKv;
    return fallback
      ? snapshotFrom(fallback, "stale", lastError)
      : emptySnapshot("error", lastError);
  }

  if (!inFlight) {
    inFlight = readSheet(resolved.source).finally(() => {
      inFlight = null;
    });
  }

  try {
    const fresh = await inFlight;
    cached = fresh;
    retryAfter = 0;
    lastError = null;
    await writeToKv(fresh);
    return snapshotFrom(fresh, "sheet", null);
  } catch (error) {
    console.error(
      "[disponibilidad] no se pudo leer la hoja:",
      logDetail(error),
    );
    lastError = publicError(error);
    retryAfter = Date.now() + FAILURE_BACKOFF_MS;

    const fallback = cached ?? fromKv;
    if (fallback) return snapshotFrom(fallback, "stale", lastError);
    return emptySnapshot("error", lastError);
  }
}

// ---------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------

/**
 * GET /api/disponibilidad
 *
 * Devuelve el inventario de toda la tienda de una vez, no producto a
 * producto: la ficha necesita uno, pero la portada y la tienda muestran
 * varios, y una sola respuesta cacheable sirve para todos.
 *
 * Es público a propósito, y solo lleva lo que ya se ve en la ficha:
 * slugs del catálogo y unidades.
 */
export async function handleAvailabilityRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        allow: "GET, HEAD",
      },
    });
  }

  const snapshot = await getAvailability();

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Medio minuto en el navegador: suficiente para no repetir la
      // llamada al navegar entre fichas, y poco para que un cambio en
      // la hoja se vea enseguida.
      "cache-control": "public, max-age=30",
    },
  });
}
