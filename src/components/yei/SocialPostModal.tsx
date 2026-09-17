import { useEffect } from "react";
import { X, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * Modal compartido por InstagramSection y TikTokSection: al tocar una
 * publicación se amplía en la misma página (imagen grande, video real
 * reproduciéndose o el player embebido de TikTok), en vez de mandar de
 * una vez a la app externa. El enlace "Ver en Instagram/TikTok" sigue
 * ahí abajo para quien quiera abrir la publicación real.
 */

type Media =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "iframe"; src: string };

export function SocialPostModal({
  isOpen,
  onClose,
  media,
  caption,
  likesCount,
  commentsCount,
  externalUrl,
  externalLabel,
  networkLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  media: Media | null;
  caption: string;
  likesCount?: number | undefined;
  commentsCount?: number | undefined;
  externalUrl: string;
  externalLabel: string;
  networkLabel: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && media && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-chocolate/85 backdrop-blur-md"
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-chocolate text-marfil shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-sm sm:notch-frame"
            >
              <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-terracota/30 bg-chocolate/90 backdrop-blur-sm">
                <span className="font-mono text-xs tracking-widest text-marfil font-bold">
                  {networkLabel} · YEI APPAREL
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="grid h-8 w-8 place-items-center rounded-full text-marfil hover:bg-marfil/15 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* En celular el reproductor toma todo el alto disponible
                  (mejor para el player de TikTok, que trae su propia
                  interfaz pensada para pantalla completa); en escritorio
                  se limita a una proporción vertical de "reel". */}
              <div className="relative min-h-0 flex-1 w-full overflow-hidden bg-black sm:aspect-[9/13] sm:flex-none">
                {media.kind === "image" && (
                  <img
                    src={media.src}
                    alt={caption}
                    className="h-full w-full object-contain sm:object-cover"
                  />
                )}
                {media.kind === "video" && (
                  <video
                    src={media.src}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain sm:object-cover"
                  />
                )}
                {media.kind === "iframe" && (
                  <iframe
                    src={media.src}
                    className="h-full w-full"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    title={caption || "Video"}
                  />
                )}
              </div>

              {/* El player de TikTok ya trae su propia descripción, likes
                  y comentarios encima del video: repetirlos abajo se ve
                  amontonado. Este pie solo aparece para imagen/video de
                  Instagram, que no traen esa información incrustada. */}
              {media.kind !== "iframe" && (caption || likesCount !== undefined) && (
                <div className="relative z-10 shrink-0 px-4 py-3 sm:px-5 sm:py-4 bg-chocolate">
                  {caption && (
                    <p className="text-xs text-nude/90 font-light leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {caption}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-terracota/30 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[11px] font-mono">
                      {likesCount !== undefined && (
                        <span className="inline-flex items-center gap-1 text-marfil font-bold">
                          <Heart className="h-3.5 w-3.5 fill-marfil" />
                          <span>{likesCount.toLocaleString("es-CO")}</span>
                        </span>
                      )}
                      {commentsCount !== undefined && (
                        <span className="inline-flex items-center gap-1 text-nude/80">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{commentsCount}</span>
                        </span>
                      )}
                    </div>

                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="notch-frame-sm bg-terracota text-marfil px-2.5 py-1.5 text-[10px] tracking-wider hover:bg-terracota/90 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{externalLabel}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Para TikTok sí se deja un pie mínimo, solo con el enlace
                  de salida — nada que el player ya no muestre. */}
              {media.kind === "iframe" && (
                <div className="relative z-10 shrink-0 px-4 py-3 bg-chocolate flex justify-end">
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="notch-frame-sm bg-terracota text-marfil px-2.5 py-1.5 text-[10px] tracking-wider hover:bg-terracota/90 transition-colors inline-flex items-center gap-1"
                  >
                    <span>{externalLabel}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
