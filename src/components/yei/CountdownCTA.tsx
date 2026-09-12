"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export const CountdownCTA = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Target date is 14 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-chocolate text-nude pt-10 pb-14 lg:pb-20 relative overflow-hidden">
      {/* Subtle background noise/texture */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

      <div className="mx-auto max-w-[1500px] px-5 relative z-10 flex flex-col items-center text-center">
        <Reveal className="flex flex-col items-center text-center">
          <span className="eyebrow text-terracota font-bold tracking-[0.2em] mb-4">
            ✦ PRÓXIMO LANZAMIENTO ✦
          </span>

          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-marfil mb-12 max-w-5xl uppercase leading-[0.9]">
            Nueva <br />
            <span className="italic text-terracota">Colección</span>
          </h2>

          <div className="flex gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-marfil mb-16">
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl tabular-nums">
                {String(timeLeft.days).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm tracking-[0.2em] uppercase mt-2 text-nude/70">
                Días
              </span>
            </div>
            <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-terracota opacity-50">
              :
            </span>
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl tabular-nums">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm tracking-[0.2em] uppercase mt-2 text-nude/70">
                Horas
              </span>
            </div>
            <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-terracota opacity-50">
              :
            </span>
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl tabular-nums">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm tracking-[0.2em] uppercase mt-2 text-nude/70">
                Minutos
              </span>
            </div>
            <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-terracota opacity-50 hidden sm:block">
              :
            </span>
            <div className="flex-col items-center hidden sm:flex">
              <span className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl tabular-nums">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm tracking-[0.2em] uppercase mt-2 text-nude/70">
                Segundos
              </span>
            </div>
          </div>

          <button className="group relative overflow-hidden bg-marfil text-chocolate px-8 py-5 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 notch-frame">
            <span className="relative z-10 font-medium tracking-wide uppercase text-sm">
              Notificarme
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 bg-terracota translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
          </button>
        </Reveal>
      </div>
    </section>
  );
};
