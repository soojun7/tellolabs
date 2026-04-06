import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  scale?: boolean;
  style?: React.CSSProperties;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = "up",
  distance = 40,
  scale = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { mass: 0.8, damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const translateMap = {
    up: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
    down: `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
    left: `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`,
    right: `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
    none: "",
  };

  const scaleVal = scale
    ? `scale(${interpolate(progress, [0, 1], [0.92, 1])})`
    : "";

  return (
    <div
      style={{
        opacity,
        transform: `${translateMap[direction]} ${scaleVal}`.trim(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
