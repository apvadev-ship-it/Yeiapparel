import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { StarField } from "@/components/yei/StarField";
import { WHATSAPP_LINK } from "@/lib/whatsapp";

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const columns = [
  {
    title: "Shop",
    links: ["Sets", "Piezas únicas", "Última colección"],
  },
  {
    title: "Marca",
    links: ["Nosotros", "Nuestra historia"],
  },
  {
    title: "Ayuda",
    links: ["Términos y condiciones", "Políticas de privacidad", "Contacto"],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-chocolate px-5 pt-8 pb-20 text-nude lg:px-10 lg:pt-10 lg:pb-24 border-t border-terracota-claro/30">
      <StarField />
      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-16 text-center lg:text-left lg:grid-cols-[1.3fr_2.4fr]">
          <div className="flex flex-col items-center lg:items-start">
            <p className="font-display text-4xl lg:text-5xl tracking-[0.25em] text-marfil">
              YEI APPAREL
            </p>
            <p className="mt-5 max-w-xs text-sm lg:text-base leading-relaxed text-nude/75 font-light italic">
              Más que moda, una forma de vivir tu esencia.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://instagram.com/yei.apparel"
                target="_blank"
                rel="noopener noreferrer"
                className="notch-frame-sm press-tap inline-flex items-center gap-2 bg-marfil/10 px-5 py-3 text-xs font-semibold tracking-widest text-nude transition-all duration-300 hover:-translate-y-0.5 hover:bg-marfil/20 hover:text-marfil"
              >
                <Instagram className="h-4 w-4 text-terracota" />
                Instagram
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="notch-frame-sm press-tap inline-flex items-center gap-2 bg-marfil/10 px-5 py-3 text-xs font-semibold tracking-widest text-nude transition-all duration-300 hover:-translate-y-0.5 hover:bg-marfil/20 hover:text-marfil"
              >
                <WhatsappIcon className="h-4 w-4 text-terracota" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div
                key={col.title}
                className={`text-center lg:text-left ${
                  col.title === "Ayuda" ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <h3 className="label-xs font-sans text-terracota font-bold text-xs lg:text-sm">
                  {col.title}
                </h3>
                <ul className="mt-6 space-y-4 text-sm lg:text-base text-nude/80 font-light">
                  {col.links.map((l) => {
                    const categoria =
                      l === "Sets"
                        ? "sets"
                        : l === "Piezas únicas"
                          ? "piezas-unicas"
                          : undefined;
                    const routeMap: Record<string, string> = {
                      Contacto: "/contacto",
                      "Términos y condiciones": "/politicas-de-privacidad",
                      "Políticas de privacidad": "/politicas-de-privacidad",
                      "Última colección": "/nueva-coleccion",
                      Nosotros: "/nosotros",
                      "Nuestra historia": "/historia",
                    };
                    const hashMap: Record<string, string> = {
                      "Términos y condiciones": "politica-4",
                    };
                    const to = routeMap[l] ?? "/tienda";
                    const hash = hashMap[l];
                    return (
                      <li key={l}>
                        <Link
                          to={to as "/tienda"}
                          search={categoria ? { categoria } : undefined}
                          {...(hash ? { hash } : {})}
                          className="link-underline hover:text-marfil transition-colors"
                        >
                          {l}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 border-t border-terracota-claro/35 pt-8 text-center lg:text-left text-xs lg:text-sm tracking-[0.2em] text-nude/60 font-mono">
          <span>
            © {new Date().getFullYear()} YEI APPAREL · ALL RIGHTS RESERVED
          </span>
        </div>
      </div>
    </footer>
  );
}
