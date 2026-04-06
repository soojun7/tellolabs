import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BlurBg } from "./BlurBg";
import { pickHighlightWords, refineForDisplay } from "../textUtils";
import { renderHighlighted } from "./renderHighlight";
import { getFontFamily } from "../fonts";
import type { SceneData } from "../types";

export const QuoteStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = scene.mainImage || scene.backgroundImage;

  const { displayText } = scene.displayText
    ? { displayText: scene.displayText }
    : refineForDisplay(scene.line, scene.keywords, "quote");

  const highlights = pickHighlightWords(displayText, scene.keywords);
  const hlColor = scene.highlightColor ?? "#FFD600";

  const containerFade = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const textProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 26, stiffness: 60, mass: 0.8 },
  });
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);

  const labelProgress = spring({
    frame: frame - 18,
    fps,
    config: { damping: 22, stiffness: 70 },
  });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelX = interpolate(labelProgress, [0, 1], [-20, 0]);

  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const len = displayText.length;
  const autoSize = len > 80 ? 32 : len > 60 ? 36 : len > 40 ? 40 : 44;
  const fontSize = scene.fontSize ?? autoSize;

  const sourceLabel = scene.sourceLabel;
  const hasLabel = sourceLabel && sourceLabel.trim().length > 0;

  return (
    <BlurBg src={bg} brightness={0.35} blur={6} overlay="dark" fadeEnabled={scene.fadeEnabled === true}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 120px",
          opacity: containerFade,
        }}
      >
        {/* 인용문 텍스트 */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            maxWidth: 1400,
          }}
        >
          <p
            style={{
              fontFamily,
              fontWeight: 600,
              fontSize,
              color: "#ffffff",
              lineHeight: 1.8,
              letterSpacing: -0.5,
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
              margin: 0,
              wordBreak: "keep-all",
              textAlign: "center",
            }}
          >
            {renderHighlighted(displayText, highlights, hlColor)}
          </p>
        </div>
      </div>

      {/* 출처 라벨 (테이프 스타일) */}
      {hasLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: 60,
            opacity: labelOpacity,
            transform: `translateX(${labelX}px)`,
          }}
        >
          {sourceLabel.split("\n").map((labelLine, li) => (
            <div
              key={li}
              style={{
                display: "inline-block",
                marginBottom: li === 0 ? 6 : 0,
                marginRight: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontFamily,
                  fontWeight: li === 0 ? 400 : 700,
                  fontSize: li === 0 ? 16 : 22,
                  color: "#1a1a1a",
                  background: "rgba(255,255,255,0.92)",
                  padding: li === 0 ? "4px 14px" : "6px 18px",
                  borderRadius: 2,
                  boxShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                  transform: `rotate(${li === 0 ? -1.5 : -0.8}deg)`,
                  letterSpacing: -0.3,
                }}
              >
                {labelLine}
              </span>
            </div>
          ))}
        </div>
      )}
    </BlurBg>
  );
};
