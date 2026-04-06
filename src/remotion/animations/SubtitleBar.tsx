import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { VIDEO_WIDTH } from "../types";

interface SubtitleBarProps {
  text: string;
  delay?: number;
}

export const SubtitleBar: React.FC<SubtitleBarProps> = ({
  text,
  delay = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const slideUp = spring({
    frame: frame - delay,
    fps,
    config: { mass: 0.4, damping: 14, stiffness: 160 },
  });

  const y = interpolate(slideUp, [0, 1], [50, 0]);
  const opacity = interpolate(slideUp, [0, 1], [0, 1]);

  const progress = interpolate(frame, [delay, durationInFrames - 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      {/* Red progress line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 4,
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, #d32f2f, #e53935)",
        borderRadius: "0 2px 2px 0",
        zIndex: 2,
      }} />
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: "rgba(255,255,255,0.15)",
      }} />

      {/* Subtitle bar */}
      <div style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 60,
      }}>
        <span style={{
          color: "#fff",
          fontSize: 30,
          fontWeight: 600,
          fontFamily: "sans-serif",
          letterSpacing: 0.5,
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}>
          {text}
        </span>
      </div>
    </div>
  );
};
