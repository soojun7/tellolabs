import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface TypingTextProps {
  text: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
  charStyle?: React.CSSProperties;
}

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  delay = 0,
  speed = 1.5,
  style,
  charStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;
  const framesPerChar = fps / (speed * 15);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {text.split("").map((char, i) => {
        const charStart = i * framesPerChar;
        const opacity = interpolate(
          adjustedFrame,
          [charStart, charStart + 3],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const y = interpolate(
          adjustedFrame,
          [charStart, charStart + 4],
          [8, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${y}px)`,
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
              ...charStyle,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
