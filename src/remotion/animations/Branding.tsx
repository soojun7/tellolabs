import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

interface BrandingProps {
  category?: string;
}

export const Branding: React.FC<BrandingProps> = ({ category }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - 3,
    fps,
    config: { mass: 0.5, damping: 15, stiffness: 130 },
  });

  const x = interpolate(reveal, [0, 1], [-40, 0]);
  const opacity = interpolate(reveal, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 28,
        left: 28,
        display: "flex",
        alignItems: "center",
        gap: 0,
        transform: `translateX(${x}px)`,
        opacity,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}>
        <span style={{
          color: "#fff",
          fontSize: 26,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -1,
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
        }}>
          텔로스튜디오
        </span>
      </div>

      {/* Red divider */}
      <div style={{
        width: 3,
        height: 22,
        background: "#e53935",
        margin: "0 14px",
        borderRadius: 2,
      }} />

      {/* Category tag */}
      {category && (
        <span style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: 18,
          fontWeight: 500,
          fontFamily: "sans-serif",
          textShadow: "0 1px 6px rgba(0,0,0,0.5)",
        }}>
          {category}
        </span>
      )}
    </div>
  );
};
