export function Marquee({
  tone = "chocolate",
}: {
  tone?: "chocolate" | "terracota";
}) {
  const items = Array.from({ length: 10 });
  const bg = tone === "chocolate" ? "bg-chocolate" : "bg-terracota";

  return (
    <div
      className={`${bg} overflow-hidden py-3 text-marfil`}
      aria-hidden="true"
    >
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {items.concat(items).map((_, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-lg tracking-[0.3em]">
              YEI APPAREL
            </span>
            <span className="text-xs opacity-70">✦</span>
            <span className="label-xs opacity-90">Colección 2026</span>
            <span className="text-xs opacity-70">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
