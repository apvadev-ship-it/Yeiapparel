import { useState, useEffect } from "react";
import { Heart, MessageCircle, ExternalLink, Play } from "lucide-react";
import look2 from "@/assets/look-2.jpg";
import look3 from "@/assets/look-3.jpg";
import look4 from "@/assets/look-4.jpg";
import look5 from "@/assets/look-5.jpg";
import { Reveal } from "@/components/yei/Reveal";
import { SocialPostModal } from "@/components/yei/SocialPostModal";
import { getTikTokFeed } from "@/lib/social-feed";
import type { TikTokPost } from "@/lib/supabase";

// Mismo patrón que InstagramSection: mientras no haya datos reales en
// Supabase (ver `src/lib/tiktok-sync.ts` y SOCIAL_FEEDS_SETUP.md), la
// grilla muestra este set de ejemplo. Nada se rompe sin token de TikTok.
const DEFAULT_POSTS: TikTokPost[] = [
  {
    id: "tt-1",
    cover_url: look2,
    caption:
      "Detrás de cámaras del atelier: drapeado a mano sobre satín pesado. #YEIApparel #TikTokMadeMeBuyIt",
    likes_count: 5200,
    comments_count: 118,
    shares_count: 340,
    share_url: "https://www.tiktok.com/@yei.apparel",
  },
  {
    id: "tt-2",
    cover_url: look3,
    caption: "Get ready with me: sastrería de autor para una noche en Bogotá.",
    likes_count: 8900,
    comments_count: 260,
    shares_count: 512,
    share_url: "https://www.tiktok.com/@yei.apparel",
  },
  {
    id: "tt-3",
    cover_url: look4,
    caption: "Nueva colección 2026, primer vistazo antes del lanzamiento.",
    likes_count: 4100,
    comments_count: 97,
    shares_count: 205,
    share_url: "https://www.tiktok.com/@yei.apparel",
  },
  {
    id: "tt-4",
    cover_url: look5,
    caption: "Cómo cuidamos cada costura: patronaje anatómico en el taller.",
    likes_count: 3300,
    comments_count: 74,
    shares_count: 160,
    share_url: "https://www.tiktok.com/@yei.apparel",
  },
];

export function TikTokSection() {
  const [posts, setPosts] = useState<TikTokPost[]>(DEFAULT_POSTS);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [activePost, setActivePost] = useState<TikTokPost | null>(null);

  // El feed real se lee en el servidor (ver social-feed.ts), igual que
  // en InstagramSection. Si no hay datos aún (o falla), se queda con
  // el set de ejemplo de arriba.
  useEffect(() => {
    let cancelled = false;

    getTikTokFeed()
      .then(({ posts: fetchedPosts }) => {
        if (!cancelled && fetchedPosts.length > 0) setPosts(fetchedPosts);
      })
      .catch((err) => {
        console.warn("[tiktok] no se pudo leer el feed:", err);
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
    <section
      id="tiktok"
      className="relative overflow-hidden bg-nude/50 px-4 py-8 sm:px-6 lg:px-10 lg:py-8"
    >
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rotate-12 rounded-3xl border border-terracota/30 bg-chocolate/5 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 -rotate-12 border border-terracota/10 bg-terracota/5 blur-2xl" />

      {/* Compactado en escritorio, igual que InstagramSection, para que
          la pareja de secciones no cargue tanto visualmente. */}
      <div className="relative mx-auto max-w-[1100px] lg:max-w-[560px]">
        <div className="mx-auto max-w-2xl text-center mb-6 sm:mb-8 lg:mb-5">
          <Reveal>
            <h2 className="font-display text-5xl leading-[0.95] text-chocolate sm:text-7xl lg:text-4xl font-medium">
              TikTok{" "}
              <a
                href="https://www.tiktok.com/@yeiapparel"
                target="_blank"
                rel="noopener noreferrer"
                className="italic text-terracota font-normal hover:text-chocolate transition-colors"
              >
                @yei.apparel
              </a>
            </h2>
          </Reveal>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:gap-3 grid-cols-2 items-stretch">
          {posts.slice(0, 4).map((post, index) => (
            <Reveal key={post.id} delay={index * 40} className="h-full">
              <TikTokCard
                post={post}
                isLiked={likedPosts[post.id] ?? false}
                likeCount={likeCounts[post.id] ?? post.likes_count}
                onToggleLike={() => toggleLike(post.id, post.likes_count)}
                onOpen={() => setActivePost(post)}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Al tocar una publicación de la grilla, se amplía aquí mismo,
          con el reproductor real de TikTok si hay video disponible. */}
      <SocialPostModal
        isOpen={activePost !== null}
        onClose={() => setActivePost(null)}
        media={
          activePost
            ? activePost.video_url
              ? { kind: "iframe", src: activePost.video_url }
              : { kind: "image", src: activePost.cover_url }
            : null
        }
        caption={activePost?.caption ?? ""}
        likesCount={activePost?.likes_count}
        commentsCount={activePost?.comments_count}
        externalUrl={activePost?.share_url ?? "https://www.tiktok.com/@yei.apparel"}
        externalLabel="Ver en TikTok"
        networkLabel="TIKTOK"
      />
    </section>
  );
}

function TikTokCard({
  post,
  isLiked,
  likeCount,
  onToggleLike,
  onOpen,
}: {
  post: TikTokPost;
  isLiked?: boolean;
  likeCount: number;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="notch-frame hover-lift bg-chocolate/15 p-[2px] shadow-xl h-full">
      <div
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen();
        }}
        aria-label="Ampliar publicación"
        className="group relative notch-frame overflow-hidden bg-marfil h-full aspect-square cursor-pointer"
      >
        <img
          src={post.cover_url}
          alt={post.caption}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-marfil/90 text-chocolate">
            <Play className="h-5 w-5 fill-chocolate" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-chocolate/95 via-chocolate/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

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
          <Heart className={`h-4 w-4 ${isLiked ? "fill-marfil" : "text-chocolate"}`} />
        </button>

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
              href={post.share_url ?? "https://www.tiktok.com/@yei.apparel"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="notch-frame-sm bg-terracota text-marfil px-2.5 py-1 text-[10px] tracking-wider hover:bg-terracota/90 transition-colors inline-flex items-center gap-1"
            >
              <span>Ver en TikTok</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
