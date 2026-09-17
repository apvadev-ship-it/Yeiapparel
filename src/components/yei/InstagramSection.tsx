import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowRight,
  Film,
  Instagram,
  Heart,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";
import look1 from "@/assets/look-1.jpg";
import look2 from "@/assets/look-2.jpg";
import look3 from "@/assets/look-3.jpg";
import look4 from "@/assets/look-4.jpg";
import look5 from "@/assets/look-5.jpg";
import hero from "@/assets/hero.jpg";
import newsletter from "@/assets/newsletter.jpg";
import defaultPost1 from "@/assets/instagram-defaults/post-1.webp";
import defaultPost2 from "@/assets/instagram-defaults/post-2.webp";
import defaultPost3 from "@/assets/instagram-defaults/post-3.webp";
import defaultPost4 from "@/assets/productos-placeholder/look-e.webp";
import { Reveal } from "@/components/yei/Reveal";
import { SocialPostModal } from "@/components/yei/SocialPostModal";
import { getInstagramFeed } from "@/lib/social-feed";
import type { InstagramPost, InstagramReel } from "@/lib/supabase";

const DEFAULT_POSTS: InstagramPost[] = [
  {
    id: "post-1",
    image_url: defaultPost1,
    caption:
      "Siluetas arquitectónicas esculpidas en satín de alto gramaje. La caída líquida que redefine la elegancia nocturna. #YEIApparel #AltaModa",
    likes_count: 1420,
    comments_count: 86,
    permalink: "https://instagram.com/yei.apparel",
    tag: "@yei.apparel",
    created_at: "Hace 2 horas",
  },
  {
    id: "post-2",
    image_url: defaultPost2,
    caption:
      "Tejido fino en punto Milano en color terracota. Textura envolvente y diseño de autor. #Colección2026",
    likes_count: 2150,
    comments_count: 124,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Pieza Icónica",
    created_at: "Hace 4 horas",
  },
  {
    id: "post-3",
    image_url: defaultPost3,
    caption:
      "Sastrería de autor en tono chocolate tostado. Detalles de solapa biselada en el atelier. #SastreríaFemenina",
    likes_count: 1250,
    comments_count: 63,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Atelier Bogotá",
    created_at: "Ayer",
  },
  {
    id: "post-4",
    image_url: defaultPost4,
    caption:
      "Patronaje anatómico y seda pura marfil. Cada costura respira equilibrio y carácter contemporáneo. #YEI2026",
    likes_count: 980,
    comments_count: 42,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Serie Limitada",
    created_at: "Hace 2 días",
  },
  {
    id: "post-5",
    image_url: "/videos/reel-5.mp4",
    media_type: "VIDEO",
    caption:
      "Vestido midi en color tinta profunda con espalda descubierta y drapeado artesanal. Minimalismo absoluto.",
    likes_count: 3420,
    comments_count: 210,
    permalink: "https://instagram.com/yei.apparel",
    tag: "@yei.apparel",
    created_at: "Hace 3 días",
  },
  {
    id: "post-6",
    image_url: "/videos/reel-6.mp4",
    media_type: "VIDEO",
    caption:
      "Nueva Colección 2026. Elevando los estándares de la moda con piezas diseñadas para la eternidad.",
    likes_count: 4500,
    comments_count: 312,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Lanzamiento",
    created_at: "Hace 4 días",
  },
  {
    id: "post-7",
    image_url: "/videos/reel-7.mp4",
    media_type: "VIDEO",
    caption:
      "Acabados a mano en satín pesado y costuras anatómicas pulidas al milímetro en nuestro atelier.",
    likes_count: 890,
    comments_count: 34,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Detalles",
    created_at: "Hace 5 días",
  },
  {
    id: "post-8",
    image_url: "/videos/reel-8.mp4",
    media_type: "VIDEO",
    caption:
      "Únete a nuestro universo. Suscríbete para acceso anticipado a nuestras piezas de sastrería de autor.",
    likes_count: 1120,
    comments_count: 45,
    permalink: "https://instagram.com/yei.apparel",
    tag: "Comunidad",
    created_at: "Hace 1 semana",
  },
];

const DEFAULT_REEL: InstagramReel = {
  id: "reel-main",
  video_title: "Detrás de cámaras · Atelier YEI APPAREL 2026",
  video_subtitle: "Proceso artesanal, patronaje y texturas en movimiento",
  video_description:
    "Descubre la precisión detrás de cada pieza: desde la selección del satín hasta el drapeado manual en nuestro taller.",
  cover_url: look1,
  reel_url: "https://instagram.com/yei.apparel",
  duration: "0:45",
  likes_count: 3420,
  comments_count: 154,
};

