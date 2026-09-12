/**
 * Guía de tallas de YEI APPAREL. Es la misma para todas las prendas, así
 * que vive aquí y la ficha de producto solo la muestra.
 *
 * Se dibuja como tabla y no como imagen: se lee nítida en cualquier
 * pantalla, se adapta al celular y los lectores de pantalla la entienden.
 */
export const SIZE_ROWS = [
  { talla: "XS", numerica: "6", pecho: "86-88", cintura: "64-66", cadera: "94-96" },
  { talla: "S", numerica: "8", pecho: "90-92", cintura: "68-70", cadera: "98-100" },
  { talla: "M", numerica: "10", pecho: "94-96", cintura: "72-74", cadera: "102-104" },
  { talla: "L", numerica: "12", pecho: "98-100", cintura: "76-78", cadera: "106-108" },
];

const COLUMNS = [
  { key: "talla", label: "Talla" },
  { key: "numerica", label: "Talla numérica" },
  { key: "pecho", label: "Pecho" },
  { key: "cintura", label: "Cintura" },
  { key: "cadera", label: "Cadera" },
] as const;

export function SizeGuide({ activeSize }: { activeSize?: string }) {
  return (
    <div>
      {/* En pantallas angostas la tabla se desliza en lugar de apretarse */}
      <div className="notch-frame-sm overflow-x-auto bg-nude">
        <table className="w-full min-w-[420px] border-collapse text-center">
          <caption className="sr-only">
            Guía de tallas de YEI Apparel. Medidas del cuerpo en centímetros.
          </caption>
          <thead>
            <tr className="bg-chocolate">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-2 py-3 text-[10px] uppercase tracking-[0.14em] text-marfil font-semibold sm:text-[11px]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map((row) => {
              const activa = activeSize === row.talla;
              return (
                <tr
                  key={row.talla}
                  className={
                    activa ? "bg-terracota/15" : "odd:bg-transparent even:bg-chocolate/[0.04]"
                  }
                >
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`px-2 py-3 text-sm tabular-nums ${
                        c.key === "talla"
                          ? `font-semibold ${activa ? "text-terracota" : "text-chocolate"}`
                          : "text-chocolate/80 font-light"
                      }`}
                    >
                      {row[c.key]}
                      {activa && c.key === "talla" && (
                        <span className="sr-only"> (tu talla seleccionada)</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[11px] font-light text-chocolate/55">
        Medidas del cuerpo en centímetros. Si estás entre dos tallas, elige tu
        talla habitual.
      </p>
    </div>
  );
}
