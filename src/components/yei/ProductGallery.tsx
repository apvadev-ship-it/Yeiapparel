import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Galería de fotos de una ficha de producto.
 *
 * Miniaturas a la izquierda (arriba en móvil, por espacio), una foto
 * grande seleccionada. En escritorio, pasar el cursor sobre la foto
 * grande hace zoom siguiendo el cursor (efecto lupa, con
 * `background-size` en vez de escalar la imagen, así no se ve
 * pixelada). En móvil, tocar la foto la abre ampliada de pantalla
 * completa; un toque dentro de esa vista alterna acercar/alejar en el
 * punto tocado — no hay gesto de pellizco, pero es lo más simple que
 * cubre "tocar y poder ampliar" sin traer una librería nueva solo para
 * esto.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[active] ?? images[0] ?? "";

  return (
    <div className="grid gap-3 sm:grid-cols-[76px_1fr] lg:grid-cols-[92px_1fr]">
      {/* Miniaturas: columna a la izquierda en pantallas ≥ sm, fila
          horizontal con scroll en móvil (no hay espacio para columna). */}
      <div className="order-2 flex justify-center gap-2.5 overflow-x-auto sm:order-1 sm:flex-col sm:justify-start sm:overflow-visible">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Ver foto ${i + 1} de ${alt}`}
            aria-current={active === i}
            className={`notch-frame-sm shrink-0 overflow-hidden border p-[1px] transition-colors ${
              active === i
                ? "border-chocolate"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src={img}
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={92}
              height={122}
              className="h-16 w-14 bg-nude object-cover sm:h-[72px] sm:w-[72px] lg:h-[88px] lg:w-[88px]"
            />
          </button>
        ))}
      </div>

      <div className="order-1 sm:order-2">
        <HoverZoomImage
          src={activeImage}
          alt={alt}
          onOpen={() => setLightboxOpen(true)}
        />
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <TapZoomImage src={activeImage} alt={alt} />
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
            className="absolute -top-10 right-0 text-marfil/80 hover:text-marfil sm:top-2 sm:right-2 cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * La foto grande. En escritorio, el cursor mueve un "lente" de zoom
 * (con `background-position`, no `transform`, para que el navegador
 * no tenga que reescalar el `<img>` — se ve más nítido). Un clic (o un
 * toque, en pantallas táctiles) abre la foto ampliada.
 */
function HoverZoomImage({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
}) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setZoomed(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setZoomed(false)}
      aria-label={`Ampliar foto de ${alt}`}
      className="notch-frame block w-full cursor-zoom-in overflow-hidden bg-chocolate/10 p-[1px] shadow-sm"
    >
      <div
        className="notch-frame aspect-[3/4] w-full bg-nude bg-cover bg-no-repeat transition-[background-size] duration-200"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: zoomed ? "220%" : "cover",
          backgroundPosition: zoomed ? origin : "center",
        }}
        role="img"
        aria-label={alt}
      />
    </button>
  );
}

/**
 * La foto dentro del visor de pantalla completa. Un toque alterna
 * entre tamaño normal y acercada, centrada en el punto que se tocó.
 */
function TapZoomImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setZoomed((z) => !z);
  };

  return (
    <div
      onClick={handleTap}
      className={`max-h-[85vh] w-full overflow-hidden rounded-sm ${
        zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
      }`}
    >
      <img
        src={src}
        alt={alt}
        className="mx-auto max-h-[85vh] w-auto object-contain transition-transform duration-300"
        style={{
          transform: zoomed ? "scale(2.2)" : "scale(1)",
          transformOrigin: origin,
        }}
      />
    </div>
  );
}
