import { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Film,
  Eye,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";
import story from "@/assets/story.jpg";
import look4 from "@/assets/look-4.jpg";
import look1 from "@/assets/look-1.jpg";
import look3 from "@/assets/look-3.jpg";
import { Reveal } from "@/components/yei/Reveal";
import { GeometricDivider } from "@/components/yei/GeometricDivider";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function NextCollectionSection() {
  const [isReelOpen, setIsReelOpen] = useState(false);

  // Cuenta regresiva calibrada a 7 días
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 7,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(targetDate.getHours() + 14);

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60),
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-nude/40 px-5 py-20 lg:px-10 lg:py-32">
        {/* Elemento de fondo geométrico con irregularidad */}
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rotate-12 rounded-3xl border border-terracota/15 bg-terracota/5 blur-xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 -rotate-12 border border-terracota/25 bg-chocolate/5 blur-2xl" />

        <div className="relative mx-auto max-w-[1500px]">
          {/* HEADER PRINCIPAL PRÓXIMA COLECCIÓN + CUENTA REGRESIVA */}
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 notch-frame-sm bg-chocolate/10 px-5 py-2 text-terracota">
                <Sparkles className="h-4 w-4" />
                <span className="eyebrow text-xs tracking-[0.3em] font-bold">
                  ✦ LANZAMIENTO EXCLUSIVO ✦
                </span>
              </div>

              <h2 className="mt-6 font-display text-5xl leading-[0.95] text-chocolate sm:text-7xl lg:text-8xl font-medium">
                Próxima{" "}
                <span className="italic text-terracota font-normal">
                  Colección
                </span>
              </h2>

              <p className="mt-6 text-base leading-relaxed text-chocolate/80 sm:text-xl font-light max-w-2xl mx-auto">
                Siluetas inéditas de satín pesado y sastrería de autor. Conoce
                el detrás de cámaras y los nuevos detalles de nuestra próxima
                entrega.
              </p>

              {/* CUENTA REGRESIVA DE 1 SEMANA */}
              <div className="mt-12 grid grid-cols-4 gap-3 sm:gap-6 max-w-2xl mx-auto">
                {[
                  { label: "DÍAS", value: timeLeft.days },
                  { label: "HORAS", value: timeLeft.hours },
                  { label: "MINUTOS", value: timeLeft.minutes },
                  { label: "SEGUNDOS", value: timeLeft.seconds },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="notch-frame bg-chocolate/15 p-[1.5px] shadow-sm transform transition-transform hover:-translate-y-1"
                  >
                    <div className="notch-frame bg-marfil py-5 sm:py-7 px-2 text-center">
                      <span className="font-display text-3xl sm:text-5xl lg:text-6xl text-chocolate font-bold block tabular-nums">
                        {String(item.value).padStart(2, "0")}
                      </span>
                      <span className="label-xs text-[10px] sm:text-xs tracking-[0.25em] text-terracota font-bold mt-2 block">
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* DIVISIÓN GEOMÉTRICA INTERMEDIA */}
          <GeometricDivider variant="diamonds" className="my-14" />

          {/* ESPACIO EDITORIAL ASIMÉTRICO & ACCESO A VER REEL */}
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14 items-center">
            {/* LADO IZQUIERDO: MOODBOARD EDITORIAL IRREGULAR */}
            <div className="lg:col-span-6">
              <Reveal>
                <div className="relative">
                  {/* Composición asimétrica de imágenes con diferentes alturas y cortes */}
                  <div className="grid grid-cols-12 gap-4 items-end">
                    {/* Imagen principal alta con bisel */}
                    <div className="col-span-7 notch-frame bg-chocolate/15 p-[2px] shadow-xl">
                      <div className="notch-frame overflow-hidden bg-marfil aspect-[3/4.2]">
                        <img
                          src={look1}
                          alt="Vestido satín de la próxima colección YEI"
                          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* Columna secundaria desfasada hacia arriba */}
                    <div className="col-span-5 flex flex-col gap-4 -translate-y-4 sm:-translate-y-8">
                      <div className="notch-frame bg-chocolate/15 p-[1.5px] shadow-lg">
                        <div className="notch-frame overflow-hidden bg-marfil aspect-square">
                          <img
                            src={look4}
                            alt="Detalle de seda marfil colección 2026"
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                      </div>

                      <div className="notch-frame bg-chocolate/15 p-[1.5px] shadow-lg">
                        <div className="notch-frame overflow-hidden bg-marfil aspect-[4/3]">
                          <img
                            src={look3}
                            alt="Sastrería en atelier YEI"
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Micro-etiqueta arquitectónica inferior */}
                  <div className="mt-4 flex items-center justify-between px-2 text-chocolate/70 font-mono text-xs">
                    <span>✦ SERIE LIMITADA · 2026</span>
                    <span>BOGOTÁ ATELIER</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* LADO DERECHO: TARJETA PRINCIPAL PARA «VER REEL» */}
            <div className="lg:col-span-6">
              <Reveal delay={160}>
                <div className="relative mx-auto max-w-lg lg:max-w-none">
                  {/* Marco con muescas y estilo de alta costura */}
                  <div className="notch-frame bg-chocolate/20 p-[2px] shadow-2xl">
                    <div
                      onClick={() => setIsReelOpen(true)}
                      className="group relative notch-frame cursor-pointer overflow-hidden bg-chocolate aspect-[9/13] sm:aspect-[9/12]"
                    >
                      {/* Imagen de fondo del Atelier */}
                      <img
                        src={story}
                        alt="Atelier YEI - Reel detrás de cámaras"
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-85"
                      />

                      {/* Gradiente oscuro suave para legibilidad */}
                      <div className="absolute inset-0 bg-gradient-to-t from-chocolate via-chocolate/40 to-transparent" />

                      {/* Header dentro de la tarjeta del Reel */}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                        <span className="notch-frame-sm bg-chocolate/85 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-mono tracking-widest text-marfil border border-terracota-claro/40 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-terracota animate-ping" />
                          <span>REEL · ATELIER</span>
                        </span>
                        <span className="notch-frame-sm bg-marfil/95 px-3 py-1 text-[11px] font-mono font-bold text-chocolate shadow-sm">
                          0:45 MIN
                        </span>
                      </div>

                      {/* Botón de reproducción central con aura interactiva */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <motion.div
                          whileHover={{ scale: 1.14 }}
                          whileTap={{ scale: 0.94 }}
                          className="relative flex items-center justify-center"
                        >
                          <div className="absolute -inset-4 rounded-full bg-terracota/40 blur-lg group-hover:bg-terracota/65 transition-all" />
                          <div className="relative grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full bg-terracota text-marfil shadow-2xl border-2 border-terracota-claro/70">
                            <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-marfil translate-x-0.5" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Información inferior del Reel */}
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-marfil z-10">
                        <div className="inline-flex items-center gap-1.5 text-xs text-terracota font-bold tracking-widest uppercase">
                          <Camera className="h-3.5 w-3.5" />
                          <span>Behind The Scenes</span>
                        </div>
                        <h3 className="mt-2 font-display text-3xl sm:text-4xl font-medium leading-tight text-marfil">
                          Ver Reel de la Nueva Colección
                        </h3>
                        <p className="mt-2 text-xs sm:text-sm text-nude/85 font-light max-w-sm">
                          Sumérgete en la atmósfera visual, los cortes y los
                          detalles en movimiento.
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-terracota group-hover:text-marfil transition-colors tracking-widest uppercase">
                          <span className="underline decoration-terracota underline-offset-4">
                            Reproducir reel interactivo
                          </span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones complementarias */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setIsReelOpen(true)}
                      className="btn-yei notch-frame-sm bg-chocolate text-marfil hover:bg-chocolate/90 shadow-md px-7 py-3.5 text-xs font-semibold tracking-widest cursor-pointer"
                    >
                      <Film className="h-4 w-4 text-terracota" />
                      <span>Ver Reel Ahora</span>
                    </button>
                    <Link
                      to="/tienda"
                      className="link-underline text-xs tracking-[0.22em] uppercase font-semibold text-chocolate hover:text-terracota transition-colors py-2"
                    >
                      Ver Catálogo Vigente ✦
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* REPRODUCTOR MODAL DEL REEL */}
      <ReelModal isOpen={isReelOpen} onClose={() => setIsReelOpen(false)} />
    </>
  );
}

function ReelModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);
  const [activeTab, setActiveTab] = useState<"look" | "proceso">("look");

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (!isPlaying) return prev;
        if (prev >= 100) return 0;
        return prev + 1.5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-chocolate/80 backdrop-blur-md"
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-full max-w-md overflow-hidden notch-frame bg-chocolate text-marfil shadow-2xl border border-terracota-claro/40"
            >
              <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-terracota-claro/30 bg-chocolate/90 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-terracota animate-pulse" />
                  <span className="font-mono text-xs tracking-widest text-marfil font-bold">
                    REEL EXCLUSIVO · ATELIER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar reproductor"
                  className="grid h-8 w-8 place-items-center rounded-full text-marfil hover:bg-marfil/15 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative aspect-[9/13] w-full overflow-hidden bg-black">
                <img
                  src={activeTab === "look" ? look1 : look4}
                  alt="Reel Atelier YEI"
                  className="h-full w-full object-cover transition-all duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-chocolate via-transparent to-black/40 pointer-events-none" />

                <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-20">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? "Activar audio" : "Silenciar"}
                    className="grid h-10 w-10 place-items-center rounded-full bg-chocolate/70 backdrop-blur-md text-marfil hover:bg-chocolate transition-colors border border-terracota-claro/40 cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-terracota" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                    className="grid h-10 w-10 place-items-center rounded-full bg-chocolate/70 backdrop-blur-md text-marfil hover:bg-chocolate transition-colors border border-terracota-claro/40 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-marfil" />
                    )}
                  </button>
                </div>

                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("look")}
                    className={`notch-frame-sm px-3 py-1 text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                      activeTab === "look"
                        ? "bg-terracota text-marfil"
                        : "bg-chocolate/80 text-nude border border-terracota-claro/40"
                    }`}
                  >
                    Silueta
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("proceso")}
                    className={`notch-frame-sm px-3 py-1 text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                      activeTab === "proceso"
                        ? "bg-terracota text-marfil"
                        : "bg-chocolate/80 text-nude border border-terracota-claro/40"
                    }`}
                  >
                    Detalle
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 z-20">
                  <div className="h-1 w-full bg-marfil/25 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-terracota transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow text-terracota text-[11px] font-bold">
                        ✦ COLECCIÓN 2026 ✦
                      </p>
                      <h4 className="font-display text-2xl font-medium text-marfil mt-1">
                        Vestido Satín Eterno & Sastrería
                      </h4>
                      <p className="text-xs text-nude/80 font-light mt-1 max-w-[280px]">
                        Confeccionado en series cortas de 20 unidades por talla.
                        Disponible en el próximo drop.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-terracota-claro/35 flex items-center justify-between">
                    <span className="font-mono text-xs text-nude/70">
                      Bogotá · Atelier YEI
                    </span>
                    <Link
                      to="/tienda"
                      onClick={onClose}
                      className="btn-yei notch-frame-sm bg-terracota text-marfil hover:bg-terracota/90 text-xs px-4 py-2 font-semibold tracking-wider inline-flex items-center gap-1.5"
                    >
                      <span>Ver tienda</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
