import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { PaperBg } from "./PaperBg";
import { getFontFamily } from "../fonts";
import type { SceneData, BigStatData } from "../types";

const DEFAULT_DATA: BigStatData = {
  layout: "bigStat",
  category: "통계",
  number: "14",
  unit: "배",
  description: "서울 아파트 가격 대비 연소득",
};

export const BigStatStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);
  const hlColor = scene.highlightColor ?? "#e53935";

  const data = (scene.infographicData?.layout === "bigStat"
    ? scene.infographicData
    : DEFAULT_DATA) as BigStatData;

  const badgeProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 90 } });
  const numberProgress = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const descProgress = spring({ frame: frame - 22, fps, config: { damping: 22, stiffness: 70 } });

  const targetNum = parseFloat(data.number.replace(/[^0-9.]/g, ""));
  const isCountable = !isNaN(targetNum) && targetNum < 10000;
  const displayNumber = isCountable
    ? Math.round(interpolate(numberProgress, [0, 1], [0, targetNum])).toLocaleString()
    : data.number;

  const numFontSize = data.number.length <= 4 ? 180 : data.number.length <= 8 ? 130 : 100;

  return (
    <PaperBg>
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
        {/* 카테고리 배지 */}
        {data.category && (
          <div
            style={{
              marginBottom: 24,
              opacity: interpolate(badgeProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(badgeProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 18,
                fontWeight: 600,
                color: "#888",
                background: "#f0efec",
                padding: "8px 20px",
                borderRadius: 20,
                letterSpacing: 1,
              }}
            >
              {data.category}
            </span>
          </div>
        )}

        {/* 큰 숫자 */}
        <div
          style={{
            opacity: interpolate(numberProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numberProgress, [0, 1], [0.7, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: numFontSize,
              color: hlColor,
              letterSpacing: -4,
              lineHeight: 1,
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
                color: hlColor,
                marginLeft: 8,
              }}
            >
              {data.unit}
            </span>
          )}
        </div>

        {/* 설명 */}
        <p
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 28,
            color: "#555",
            textAlign: "center",
            marginTop: 32,
            lineHeight: 1.5,
            opacity: interpolate(descProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          {data.description}
        </p>
      </div>
    </PaperBg>
  );
};
