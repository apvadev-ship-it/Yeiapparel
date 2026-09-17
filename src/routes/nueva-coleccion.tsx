import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/yei/Reveal";
import { heroImage } from "@/lib/products";
import {
  LAUNCH_DATE,
  getRemaining,
  type Remaining,
} from "@/lib/next-collection";

export const Route = createFileRoute("/nueva-coleccion")({
  component: NuevaColeccion,
});

function NuevaColeccion() {
  // Se calcula solo en el cliente para que el servidor y el navegador no
  // rendericen segundos distintos.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setRemaining(getRemaining());
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: { label: string; value: number | null }[] = [
    { label: "Días", value: remaining?.dias ?? null },
    { label: "Horas", value: remaining?.horas ?? null },
    { label: "Minutos", value: remaining?.minutos ?? null },
    { label: "Segundos", value: remaining?.segundos ?? null },
  ];

  const fechaLarga = LAUNCH_DATE.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });

  return (
    <section
      data-cursor="light"
      className="relative min-h-screen overflow-hidden bg-terracota px-5 py-28 lg:px-10 lg:py-36"
    >
      {/* Imagen de fondo, muy atenuada para no competir con el contador */}
      <img
        src={heroImage}
        alt="Campaña YEI APPAREL, colección 2026"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.04]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-marfil/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <h1 className="mt-6 font-display text-5xl leading-[0.95] text-marfil sm:text-7xl lg:text-8xl font-medium">
            Falta poco para la{" "}
            <span className="italic text-marfil font-normal">
              nueva colección
            </span>
          </h1>
        </Reveal>

        <Reveal>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-nude/75 font-light lg:text-3xl">
            Estamos terminando las últimas piezas en nuestro atelier de Bogotá.
            La colección se abre el {fechaLarga}.
          </p>
        </Reveal>

        {/* Contador real, actualizado cada segundo */}
        <Reveal className="mt-14 w-full">
          {remaining?.terminado ? (
            <div className="flex flex-col items-center gap-6">
              <p className="font-display text-4xl text-marfil sm:text-5xl">
                Ya está aquí
              </p>
              <Link
                to="/tienda"
                className="btn-yei notch-frame-sm bg-marfil text-terracota hover:bg-marfil/90 px-9 py-4 text-xs font-medium"
              >
                <span>Ver la colección</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {units.map((u) => (
                <div
                  key={u.label}
                  className="notch-frame-sm bg-marfil/10 px-3 py-6 lg:py-8"
                >
                  <span
                    className="block font-display text-5xl leading-none text-marfil tabular-nums sm:text-6xl lg:text-7xl"
                    aria-live={u.label === "Segundos" ? "off" : undefined}
                  >
                    {u.value === null ? "--" : String(u.value).padStart(2, "0")}
                  </span>
                  <span className="mt-3 block text-[11px] uppercase tracking-[0.28em] text-nude/60">
                    {u.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        {!remaining?.terminado && (
          <Reveal>
            <Link
              to="/tienda"
              className="btn-yei notch-frame-sm mt-14 bg-marfil text-terracota hover:bg-marfil/90 px-9 py-4 text-sm font-medium lg:text-base"
            >
              <span>Mientras tanto, ver la tienda</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