export function InstagramSection() {
  const [isReelOpen, setIsReelOpen] = useState(false);
  const [activePost, setActivePost] = useState<InstagramPost | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>(DEFAULT_POSTS);
  const [reelData, setReelData] = useState<InstagramReel>(DEFAULT_REEL);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // El feed real se lee en el servidor (ver social-feed.ts) y se pide
  // aquí como cualquier función de servidor del proyecto. Si no hay
  // datos aún (o falla), se queda con el set de ejemplo de arriba.
  useEffect(() => {
    let cancelled = false;

    getInstagramFeed()
      .then(({ posts: fetchedPosts, reel }) => {
        if (cancelled) return;
        if (fetchedPosts.length > 0) setPosts(fetchedPosts);
        if (reel) setReelData(reel);
      })
      .catch((err) => {
        console.warn("[instagram] no se pudo leer el feed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLike = (postId: string, currentLikes: number) => {
    const isLiked = likedPosts[postId];
    const initialCount = likeCounts[postId] ?? currentLikes;
    const newCount = isLiked ? initialCount - 1 : initialCount + 1;

    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts((prev) => ({ ...prev, [postId]: newCount }));
  };

  return (
    <>
      <section
        id="instagram"
        className="relative overflow-hidden bg-nude/50 px-4 py-8 sm:px-6 lg:px-10 lg:py-8"
      >
        {/* Luces y texturas geométricas de fondo */}
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rotate-12 rounded-3xl border border-terracota/15 bg-terracota/5 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 -rotate-12 border border-terracota/25 bg-chocolate/5 blur-2xl" />

        {/* En escritorio la sección se compacta (contenedor y tipografía
            más chicos) para que no compita en peso visual con el resto
            del home; en celular/tablet queda igual que antes. */}
        <div className="relative mx-auto max-w-[1100px] lg:max-w-[560px]">
          {/* HEADER Y GRILLA UNIFICADOS EN UN SOLO BLOQUE COHESIVO */}
          <div className="mx-auto max-w-2xl text-center mb-6 sm:mb-8 lg:mb-5">
            <Reveal>
              <h2 className="font-display text-5xl leading-[0.95] text-chocolate sm:text-7xl lg:text-4xl font-medium">
                Instagram{" "}
                <a
                  href="https://instagram.com/yei.apparel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="italic text-terracota font-normal hover:text-chocolate transition-colors"
                >
                  @yei.apparel
                </a>
              </h2>
            </Reveal>
          </div>

          {/* GRILLA COMPACTA DE INSTAGRAM (2x2: queda a la izquierda, junto a TikTok) */}
          <div className="grid gap-3 sm:gap-4 lg:gap-3 grid-cols-2 items-stretch">
            {posts.slice(0, 4).map((post, index) => (
              <Reveal key={post.id} delay={index * 40} className="h-full">
                <InstagramImageCard
                  post={post}
                  isLiked={likedPosts[post.id]}
                  likeCount={likeCounts[post.id] ?? post.likes_count}
                  onToggleLike={() => toggleLike(post.id, post.likes_count)}
                  onOpen={() => setActivePost(post)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* REPRODUCTOR MODAL DEL REEL DE INSTAGRAM */}
      <InstagramReelModal
        isOpen={isReelOpen}
        reel={reelData}
        onClose={() => setIsReelOpen(false)}
      />

      {/* Al tocar una publicación de la grilla, se amplía aquí mismo. */}
      <SocialPostModal
        isOpen={activePost !== null}
        onClose={() => setActivePost(null)}
        media={
          activePost
            ? {
                kind: activePost.media_type === "VIDEO" ? "video" : "image",
                src: activePost.image_url,
              }
            : null
        }
        caption={activePost?.caption ?? ""}
        likesCount={activePost?.likes_count}
        commentsCount={activePost?.comments_count}
        externalUrl={activePost?.permalink ?? "https://instagram.com/yei.apparel"}
        externalLabel="Ver en Instagram"
        networkLabel="INSTAGRAM"
      />
    </>
  );
}

function InstagramImageCard({
  post,
  isBig = false,
  isLiked,
  likeCount,
  onToggleLike,
  onOpen,
}: {
  post: InstagramPost;
  isBig?: boolean;
  isLiked?: boolean;
  likeCount: number;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [videoInView, setVideoInView] = useState(false);

  useEffect(() => {
    if (post.media_type !== "VIDEO" || !videoRef.current) return;
    // A diferencia de <img loading="lazy">, un <video autoPlay> empieza a
    // descargarse apenas se monta sin importar si está fuera de pantalla.
    // Se observa el contenedor y solo se le da `src` al video al acercarse
    // al viewport, para no bajar los 4 clips por defecto de una vez.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVideoInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [post.media_type]);

  return (
    <div className="notch-frame hover-lift bg-chocolate/15 p-[2px] shadow-xl h-full">
      <div
        ref={videoRef}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen();
        }}
        aria-label="Ampliar publicación"
        className="group relative notch-frame overflow-hidden bg-marfil h-full aspect-[3/4] cursor-pointer"
      >
        {post.media_type === "VIDEO" ? (
          videoInView ? (
            <video
              src={post.image_url}
              aria-label={post.caption}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-chocolate/10" aria-hidden="true" />
          )
        ) : (
          <img
            src={post.image_url}
            alt={post.caption}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}

        {/* Gradiente con información de Instagram al hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-chocolate/95 via-chocolate/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-between p-5 text-marfil" />

        {/* Botón de me gusta flotante superior derecho */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className={`absolute top-3.5 right-3.5 z-20 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition-transform active:scale-125 cursor-pointer ${
            isLiked
              ? "bg-terracota text-marfil"
              : "bg-marfil/90 text-chocolate hover:bg-marfil"
          }`}
          aria-label="Dar me gusta"
        >
          <Heart
            className={`h-4 w-4 ${isLiked ? "fill-marfil" : "text-chocolate"}`}
          />
        </button>

        {/* Contenido al pasar el mouse */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-marfil opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <p className="text-xs text-nude/95 font-light line-clamp-3 leading-relaxed">
            {post.caption}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-terracota/40 pt-3 text-[11px] font-mono">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-marfil font-bold">
                <Heart className="h-3.5 w-3.5 fill-marfil" />
                <span>{likeCount.toLocaleString("es-CO")}</span>
              </span>
              {post.comments_count && (
                <span className="inline-flex items-center gap-1 text-nude/80">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{post.comments_count}</span>
                </span>
              )}
            </div>

            <a
              href={post.permalink ?? "https://instagram.com/yei.apparel"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="notch-frame-sm bg-terracota text-marfil px-2.5 py-1 text-[10px] tracking-wider hover:bg-terracota/90 transition-colors inline-flex items-center gap-1"
            >
              <span>Ver en IG</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramReelModal({
  isOpen,
  reel,
  onClose,
}: {
  isOpen: boolean;
  reel: InstagramReel;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);
  const [activeTab, setActiveTab] = useState<"look" | "detalles">("look");

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
            className="fixed inset-0 z-[80] bg-chocolate/85 backdrop-blur-md"
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-full max-w-md overflow-hidden notch-frame bg-chocolate text-marfil shadow-2xl"
            >
              {/* Header del modal */}
              <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-terracota/30 bg-chocolate/90 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <Instagram className="h-4 w-4 text-terracota" />
                  <span className="font-mono text-xs tracking-widest text-marfil font-bold">
                    REEL DE INSTAGRAM · YEI APPAREL
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

              {/* Contenedor del video/imagen */}
              <div className="relative aspect-[9/13] w-full overflow-hidden bg-black">
                <img
                  src={activeTab === "look" ? look1 : look4}
                  alt={reel.video_title}
                  className="h-full w-full object-cover transition-all duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-chocolate via-transparent to-black/40 pointer-events-none" />

                {/* Controles multimedia */}
                <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-20">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? "Activar audio" : "Silenciar"}
                    className="grid h-10 w-10 place-items-center rounded-full bg-chocolate/70 backdrop-blur-md text-marfil hover:bg-chocolate transition-colors border border-terracota/40 cursor-pointer"
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
                    className="grid h-10 w-10 place-items-center rounded-full bg-chocolate/70 backdrop-blur-md text-marfil hover:bg-chocolate transition-colors border border-terracota/40 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-marfil" />
                    )}
                  </button>
                </div>

                {/* Pestañas de encuadre */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("look")}
                    className={`notch-frame-sm px-3 py-1 text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                      activeTab === "look"
                        ? "bg-terracota text-marfil"
                        : "bg-chocolate/80 text-nude border border-terracota/40"
                    }`}
                  >
                    Silueta
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("detalles")}
                    className={`notch-frame-sm px-3 py-1 text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                      activeTab === "detalles"
                        ? "bg-terracota text-marfil"
                        : "bg-chocolate/80 text-nude border border-terracota/40"
                    }`}
                  >
                    Textura
                  </button>
                </div>

                {/* Información inferior del Reel */}
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
                        ✦ INSTAGRAM REEL · 2026 ✦
                      </p>
                      <h3 className="font-display text-2xl font-medium text-marfil mt-1">
                        {reel.video_title}
                      </h3>
                      <p className="text-xs text-nude/80 font-light mt-1 max-w-[280px]">
                        {reel.video_description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-terracota/35 flex items-center justify-between">
                    <a
                      href="https://instagram.com/yei.apparel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-terracota hover:text-marfil transition-colors inline-flex items-center gap-1"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      <span>@yei.apparel</span>
                    </a>

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
