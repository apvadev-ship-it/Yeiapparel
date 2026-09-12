import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readEnv, readPublicEnv } from "@/lib/runtime-env";

/**
 * Cliente de Supabase con clave de servicio, para el servidor.
 *
 * Se extrajo aquí porque ahora hay tres sitios que necesitan escribir sin
 * sesión de usuario: los pedidos, la deduplicación de eventos del webhook
 * y las devoluciones. Tener una sola fábrica evita que se abran tres
 * conexiones distintas y que la configuración se lea de tres maneras.
 *
 * SECURITY_RULES Regla 3: la clave de servicio salta la seguridad por
 * fila (RLS). Solo existe en el servidor y nunca lleva prefijo VITE_.
 * Si esta clave llegara al navegador, cualquiera podría leer y editar
 * todos los pedidos.
 */

let cached: SupabaseClient | null = null;

/** Cliente con clave de servicio. `null` si no está configurado. */
export function serviceClient(): SupabaseClient | null {
  if (cached) return cached;

  // La URL puede venir con o sin prefijo VITE_ (no es secreta). La clave
  // de servicio, jamás con prefijo.
  const url = readEnv("SUPABASE_URL") ?? readPublicEnv("VITE_SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    // A propósito NO se cachea el fallo. En el Worker las variables
    // aparecen cuando entra la primera petición: si aquí se guardara un
    // `null`, la base quedaría desconectada para siempre en ese aislado.
    return null;
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** `true` si hay base de datos configurada. */
export function serviceClientConfigured(): boolean {
  return serviceClient() !== null;
}
