import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { PaperBg } from "./PaperBg";
import { getFontFamily } from "../fonts";
import type { SceneData, ComparisonData } from "../types";

const DEFAULT_DATA: ComparisonData = {
  layout: "comparison",
  title: "비교",
  leftCard: { label: "항목 A", color: "#e53935", items: ["내용 1", "내용 2"], summary: "요약 A" },
  rightCard: { label: "항목 B", color: "#1e88e5", items: ["내용 1", "내용 2"], summary: "요약 B" },
};

const Card: React.FC<{
  card: ComparisonData["leftCard"];
  progress: number;
  fontFamily: string;
}> = ({ card, progress, fontFamily }) => (
  <div
    style={{
      flex: 1,
      background: "#fff",
      borderRadius: 24,
      border: `4px solid ${card.color}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "36px 40px",
      opacity: interpolate(progress, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
      boxShadow: "0 6px 30px rgba(0,0,0,0.06)",
    }}
  >
    {/* 라벨 (상단) */}
    <div
      style={{
        fontFamily,
        fontWeight: 700,
        fontSize: 32,
        color: card.color,
        textAlign: "center",
        paddingBottom: 16,
        borderBottom: `3px solid ${card.color}22`,
        width: "100%",
        marginBottom: 24,
      }}
    >
      {card.label}
    </div>

    {/* items */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        marginBottom: 32,
      }}
    >
      {card.items.map((item, i) => {
        const hasNumber = /\d/.test(item);
        return (
          <p
            key={i}
            style={{
              fontFamily,
              fontSize: hasNumber ? 36 : 28,
              fontWeight: hasNumber ? 700 : 400,
              color: hasNumber ? "#333" : "#777",
              lineHeight: 1.5,
              margin: 0,
              textAlign: "center",
            }}
          >
            {item}
          </p>
        );
      })}
    </div>

    {/* summary (중앙 크게) */}
    <p
      style={{
        fontFamily,
        fontWeight: 900,
        fontSize: 64,
        color: "#1a1a1a",
        textAlign: "center",
        margin: 0,
        lineHeight: 1.2,
        letterSpacing: -1,
      }}
    >
      {card.summary}
    </p>
  </div>
);

export const ComparisonStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "comparison"
    ? scene.infographicData
    : DEFAULT_DATA) as ComparisonData;

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const leftProgress = spring({ frame: frame - 12, fps, config: { damping: 22, stiffness: 70 } });
  const rightProgress = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 70 } });
  const footerProgress = spring({ frame: frame - 30, fps, config: { damping: 22, stiffness: 70 } });

  return (
    <PaperBg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "55px 70px",
        }}
      >
        {/* 제목 */}
        <h1
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 54,
            color: "#1a1a1a",
            textAlign: "center",
            marginBottom: 40,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {data.title}
        </h1>

        {/* 카드 영역 */}
        <div style={{ display: "flex", gap: 40, flex: 1 }}>
          <Card card={data.leftCard} progress={leftProgress} fontFamily={fontFamily} />
          <Card card={data.rightCard} progress={rightProgress} fontFamily={fontFamily} />
        </div>

        {/* 하단 바 */}
        {data.footer && (
          <div
            style={{
              marginTop: 28,
              background: "#f0efec",
              borderRadius: 16,
              padding: "18px 36px",
              textAlign: "center",
              opacity: interpolate(footerProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(footerProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <p style={{ fontFamily, fontSize: 26, color: "#555", margin: 0 }}>
              {data.footer}
            </p>
          </div>
        )}
      </div>
    </PaperBg>
  );
};
