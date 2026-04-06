import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, ChecklistData } from "../types";

const DEFAULT_DATA: ChecklistData = {
  layout: "checklist",
  title: "완료 항목",
  items: [
    { text: "프로젝트 설정", checked: true },
    { text: "데이터베이스 연동", checked: true },
    { text: "API 구현", checked: true },
    { text: "프론트엔드 개발", checked: false },
    { text: "테스트 작성", checked: false },
  ],
};

interface CheckItemProps {
  item: ChecklistData["items"][number];
  index: number;
  progress: number;
  checkProgress: number;
  fontFamily: string;
}

const CheckIcon: React.FC<{ checked: boolean; progress: number }> = ({ checked, progress }) => {
  const strokeDashoffset = interpolate(progress, [0, 1], [24, 0]);

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: checked ? DARK_MINT.accent.primary : DARK_MINT.bg.secondary,
        border: `2px solid ${checked ? DARK_MINT.accent.primary : DARK_MINT.border.default}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: checked ? `0 0 15px ${DARK_MINT.accent.glow}` : "none",
      }}
    >
      {checked && (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            d="M3 9l4 4 8-8"
            fill="none"
            stroke={DARK_MINT.bg.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="24"
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      )}
    </div>
  );
};

const CheckItem: React.FC<CheckItemProps> = ({
  item,
  index,
  progress,
  checkProgress,
  fontFamily,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "20px 28px",
        background: DARK_MINT.bg.card,
        borderRadius: 14,
        border: `1px solid ${item.checked ? DARK_MINT.border.strong : DARK_MINT.border.light}`,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [-30, 0])}px)`,
        boxShadow: item.checked
          ? `0 4px 20px rgba(0, 255, 136, 0.1)`
          : "0 2px 10px rgba(0, 0, 0, 0.2)",
      }}
    >
      <CheckIcon checked={item.checked ?? false} progress={checkProgress} />

      <span
        style={{
          fontFamily,
          fontSize: 24,
          fontWeight: item.checked ? 600 : 400,
          color: item.checked ? DARK_MINT.text.primary : DARK_MINT.text.secondary,
          textDecoration: item.checked ? "none" : "none",
          flex: 1,
        }}
      >
        {item.text}
      </span>

      {item.checked && (
        <span
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            color: DARK_MINT.accent.primary,
            background: `${DARK_MINT.accent.primary}20`,
            padding: "4px 12px",
            borderRadius: 6,
            opacity: interpolate(checkProgress, [0, 1], [0, 1]),
          }}
        >
          완료
        </span>
      )}
    </div>
  );
};

export const ChecklistStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "checklist"
    ? scene.infographicData
    : DEFAULT_DATA) as ChecklistData;

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

  const completedCount = data.items.filter(item => item.checked).length;
  const totalCount = data.items.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "60px 120px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          <h1
            style={{
              fontFamily,
              fontWeight: 700,
              fontSize: 48,
              color: DARK_MINT.text.primary,
              margin: 0,
            }}
          >
            {data.title}
          </h1>

          {/* Progress indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 20,
                fontWeight: 500,
                color: DARK_MINT.text.secondary,
              }}
            >
              {completedCount}/{totalCount}
            </span>
            <div
              style={{
                width: 120,
                height: 8,
                background: DARK_MINT.bg.secondary,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: DARK_MINT.accent.primary,
                  borderRadius: 4,
                  boxShadow: `0 0 10px ${DARK_MINT.accent.glow}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Checklist items */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {data.items.map((item, i) => {
            const itemProgress = spring({
              frame: frame - 12 - i * 5,
              fps,
              config: { damping: 22, stiffness: 70 },
            });
            const checkProgress = spring({
              frame: frame - 20 - i * 5,
              fps,
              config: { damping: 18, stiffness: 100 },
            });
            return (
              <CheckItem
                key={i}
                item={item}
                index={i}
                progress={itemProgress}
                checkProgress={checkProgress}
                fontFamily={fontFamily}
              />
            );
          })}
        </div>
      </div>
    </DarkMintBg>
  );
};
