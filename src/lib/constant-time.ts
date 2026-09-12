/**
 * Comparación de cadenas en tiempo constante.
 *
 * SECURITY_RULES Regla 10: comparar secretos con `===` filtra
 * información. El operador corta en el primer carácter distinto, así que
 * el tiempo de respuesta revela cuántos caracteres se acertaron, y con
 * suficientes intentos un token se reconstruye carácter a carácter.
 *
 * Aquí no se usa `timingSafeEqual` de Node porque en Cloudflare Workers
 * no existe: el módulo `node:crypto` no está disponible en ese runtime.
 * Se acumula la diferencia con XOR sobre toda la longitud, sin salir
 * antes de tiempo.
 */

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  // La longitud sí se filtra —es inevitable comparando cadenas— pero se
  // recorre igualmente todo el bucle para que el tiempo no dependa de
  // en qué posición está la primera diferencia.
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);

  for (let i = 0; i < max; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

/** Token de una cabecera `Authorization: Bearer <token>`. */
export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
