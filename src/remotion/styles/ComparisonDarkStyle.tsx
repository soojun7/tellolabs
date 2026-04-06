import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, ComparisonDarkData } from "../types";

const DEFAULT_DATA: ComparisonDarkData = {
  layout: "comparisonDark",
  title: "기존 방식 vs 새로운 방식",
  left: {
    icon: "X",
    title: "기존 방식",
    items: ["수동 작업 필요", "오류 발생 가능", "시간 소요"],
    summary: "비효율적",
  },
  right: {
    icon: "O",
    title: "새로운 방식",
    items: ["자동화된 프로세스", "정확한 결과", "빠른 처리"],
    summary: "효율적",
    highlight: true,
  },
};

interface CardSideProps {
  side: ComparisonDarkData["left"] | ComparisonDarkData["right"];
  isRight: boolean;
  progress: number;
  fontFamily: string;
}

const ComparisonCard: React.FC<CardSideProps> = ({
  side,
  isRight,
  progress,
  fontFamily,
}) => {
  const isHighlighted = "highlight" in side && side.highlight;
  const isX = side.icon === "X" || side.icon === "x";

  const iconColor = isHighlighted
    ? DARK_MINT.accent.primary
    : isX
      ? DARK_MINT.status.error
      : DARK_MINT.text.secondary;

  return (
    <div
      style={{
        flex: 1,
        background: DARK_MINT.bg.card,
        borderRadius: 20,
        border: `2px solid ${isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.border.light}`,
        padding: "40px 36px",
        display: "flex",
        flexDirection: "column",
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [isRight ? 40 : -40, 0])}px)`,
        boxShadow: isHighlighted
          ? `0 8px 40px rgba(0, 255, 136, 0.15), 0 0 60px ${DARK_MINT.accent.glowLight}`
          : "0 4px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: `${iconColor}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          alignSelf: "center",
        }}
      >
        {isX ? (
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path
              d="M6 6L22 22M22 6L6 22"
              stroke={iconColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path
              d="M5 14L11 20L23 8"
              fill="none"
              stroke={iconColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 700,
          color: isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.text.primary,
          textAlign: "center",
          margin: 0,
          marginBottom: 28,
        }}
      >
        {side.title}
      </h3>

      {/* Items */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
        }}
      >
        {side.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: DARK_MINT.bg.secondary,
              borderRadius: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.text.muted,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily,
                fontSize: 18,
                fontWeight: 400,
                color: DARK_MINT.text.secondary,
                lineHeight: 1.4,
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      {side.summary && (
        <div
          style={{
            marginTop: 28,
            padding: "16px 24px",
            background: isHighlighted
              ? `${DARK_MINT.accent.primary}15`
              : DARK_MINT.bg.secondary,
            borderRadius: 12,
            borderLeft: `4px solid ${isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.text.muted}`,
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 24,
              fontWeight: 700,
              color: isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.text.primary,
            }}
          >
            {side.summary}
          </span>
        </div>
      )}
    </div>
  );
};

export const ComparisonDarkStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "comparisonDark"
    ? scene.infographicData
    : DEFAULT_DATA) as ComparisonDarkData;

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const leftProgress = spring({ frame: frame - 12, fps, config: { damping: 22, stiffness: 70 } });
  const rightProgress = spring({ frame: frame - 18, fps, config: { damping: 22, stiffness: 70 } });
  const vsProgress = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 100 } });

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "55px 70px",
        }}
      >
        {/* Title */}
        {data.title && (
          <h1
            style={{
              fontFamily,
              fontWeight: 700,
              fontSize: 48,
              color: DARK_MINT.text.primary,
              textAlign: "center",
              marginBottom: 40,
              opacity: interpolate(titleProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
            }}
          >
            {data.title}
          </h1>
        )}

        {/* Cards area */}
        <div
          style={{
            display: "flex",
            gap: 60,
            flex: 1,
            alignItems: "stretch",
            position: "relative",
          }}
        >
          <ComparisonCard
            side={data.left}
            isRight={false}
            progress={leftProgress}
            fontFamily={fontFamily}
          />

          {/* VS divider */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              opacity: interpolate(vsProgress, [0, 1], [0, 1]),
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: DARK_MINT.bg.primary,
                border: `2px solid ${DARK_MINT.border.default}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize: 18,
                  fontWeight: 700,
                  color: DARK_MINT.text.secondary,
                }}
              >
                VS
              </span>
            </div>
          </div>

          <ComparisonCard
            side={data.right}
            isRight={true}
            progress={rightProgress}
            fontFamily={fontFamily}
          />
        </div>
      </div>
    </DarkMintBg>
  );
};
