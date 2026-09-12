import React from "react";

interface GeometricDividerProps {
  variant?: "diamonds" | "stepped" | "rhombus-line" | "crest" | "asymmetric";
  className?: string;
}

export function GeometricDivider({
  variant = "diamonds",
  className = "",
}: GeometricDividerProps) {
  if (variant === "diamonds") {
    return (
      <div
        className={`relative flex items-center justify-center py-2.5 overflow-hidden ${className}`}
      >
        {/* Línea decorativa izquierda con gradiente */}
        <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-chocolate/20 to-chocolate/40" />

        {/* Grupo de rombos geométricos entrelazados */}
        <div className="mx-4 flex items-center gap-2 text-terracota">
          <span className="h-1 w-1 rotate-45 bg-chocolate/30" />
          <span className="h-2 w-2 rotate-45 border border-chocolate/40 bg-marfil" />
          <div className="relative flex items-center justify-center">
            <span className="h-3.5 w-3.5 rotate-45 bg-terracota shadow-sm" />
            <span className="absolute h-1.5 w-1.5 rotate-45 bg-marfil" />
          </div>
          <span className="h-2 w-2 rotate-45 border border-chocolate/40 bg-marfil" />
          <span className="h-1 w-1 rotate-45 bg-chocolate/30" />
        </div>

        {/* Línea decorativa derecha con gradiente */}
        <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-chocolate/20 to-chocolate/40" />
      </div>
    );
  }

  if (variant === "stepped") {
    return (
      <div
        className={`relative flex items-center justify-center py-3 overflow-hidden ${className}`}
      >
        <div className="h-[1px] flex-1 bg-chocolate/15" />
        <div className="mx-5 flex items-center gap-1.5">
          <div className="h-2 w-2 border-t-2 border-l-2 border-chocolate/40" />
          <div className="h-3.5 w-3.5 border border-terracota rotate-45 bg-marfil flex items-center justify-center">
            <span className="h-1.5 w-1.5 bg-terracota" />
          </div>
          <div className="flex flex-col gap-0.5 items-center px-1">
            <span className="h-1 w-5 bg-chocolate/30" />
            <span className="h-1 w-2.5 bg-terracota" />
          </div>
          <div className="h-3.5 w-3.5 border border-terracota rotate-45 bg-marfil flex items-center justify-center">
            <span className="h-1.5 w-1.5 bg-terracota" />
          </div>
          <div className="h-2 w-2 border-b-2 border-r-2 border-chocolate/40" />
        </div>
        <div className="h-[1px] flex-1 bg-chocolate/15" />
      </div>
    );
  }

  if (variant === "asymmetric") {
    return (
      <div
        className={`relative w-full py-3 flex items-center justify-between px-4 sm:px-10 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rotate-45 bg-chocolate" />
          <span className="h-1.5 w-10 bg-chocolate/30" />
          <span className="h-1 w-3 bg-terracota" />
        </div>

        <div className="flex items-center gap-3">
          <span className="h-1 w-8 sm:w-24 bg-gradient-to-r from-transparent to-chocolate/30" />
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rotate-45 bg-terracota" />
            <span className="h-3 w-3 rotate-45 border-2 border-chocolate bg-marfil" />
            <span className="h-1.5 w-1.5 rotate-45 bg-terracota" />
          </div>
          <span className="h-1 w-8 sm:w-24 bg-gradient-to-l from-transparent to-chocolate/30" />
        </div>

        <div className="flex items-center gap-2">
          <span className="h-1 w-3 bg-terracota" />
          <span className="h-1.5 w-10 bg-chocolate/30" />
          <span className="h-2.5 w-2.5 rotate-45 bg-chocolate" />
        </div>
      </div>
    );
  }

  // Default rhombus-line
  return (
    <div
      className={`relative flex items-center justify-center py-3 overflow-hidden ${className}`}
    >
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-chocolate/25" />
      <div className="mx-4 flex items-center gap-2 text-chocolate">
        <span className="font-mono text-[10px] tracking-[0.3em] text-terracota font-bold">
          ✦ YEI · ATELIER ✦
        </span>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-chocolate/25" />
    </div>
  );
}
