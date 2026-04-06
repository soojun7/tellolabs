import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BlurBg } from "./BlurBg";
import { pickHighlightWords, refineForDisplay } from "../textUtils";
import { renderHighlighted } from "./renderHighlight";
import { getFontFamily } from "../fonts";
import type { SceneData } from "../types";

export const BottomCaptionStyle: React.FC<{ scene: SceneData }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = scene.mainImage || scene.backgroundImage;

  const { displayText } = scene.displayText
    ? { displayText: scene.displayText }
    : refineForDisplay(scene.line, scene.keywords, "bottomCaption");

  const highlights = pickHighlightWords(displayText, scene.keywords);
  const hlColor = scene.highlightColor ?? "#FFD600";
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const textProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 24, stiffness: 70 },
  });
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [40, 0]);

  const len = displayText.length;
  const autoSize = len > 80 ? 28 : len > 50 ? 32 : 36;
  const fontSize = scene.fontSize ?? autoSize;

  return (
    <BlurBg src={bg} brightness={0.55} blur={0} overlay="none" fadeEnabled={scene.fadeEnabled === true}>
      {/* 하단 그라데이션 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <p
          style={{
            fontFamily,
            fontWeight: 600,
            fontSize,
            color: "#ffffff",
            lineHeight: 1.7,
            letterSpacing: -0.3,
            textShadow: "0 2px 16px rgba(0,0,0,0.7)",
            margin: 0,
            wordBreak: "keep-all",
            textAlign: "center",
            maxWidth: 1600,
            padding: "0 80px",
          }}
        >
          {renderHighlighted(displayText, highlights, hlColor)}
        </p>
      </div>
    </BlurBg>
  );
};
