import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, BigStatDarkData } from "../types";

const DEFAULT_DATA: BigStatDarkData = {
  layout: "bigStatDark",
  category: "성능 향상",
  number: "2.5",
  unit: "배",
  description: "기존 대비 처리 속도 향상",
  progressValue: 75,
};

export const BigStatDarkStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "bigStatDark"
    ? scene.infographicData
    : DEFAULT_DATA) as BigStatDarkData;

  const badgeProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 90 } });
  const numberProgress = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const descProgress = spring({ frame: frame - 22, fps, config: { damping: 22, stiffness: 70 } });
  const barProgress = spring({ frame: frame - 30, fps, config: { damping: 25, stiffness: 60 } });

  const targetNum = parseFloat(data.number.replace(/[^0-9.]/g, ""));
  const isCountable = !isNaN(targetNum) && targetNum < 10000;
  const currentNum = isCountable
    ? interpolate(numberProgress, [0, 1], [0, targetNum])
    : targetNum;
  const displayNumber = isCountable
    ? (Number.isInteger(targetNum)
        ? Math.round(currentNum).toLocaleString()
        : currentNum.toFixed(1))
    : data.number;

  const numFontSize = data.number.length <= 4 ? 180 : data.number.length <= 8 ? 130 : 100;
  const progressValue = data.progressValue ?? 0;

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 100px",
        }}
      >
        {/* Category badge */}
        {data.category && (
          <div
            style={{
              marginBottom: 32,
              opacity: interpolate(badgeProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(badgeProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 18,
                fontWeight: 600,
                color: DARK_MINT.accent.primary,
                background: `${DARK_MINT.accent.primary}20`,
                padding: "10px 24px",
                borderRadius: 24,
                letterSpacing: 1,
                border: `1px solid ${DARK_MINT.border.default}`,
              }}
            >
              {data.category}
            </span>
          </div>
        )}

        {/* Big number */}
        <div
          style={{
            opacity: interpolate(numberProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numberProgress, [0, 1], [0.7, 1])})`,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: numFontSize,
              color: DARK_MINT.accent.primary,
              letterSpacing: -4,
              lineHeight: 1,
              textShadow: `0 0 60px ${DARK_MINT.accent.glow}, 0 0 120px ${DARK_MINT.accent.glowLight}`,
            }}
          >
            {displayNumber}
          </span>
          {data.unit && (
            <span
              style={{
                fontFamily,
                fontWeight: 700,
                fontSize: numFontSize * 0.45,
                color: DARK_MINT.accent.secondary,
              }}
            >
              {data.unit}
            </span>
          )}
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 28,
            color: DARK_MINT.text.secondary,
            textAlign: "center",
            marginTop: 32,
            lineHeight: 1.5,
            maxWidth: 600,
            opacity: interpolate(descProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          {data.description}
        </p>

        {/* Progress bar */}
        {progressValue > 0 && (
          <div
            style={{
              marginTop: 48,
              width: "100%",
              maxWidth: 500,
              opacity: interpolate(barProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(barProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 500,
                  color: DARK_MINT.text.muted,
                }}
              >
                진행률
              </span>
              <span
                style={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 600,
                  color: DARK_MINT.accent.primary,
                }}
              >
                {Math.round(interpolate(barProgress, [0, 1], [0, progressValue]))}%
              </span>
            </div>
            <div
              style={{
                height: 12,
                background: DARK_MINT.bg.secondary,
                borderRadius: 6,
                overflow: "hidden",
                border: `1px solid ${DARK_MINT.border.light}`,
              }}
            >
              <div
                style={{
                  width: `${interpolate(barProgress, [0, 1], [0, progressValue])}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${DARK_MINT.accent.primary}, ${DARK_MINT.accent.secondary})`,
                  borderRadius: 6,
                  boxShadow: `0 0 20px ${DARK_MINT.accent.glow}`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DarkMintBg>
  );
};
