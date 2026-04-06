import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

interface HighlightTextProps {
  text: string;
  keywords: string[];
  delay?: number;
  fontSize?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  style?: React.CSSProperties;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  keywords,
  delay = 10,
  fontSize = 38,
  lineHeight = 1.6,
  textAlign = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { mass: 0.6, damping: 13, stiffness: 110 },
  });

  const opacity = interpolate(reveal, [0, 1], [0, 1]);
  const y = interpolate(reveal, [0, 1], [20, 0]);

  const parts = splitByKeywords(text, keywords);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        textAlign,
        ...style,
      }}
    >
      {parts.map((part, i) => (
        <span
          key={i}
          style={{
            color: part.highlight ? "#f9e000" : "#ffffff",
            fontWeight: part.highlight ? 900 : 600,
            fontSize,
            lineHeight,
            fontFamily: "sans-serif",
            textShadow: part.highlight
              ? "0 2px 12px rgba(249,224,0,0.3)"
              : "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {part.text}
        </span>
      ))}
    </div>
  );
};

function splitByKeywords(
  text: string,
  keywords: string[],
): { text: string; highlight: boolean }[] {
  if (!keywords.length) return [{ text, highlight: false }];

  const pattern = keywords
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      text: p,
      highlight: keywords.some(
        (kw) => kw.toLowerCase() === p.toLowerCase(),
      ),
    }));
}
