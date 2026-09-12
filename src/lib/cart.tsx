import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Clave de `localStorage`. Persistir el carrito evita que un refresh o
 * un cierre de pestaña por error se lleve piezas que la persona ya
 * había elegido — antes vivía solo en memoria de React y se perdía con
 * cualquier recarga.
 */
const STORAGE_KEY = "yei-cart-v1";

/**
 * Tope por línea, igual al que ya aplica el servidor en
 * `src/lib/wompi.ts` (MAX 20). Repetirlo aquí no reemplaza esa
 * validación —el servidor sigue siendo la fuente de verdad del monto—
 * pero evita que el carrito muestre una cantidad que el checkout va a
 * recortar en silencio.
 */
const MAX_QTY = 20;

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.id === "string" &&
        typeof l.slug === "string" &&
        typeof l.price === "number" &&
        typeof l.qty === "number",
    );
  } catch {
    return [];
  }
}

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

type CartContext = {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  /**
   * Agrega una pieza. Por defecto abre el carrito ("Comprar ahora");
   * con `{ open: false }` la suma en silencio y deja seguir navegando
   * ("Añadir al carrito").
   */
  add: (
    line: Omit<CartLine, "id" | "qty">,
    options?: { open?: boolean },
  ) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  subtotal: number;
  count: number;
};

const Ctx = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // Arranca vacío en el servidor (SSR) y se rellena desde localStorage
  // ya en el navegador, en el efecto de abajo: leer localStorage durante
  // el render rompería la hidratación (el servidor no tiene ese dato).
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Cuota llena o localStorage bloqueado: el carrito sigue
      // funcionando en memoria, solo deja de persistir.
    }
  }, [lines, hydrated]);

  const value = useMemo<CartContext>(() => {
    return {
      lines,
      open,
      setOpen,
      add: (line, options) => {
        const id = `${line.slug}-${line.size}-${line.color}`;
        setLines((prev) => {
          const found = prev.find((l) => l.id === id);
          if (found) {
            return prev.map((l) =>
              l.id === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l,
            );
          }
          return [...prev, { ...line, id, qty: 1 }];
        });
        if (options?.open !== false) setOpen(true);
      },
      remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
      setQty: (id, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.id !== id)
            : prev.map((l) =>
                l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l,
              ),
        ),
      subtotal: lines.reduce((acc, l) => acc + l.price * l.qty, 0),
      count: lines.reduce((acc, l) => acc + l.qty, 0),
    };
  }, [lines, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
