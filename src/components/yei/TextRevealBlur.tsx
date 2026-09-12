"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type AnimationPlaybackControls,
} from "framer-motion";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
  variant?: string;
};

type TransitionValue = {
  type?: string;
  duration?: number;
  delay?: number;
  ease?: string | number[];
  staggerChildren?: number;
};

type Props = {
  prefix?: string;
  texts?: string[];
  font?: FontStyle;
  color?: string;
  prefixColor?: string;
  wipeColor?: string;
  wipeBackground?: string;
  revealColor?: string;
  revealBackground?: string;
  blobSize?: number;
  blobPosition?: number;
  blur?: number;
  transition?: TransitionValue;
  style?: React.CSSProperties;
  className?: string;
};

type CharMetrics = {
  left: number;
  right: number;
};

const CharComponent = ({
  char,
  index,
  progress,
  charMetrics,
  totalWidth,
  blur,
}: {
  char: string;
  index: number;
  progress: MotionValue<number>;
  charMetrics: CharMetrics[];
  totalWidth: number;
  blur: number;
}) => {
  const filter = useTransform(progress, (p: number) => {
    if (charMetrics.length === 0 || !charMetrics[index])
      return `blur(${blur}px)`;
    const currentX = p * totalWidth;
    const charCenter = (charMetrics[index].left + charMetrics[index].right) / 2;
    const distance = Math.abs(currentX - charCenter);
    const maxDistance = totalWidth / 2;
    const blurAmount = Math.max(0, blur * (1 - distance / maxDistance));
    return `blur(${blurAmount}px)`;
  });

  return (
    <motion.span
      style={{
        display: "inline-block",
        filter,
      }}
    >
      {char}
    </motion.span>
  );
};

const TextRevealBlur: React.FC<Props> = ({
  prefix = "Text Reveal",
  texts = ["First Text", "Second Text", "Third Text"],
  font,
  color,
  prefixColor,
  wipeColor = "white",
  wipeBackground = "transparent",
  revealColor = "white",
  revealBackground = "transparent",
  blobSize = 600,
  blobPosition = -600,
  blur = 6,
  transition = {
    duration: 1.5,
    delay: 0,
    ease: "easeInOut",
  },
  style,
  className,
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const progress = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [charMetrics, setCharMetrics] = useState<CharMetrics[]>([]);
  const [totalWidth, setTotalWidth] = useState(0);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);

  useLayoutEffect(() => {
    if (textRef.current) {
      const chars = textRef.current.children;
      let width = 0;
      const metrics: CharMetrics[] = [];
      for (let i = 0; i < chars.length; i++) {
        const rect = chars[i].getBoundingClientRect();
        metrics.push({
          left: width,
          right: width + rect.width,
        });
        width += rect.width;
      }
      setCharMetrics(metrics);
      setTotalWidth(width);
    }
  }, [currentTextIndex, texts]);

  const xPosition = useTransform(
    progress,
    [0, 1],
    [
      blobPosition - blobSize / 2,
      totalWidth + Math.abs(blobPosition) - blobSize / 2,
    ],
  );

  const startAnimation = useCallback(() => {
    progress.set(0);
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animationRef.current = animate(progress, 1, {
      duration: transition.duration,
      delay: transition.delay,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ease: transition.ease as any,
      onComplete: () => {
        setTimeout(() => {
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }, 1000);
      },
    });
  }, [progress, transition, texts.length]);

  useEffect(() => {
    startAnimation();
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [startAnimation, currentTextIndex]);

  const currentTextChars = useMemo(() => {
    return texts[currentTextIndex].split("");
  }, [texts, currentTextIndex]);

  const maskImage = useTransform(
    xPosition,
    (x) =>
      `radial-gradient(circle ${
        blobSize / 2
      }px at ${x}px 50%, transparent 20%, black 100%)`,
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color,
        ...font,
        ...style,
      }}
    >
      {prefix && (
        <span
          style={{
            marginRight: "0.25em",
            color: prefixColor || color,
          }}
        >
          {prefix}
        </span>
      )}
      <div style={{ position: "relative" }}>
        <span
          ref={textRef}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            color: revealColor,
            backgroundColor: revealBackground,
            padding: "0 0.1em",
          }}
        >
          {currentTextChars.map((char, index) => (
            <CharComponent
              key={`${currentTextIndex}-${index}`}
              char={char}
              index={index}
              progress={progress}
              charMetrics={charMetrics}
              totalWidth={totalWidth}
              blur={blur}
            />
          ))}
        </span>
        <motion.span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "inline-block",
            whiteSpace: "pre",
            color: wipeColor,
            backgroundColor: wipeBackground,
            padding: "0 0.1em",
            WebkitMaskImage: maskImage,
            maskImage: maskImage,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {currentTextChars.map((char, index) => (
            <span key={`wipe-${index}`} style={{ display: "inline-block" }}>
              {char}
            </span>
          ))}
        </motion.span>
      </div>
    </div>
  );
};

export default TextRevealBlur;
