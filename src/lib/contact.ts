/**
 * Mensajes del formulario de contacto.
 *
 * Qué cambió y por qué: antes el formulario insertaba en Supabase DESDE
 * EL NAVEGADOR con la clave anónima, sin validación de servidor y sin
 * límite de peticiones (más allá de RLS, que en ese momento tampoco
 * filtraba nada). Cualquiera podía escribir en `contact_messages` sin
 * pasar por la web, con el tamaño y el contenido que quisiera. Ahora el
 * alta ocurre en el servidor, con la clave de servicio, validada con
 * Zod, y con el mismo límite de 20 POST/min por IP que ya protege al
 * resto de las funciones de servidor (`src/server.ts`).
 *
 * Además del registro en Supabase, se manda un aviso automático por
 * Telegram y/o correo (`src/lib/contact-notify.ts`) — sin que nadie
 * tenga que confirmar nada del otro lado, a diferencia del enlace
 * `wa.me` que usan el botón flotante y el pie de página.
 *
 * SECURITY_RULES Regla 11: se piden los datos mínimos para poder
 * responder — nombre y un medio de contacto — nada más. Por lo mismo,
 * los `console.error` de este archivo y de `contact-notify.ts` nunca
 * incluyen `contactValue` (el correo o teléfono de quien escribe): solo
 * el motivo técnico del fallo, igual que en `newsletter.ts`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase-server";
import { notifyNewContactMessage } from "@/lib/contact-notify";

const TOPIC_LABELS: Record<string, string> = {
  comprar: "Quiero comprar",
  pedido: "Tengo un pedido",
  otro: "Otra consulta",
};

const textField = (max: number) => z.string().trim().min(1).max(max);

const contactSchema = z.object({
  name: textField(120),
  contactMethod: z.enum(["email", "telefono"]),
  contactValue: textField(150),
  topic: z.enum(["comprar", "pedido", "otro"]),
  subtopic: textField(120),
  message: textField(1000),
});

export type ContactResult = {
  ok: boolean;
  notice?: string;
};

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }): Promise<ContactResult> => {
    // El registro en Supabase y el aviso por Telegram/correo son dos
    // canales independientes: uno no debe bloquear al otro. Antes, si
    // Supabase no estaba configurado, el aviso ni se intentaba — y
    // Telegram/correo es, hoy, el canal que de verdad garantiza que
    // alguien se entera. Se intentan los dos siempre; el resultado
    // depende de si AL MENOS UNO funcionó.
    const db = serviceClient();
    let saved = false;

    if (db) {
      const { error } = await db.from("contact_messages").insert({
        name: data.name,
        contact_method: data.contactMethod,
        contact_value: data.contactValue,
        topic: data.topic,
        subtopic: data.subtopic,
        message: data.message,
      });
      if (error) {
        console.error(`[contacto] no se pudo guardar: ${error.message}`);
      } else {
        saved = true;
      }
    } else {
      console.error(
        "[contacto] sin Supabase configurado; sin registro interno",
      );
    }

    const notified = await notifyNewContactMessage({
      name: data.name,
      contactMethod: data.contactMethod,
      contactValue: data.contactValue,
      topicLabel: TOPIC_LABELS[data.topic] ?? data.topic,
      subtopic: data.subtopic,
      message: data.message,
    });

    if (!saved && !notified.telegram && !notified.email) {
      // Ninguno de los tres canales funcionó: el mensaje se perdió de
      // verdad, y hay que decírselo a quien lo mandó.
      console.error(
        "[contacto] sin Supabase, Telegram ni correo configurados o funcionando; mensaje perdido",
      );
      return {
        ok: false,
        notice: "No pudimos enviar tu mensaje. Inténtalo de nuevo.",
      };
    }

    return { ok: true };
  });
