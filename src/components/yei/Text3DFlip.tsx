"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useAnimate, type AnimationOptions } from "framer-motion";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
};

type StaggerFrom = "first" | "last" | "center" | "random";
type RotateDirection = "top" | "right" | "bottom" | "left";
type AnimationTrigger = "hover" | "enter";
type TextTag =
  "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "div" | "section";
type TransitionValue = AnimationOptions;

type Text3DFlipProps = {
  text?: string;
  font?: FontStyle;
  color?: string;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  animation?: AnimationTrigger;
  tag?: TextTag;
  transition?: TransitionValue;
  rotateDirection?: RotateDirection;
  style?: React.CSSProperties;
  className?: string;
};

const Text3DFlip: React.FC<Text3DFlipProps> = memo(
  ({
    text = "Text 3D Flip",
    font,
    color,
    staggerDuration = 0.05,
    staggerFrom = "first",
    animation = "hover",
    tag: Tag = "h1",
    transition,
    rotateDirection = "bottom",
    style,
    className,
  }) => {
    const [scope, animate] = useAnimate();
    const isHovered = useRef(false);

    const getRotationAngles = useCallback((direction: RotateDirection) => {
      switch (direction) {
        case "top":
          return { start: 90, end: 0, rotateAxis: "rotateX" };
        case "bottom":
          return { start: -90, end: 0, rotateAxis: "rotateX" };
        case "left":
          return { start: -90, end: 0, rotateAxis: "rotateY" };
        case "right":
          return { start: 90, end: 0, rotateAxis: "rotateY" };
        default:
          return { start: -90, end: 0, rotateAxis: "rotateX" };
      }
    }, []);

    const splitText = useMemo(() => {
      const result: Array<{ char: string; isSpace: boolean }> = [];
      const parts = text.split(" ");
      parts.forEach((word, wordIndex) => {
        const chars = word.split("");
        chars.forEach((char) => {
          result.push({ char, isSpace: false });
        });
        if (wordIndex < parts.length - 1) {
          result.push({ char: " ", isSpace: true });
        }
      });
      return result;
    }, [text]);

    const calculateStaggerDelay = useCallback(
      (index: number, total: number) => {
        if (staggerFrom === "first") return index * staggerDuration;
        if (staggerFrom === "last")
          return (total - 1 - index) * staggerDuration;
        if (staggerFrom === "center") {
          const center = (total - 1) / 2;
          return Math.abs(center - index) * staggerDuration;
        }
        if (staggerFrom === "random") {
          return Math.random() * total * staggerDuration;
        }
        return index * staggerDuration;
      },
      [staggerFrom, staggerDuration],
    );

    const handleAnimation = useCallback(async () => {
      if (!scope.current) return;
      const elements = scope.current.querySelectorAll(".char");
      const { start, end, rotateAxis } = getRotationAngles(rotateDirection);

      const animations = Array.from(elements).map((element, index) => {
        const delay = calculateStaggerDelay(index, elements.length);
        const options: AnimationOptions = {
          duration: 0.5,
          ease: [0.33, 1, 0.68, 1],
          delay,
          ...transition,
        };

        return async () => {
          await animate(
            element,
            { [rotateAxis]: start, opacity: 0 },
            { duration: 0, delay: 0 },
          );
          await animate(element, { [rotateAxis]: end, opacity: 1 }, options);
        };
      });

      await Promise.all(animations.map((anim) => anim()));
    }, [
      animate,
      calculateStaggerDelay,
      getRotationAngles,
      rotateDirection,
      scope,
      transition,
    ]);

    useEffect(() => {
      if (animation === "enter") {
        handleAnimation();
      }
    }, [animation, handleAnimation]);

    const handleMouseEnter = () => {
      if (animation === "hover" && !isHovered.current) {
        isHovered.current = true;
        handleAnimation().then(() => {
          isHovered.current = false;
        });
      }
    };

    return (
      <Tag
        ref={scope}
        className={className}
        style={{
          ...font,
          color,
          display: "flex",
          flexWrap: "wrap",
          perspective: "1000px",
          ...style,
        }}
        onMouseEnter={handleMouseEnter}
      >
        {splitText.map((item, index) => (
          <span
            key={index}
            className="char"
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              transformOrigin:
                rotateDirection === "top"
                  ? "50% 100%"
                  : rotateDirection === "bottom"
                    ? "50% 0%"
                    : rotateDirection === "left"
                      ? "100% 50%"
                      : "0% 50%",
              opacity: animation === "enter" ? 0 : 1,
            }}
          >
            {item.char}
          </span>
        ))}
      </Tag>
    );
  },
);

Text3DFlip.displayName = "Text3DFlip";

export default Text3DFlip;
