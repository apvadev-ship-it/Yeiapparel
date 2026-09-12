/**
 * Aviso automático de catálogo: corre solo, una vez al día, sin que
 * nadie tenga que llamar a ningún endpoint.
 *
 * Por qué existe: el catálogo es código (`products.ts`), no una base
 * de datos — no hay ningún evento que dispare "se guardó un cambio"
 * en el momento en que alguien edita el archivo y despliega. Lo más
 * cercano a "automático" que existe aquí es revisar el catálogo cada
 * cierto tiempo y comparar contra lo último que se avisó. Por eso una
 * tarea programada de Cloudflare (ver `wrangler.toml`, sección
 * `[triggers]`) llama a `checkForCatalogUpdates` una vez al día — la
 * conecta `src/server.ts`, en el `scheduled()` del Worker.
 *
 * Qué cuenta como "actualización" (por decisión del dueño de la
 * tienda): una prenda con un slug que nunca se había visto, o una
 * prenda ya conocida cuyo precio cambió. Cambiar solo la descripción,
 * las fotos o las tallas de una prenda que ya existía NO dispara
 * correo — solo lo que afecta el precio o la existencia de la pieza.
 *
 * `catalog_snapshot` (`supabase/migrations/0007_catalog_snapshot.sql`)
 * es la "última foto" del catálogo que ya se avisó. Se actualiza al
 * final de cada revisión, haya habido cambios o no.
 */

import { serviceClient } from "@/lib/supabase-server";
import { products } from "@/lib/products";
import { sendCatalogAnnouncement } from "@/lib/newsletter-announcement";

type SnapshotRow = { slug: string; price: number };

export type CatalogWatchResult =
  | { ran: false; reason: string }
  | {
      ran: true;
      newSlugs: string[];
      priceChangedSlugs: string[];
      announced: boolean;
      sent?: number;
      failed?: number;
    };

/**
 * Compara el catálogo actual contra la última versión conocida.
 * Si hay prendas nuevas o precios distintos, manda el anuncio y
 * actualiza la foto guardada. Si no hay nada nuevo, no hace nada más
 * que devolver el resultado — no manda un correo vacío ni reintenta.
 */
export async function checkForCatalogUpdates(): Promise<CatalogWatchResult> {
  const db = serviceClient();
  if (!db) return { ran: false, reason: "Base de datos no configurada." };

  const { data, error } = await db
    .from("catalog_snapshot")
    .select("slug, price");

  if (error) {
    console.error("[catalogo] no se pudo leer la última foto:", error.message);
    return { ran: false, reason: error.message };
  }

  const previous = new Map<string, number>(
    ((data ?? []) as SnapshotRow[]).map((row) => [row.slug, row.price]),
  );

  const newSlugs: string[] = [];
  const priceChangedSlugs: string[] = [];

  for (const product of products) {
    const knownPrice = previous.get(product.slug);
    if (knownPrice === undefined) {
      newSlugs.push(product.slug);
    } else if (knownPrice !== product.price) {
      priceChangedSlugs.push(product.slug);
    }
  }

  const changedSlugs = [...newSlugs, ...priceChangedSlugs];

  // La foto se pone al día SIEMPRE, haya habido aviso o no — incluso
  // si el correo falla más abajo. Reintentar un correo fallido cada
  // día para siempre sería peor que perder ese aviso puntual: seguir
  // escribiendo "hay novedades" siete días seguidos por el mismo
  // cambio es justo el spam que esto debe evitar.
  const { error: upsertError } = await db.from("catalog_snapshot").upsert(
    products.map((p) => ({ slug: p.slug, price: p.price })),
    { onConflict: "slug" },
  );
  if (upsertError) {
    console.error(
      "[catalogo] no se pudo guardar la foto nueva:",
      upsertError.message,
    );
  }

  if (changedSlugs.length === 0) {
    return { ran: true, newSlugs, priceChangedSlugs, announced: false };
  }

  const { headline, intro } = buildAnnouncementCopy(
    newSlugs,
    priceChangedSlugs,
  );

  const outcome = await sendCatalogAnnouncement({
    headline,
    intro,
    slugs: changedSlugs,
  });

  if (!outcome.ok) {
    console.error(
      "[catalogo] el aviso automático no se pudo mandar:",
      outcome.reason,
    );
    return { ran: true, newSlugs, priceChangedSlugs, announced: false };
  }

  console.log(
    `[catalogo] aviso automático · nuevas=${newSlugs.length} · precio=${priceChangedSlugs.length} · enviados=${outcome.sent}`,
  );

  return {
    ran: true,
    newSlugs,
    priceChangedSlugs,
    announced: true,
    sent: outcome.sent,
    failed: outcome.failed,
  };
}

/** El texto del correo, según qué combinación de cambios hubo hoy. */
function buildAnnouncementCopy(
  newSlugs: string[],
  priceChangedSlugs: string[],
): { headline: string; intro: string } {
  const hasNew = newSlugs.length > 0;
  const hasPriceChange = priceChangedSlugs.length > 0;

  if (hasNew && !hasPriceChange) {
    return {
      headline:
        newSlugs.length === 1
          ? "Llegó una prenda nueva a YEI"
          : `Llegaron ${newSlugs.length} prendas nuevas a YEI`,
      intro: "Así de fresca está la colección hoy. Échale un vistazo.",
    };
  }

  if (hasPriceChange && !hasNew) {
    return {
      headline: "Precios actualizados en YEI",
      intro:
        "Estas prendas cambiaron de precio. Revísalas antes de que cambien otra vez.",
    };
  }

  return {
    headline: "Hay novedades en YEI",
    intro:
      "Prendas nuevas y precios actualizados, todo junto. Así está la colección hoy.",
  };
}
