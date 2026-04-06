import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, CardGridData } from "../types";

const DEFAULT_DATA: CardGridData = {
  layout: "cardGrid",
  title: "주요 기능",
  cards: [
    { number: 1, title: "Claude #1", description: "첫 번째 기능" },
    { number: 2, title: "Claude #2", description: "두 번째 기능" },
    { number: 3, title: "Claude #3", description: "세 번째 기능" },
  ],
  columns: 3,
};

const LoadingSpinner: React.FC<{ progress: number }> = ({ progress }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    style={{
      opacity: interpolate(progress, [0, 1], [0, 1]),
      transform: `rotate(${interpolate(progress, [0, 1], [0, 360])}deg)`,
    }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke={DARK_MINT.accent.primary}
      strokeWidth="2"
      strokeDasharray="40 20"
      strokeLinecap="round"
    />
  </svg>
);

interface CardProps {
  card: CardGridData["cards"][number];
  index: number;
  progress: number;
  fontFamily: string;
}

const Card: React.FC<CardProps> = ({ card, index, progress, fontFamily }) => (
  <div
    style={{
      background: DARK_MINT.bg.card,
      borderRadius: 16,
      border: `1px solid ${DARK_MINT.border.default}`,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      opacity: interpolate(progress, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
      boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px ${DARK_MINT.accent.glowLight}`,
    }}
  >
    {/* Header with number/icon */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {card.number !== undefined && (
        <span
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: DARK_MINT.text.secondary,
            background: DARK_MINT.bg.secondary,
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          #{card.number}
        </span>
      )}
      {card.icon ? (
        <span style={{ fontSize: 20 }}>{card.icon}</span>
      ) : (
        <LoadingSpinner progress={progress} />
      )}
    </div>

    {/* Title */}
    <h3
      style={{
        fontFamily,
        fontSize: 22,
        fontWeight: 700,
        color: DARK_MINT.text.primary,
        margin: 0,
        lineHeight: 1.3,
      }}
    >
      {card.title}
    </h3>

    {/* Description */}
    {card.description && (
      <p
        style={{
          fontFamily,
          fontSize: 15,
          fontWeight: 400,
          color: DARK_MINT.text.secondary,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {card.description}
      </p>
    )}
  </div>
);

export const CardGridStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "cardGrid"
    ? scene.infographicData
    : DEFAULT_DATA) as CardGridData;

  const columns = data.columns ?? 3;
  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 48,
            color: DARK_MINT.text.primary,
            marginBottom: 48,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {data.title}
        </h1>

        {/* Card Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 24,
            flex: 1,
            alignContent: "start",
          }}
        >
          {data.cards.map((card, i) => {
            const cardProgress = spring({
              frame: frame - 12 - i * 5,
              fps,
              config: { damping: 22, stiffness: 70 },
            });
            return (
              <Card
                key={i}
                card={card}
                index={i}
                progress={cardProgress}
                fontFamily={fontFamily}
              />
            );
          })}
        </div>
      </div>
    </DarkMintBg>
  );
};
