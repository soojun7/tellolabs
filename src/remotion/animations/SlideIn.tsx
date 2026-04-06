import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  from?: "left" | "right" | "bottom" | "top";
  distance?: number;
  style?: React.CSSProperties;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  delay = 0,
  from = "left",
  distance = 80,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { mass: 0.6, damping: 14, stiffness: 120 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const axis = from === "left" || from === "right" ? "X" : "Y";
  const sign = from === "left" || from === "top" ? -1 : 1;
  const offset = interpolate(progress, [0, 1], [sign * distance, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translate${axis}(${offset}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
