import { products } from "@/lib/products";
import { siteUrl } from "@/lib/newsletter";

export const SITEMAP_PATH = "/sitemap.xml";

/**
 * Páginas estáticas del sitio (sin contar el catálogo, que sale de
 * `products`). No incluye `/finalizar-compra` ni `/pedido/...`: son
 * páginas de un pedido en curso, igual que en `public/robots.txt`.
 */
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/tienda", priority: "0.9" },
  { path: "/nueva-coleccion", priority: "0.8" },
  { path: "/nosotros", priority: "0.6" },
  { path: "/historia", priority: "0.6" },
  { path: "/contacto", priority: "0.5" },
  { path: "/politicas-de-privacidad", priority: "0.3" },
];

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

function urlEntry(path: string, priority: string): string {
  const loc = escapeXml(`${siteUrl()}${path}`);
  return `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`;
}

/**
 * Genera el sitemap.xml al vuelo en cada petición: el catálogo cambia
 * (nuevos productos, colores) y un archivo estático en `public/` se
 * habría quedado desactualizado sin que nadie lo notara.
 */
export function renderSitemap(): string {
  const entries = [
    ...STATIC_ROUTES.map((r) => urlEntry(r.path, r.priority)),
    ...products.map((p) => urlEntry(`/producto/${p.slug}`, "0.7")),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function handleSitemap(): Response {
  return new Response(renderSitemap(), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
