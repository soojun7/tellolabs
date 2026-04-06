import React from "react";
import { Img, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT } from "../types";

interface BlurBgProps {
  src: string;
  brightness?: number;
  blur?: number;
  overlay?: "gradient" | "dark" | "subtle" | "none";
  fadeEnabled?: boolean;
  children: React.ReactNode;
}

export const BlurBg: React.FC<BlurBgProps> = ({
  src,
  brightness = 0.7,
  blur = 0,
  overlay = "gradient",
  fadeEnabled = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let fadeOut = 1;
  if (fadeEnabled) {
    const fadeOutStart = durationInFrames - 15;
    fadeOut = interpolate(
      frame,
      [fadeOutStart, durationInFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  const slowZoom = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });

  const overlays: Record<string, string> = {
    gradient:
      "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.7) 100%)",
    dark: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 100%)",
    subtle: "rgba(0,0,0,0.15)",
    none: "transparent",
  };

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#1a1a1a",
        opacity: fadeOut,
      }}
    >
      {src && (
        <Img
          src={src}
          style={{
            position: "absolute",
            inset: -30,
            width: VIDEO_WIDTH + 60,
            height: VIDEO_HEIGHT + 60,
            objectFit: "cover",
            filter: blur > 0
              ? `blur(${blur}px) brightness(${brightness}) saturate(1.2)`
              : `brightness(${brightness}) saturate(1.2)`,
            transform: `scale(${slowZoom})`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: overlays[overlay] ?? "transparent",
        }}
      />

      {/* 은은한 대각선 메시 패턴 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.15) 2px,
            rgba(255,255,255,0.15) 3px
          ), repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.15) 2px,
            rgba(255,255,255,0.15) 3px
          )`,
          backgroundSize: "6px 6px",
          pointerEvents: "none",
        }}
      />

      {children}
    </div>
  );
};
