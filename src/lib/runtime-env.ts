/**
 * Lectura de variables de entorno que funciona en los dos sitios donde
 * corre este código: Node (vite dev) y Cloudflare Workers (producción).
 *
 * El problema: en el preset `cloudflare-module` de Nitro las variables no
 * llegan por `process.env`. Llegan como segundo argumento del
 * `fetch(request, env, ctx)` del Worker. `process.env` puede existir y
 * estar vacío, o no existir del todo. Leer solo de ahí hace que en
 * producción falten los secretos y la pasarela se apague en silencio.
 *
 * Cómo se resuelve: `src/server.ts` guarda el `env` del Worker en cuanto
 * entra la primera petición, y todo el código del servidor lee desde
 * aquí. El orden es: primero el binding del Worker, luego `process.env`.
 *
 * SECURITY_RULES Regla 3: los secretos se leen únicamente en el
 * servidor. Este módulo no se debe importar desde componentes de
 * navegador; ninguna de estas variables lleva prefijo VITE_, así que
 * Vite no las incrusta en el bundle público.
 */

// El `env` del Worker es un objeto plano con las variables y bindings.
let workerEnv: Record<string, unknown> | null = null;

/**
 * Guarda el `env` que Cloudflare entrega en cada petición. Se llama una
 * vez, al inicio del fetch del Worker. Es idempotente y barato.
 */
export function rememberRuntimeEnv(env: unknown): void {
  if (env !== null && typeof env === "object") {
    workerEnv = env as Record<string, unknown>;
  }
}

// `process` puede no existir en el Worker. Se declara así, y no como
// global de Node, para no depender de @types/node en este archivo.
declare const process: { env?: Record<string, string | undefined> } | undefined;

function fromProcess(name: string): string | undefined {
  if (typeof process === "undefined" || !process || !process.env) {
    return undefined;
  }
  const value = process.env[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function fromWorker(name: string): string | undefined {
  const value = workerEnv?.[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** Valor de una variable de entorno, o `undefined` si no está puesta. */
export function readEnv(name: string): string | undefined {
  return fromWorker(name) ?? fromProcess(name);
}

/**
 * Igual que `readEnv`, pero además mira `import.meta.env`. Solo para
 * valores PÚBLICOS (los VITE_*), que Vite sí incrusta en el bundle.
 * Nunca se debe usar para un secreto.
 */
export function readPublicEnv(name: string): string | undefined {
  const direct = readEnv(name);
  if (direct) return direct;

  const meta = import.meta.env as Record<string, unknown> | undefined;
  const value = meta?.[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** `true` si todas las variables pedidas están configuradas. */
export function hasEnv(...names: string[]): boolean {
  return names.every((name) => readEnv(name) !== undefined);
}

/**
 * Binding del Worker que no es una variable de texto: un namespace de
 * KV, un Durable Object, una cola. `readEnv`/`readPublicEnv` solo
 * devuelven strings a propósito (así nunca se intenta usar un binding
 * como si fuera un secreto). Esto es lo mismo que `fromWorker`, pero
 * sin filtrar por `typeof === "string"`.
 *
 * `undefined` si no hay `env` guardado (por ejemplo en `vite dev`, o
 * antes de la primera petición) o si ese nombre no está enlazado.
 */
export function readBinding<T = unknown>(name: string): T | undefined {
  return workerEnv?.[name] as T | undefined;
}
