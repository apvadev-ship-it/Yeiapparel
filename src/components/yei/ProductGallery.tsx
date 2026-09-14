import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Galería de fotos de una ficha de producto.
 *
 * Dos formas de recorrerla, según el dispositivo:
 *
 *  - Celular y tablet (hasta `lg`): la foto grande es un carrusel que
 *    se desliza con el dedo (scroll-snap horizontal, sin librería
 *    nueva), y las miniaturas de abajo también se pueden tocar para
 *    saltar directo a una foto — las dos formas quedan sincronizadas.
 *    Es mejor así que forzar solo una de las dos: deslizar es más
 *    natural para "ver la siguiente", tocar una miniatura es más
 *    rápido para "quiero ESA foto en particular".
 *  - Escritorio (`lg` en adelante): sin gesto de deslizar que tenga
 *    sentido con mouse, se mantiene la foto única con zoom seguido al
 *    cursor (`background-size`, no reescala la imagen para que no se
 *    vea pixelada) que ya tenía esta ficha.
 *
 * Tocar la foto (en cualquiera de los dos casos) abre el visor de
 * pantalla completa; un toque ahí alterna acercar/alejar en el punto
 * tocado.
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

  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Evita que el listener de scroll (deslizar) reescriba `active` justo
  // cuando el cambio vino de tocar una miniatura y el navegador todavía
  // está animando el scroll hacia ese carril — si no, el índice
  // parpadea entre el que se tocó y el que el scroll cree que es.
  const scrollingFromTap = useRef(false);
  const scrollingFromTapTimer = useRef<number>(0);

  const goTo = (i: number) => {
    setActive(i);
    const track = carouselRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (track && slide) {
      scrollingFromTap.current = true;
      track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
      window.clearTimeout(scrollingFromTapTimer.current);
      scrollingFromTapTimer.current = window.setTimeout(() => {
        scrollingFromTap.current = false;
      }, 500);
    }
    thumbRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const handleCarouselScroll = () => {
    if (scrollingFromTap.current) return;
    const track = carouselRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    setActive((prev) => (prev === i ? prev : Math.max(0, Math.min(i, images.length - 1))));
  };

  // Si la ficha cambia de producto sin desmontar el componente, el
  // carrusel debe volver al principio en vez de quedarse desplazado a
  // la foto N de la pieza anterior.
  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0 });
    setActive(0);
  }, [images]);

  return (
    <div className="grid gap-3 lg:grid-cols-[92px_1fr]">
      {/* Miniaturas: fila horizontal con scroll en celular/tablet (no
          hay espacio para columna hasta escritorio). */}
      <div className="order-2 flex justify-center gap-2.5 overflow-x-auto lg:order-1 lg:flex-col lg:justify-start lg:overflow-visible">
        {images.map((img, i) => (
          <button
            key={i}
            ref={(el) => {
              thumbRefs.current[i] = el;
            }}
            type="button"
            onClick={() => goTo(i)}
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
              alt={`${alt} — miniatura ${i + 1}`}
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              width={92}
              height={122}
              className="h-16 w-14 bg-nude object-cover sm:h-[72px] sm:w-[72px] lg:h-[88px] lg:w-[88px]"
            />
          </button>
        ))}
      </div>

      <div className="order-1 lg:order-2">
        {/* Celular/tablet: carrusel deslizable con el dedo. */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="notch-frame flex w-full snap-x snap-mandatory overflow-x-auto bg-chocolate/10 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Ampliar foto ${i + 1} de ${alt}`}
              className="aspect-[3/4] w-full shrink-0 snap-center cursor-zoom-in"
            >
              <img
                src={img}
                alt={i === active ? alt : ""}
                aria-hidden={i === active ? undefined : true}
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : undefined}
                className="h-full w-full bg-nude object-cover"
              />
            </button>
          ))}
        </div>

        {/* Escritorio: foto única con zoom siguiendo el cursor. */}
        <div className="hidden lg:block">
          <HoverZoomImage
            src={activeImage}
            alt={alt}
            onOpen={() => setLightboxOpen(true)}
          />
        </div>
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
 * no tenga que reescalar el `<img>` — se ve más nítido). Un clic abre
 * la foto ampliada.
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
