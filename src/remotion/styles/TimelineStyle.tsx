import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, TimelineData } from "../types";

const DEFAULT_DATA: TimelineData = {
  layout: "timeline",
  title: "개발 프로세스",
  steps: [
    { number: 1, title: "요구사항 분석", description: "프로젝트 범위 정의" },
    { number: 2, title: "설계", description: "아키텍처 설계", highlight: true },
    { number: 3, title: "구현", description: "코드 작성" },
    { number: 4, title: "테스트", description: "품질 검증" },
    { number: 5, title: "배포", description: "프로덕션 릴리스" },
  ],
};

interface StepProps {
  step: TimelineData["steps"][number];
  index: number;
  total: number;
  progress: number;
  fontFamily: string;
}

const TimelineStep: React.FC<StepProps> = ({
  step,
  index,
  total,
  progress,
  fontFamily,
}) => {
  const isHighlighted = step.highlight;
  const isLast = index === total - 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [-40, 0])}px)`,
      }}
    >
      {/* Number circle and line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isHighlighted
              ? `linear-gradient(135deg, ${DARK_MINT.accent.primary}, ${DARK_MINT.accent.secondary})`
              : DARK_MINT.bg.card,
            border: `2px solid ${isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.border.default}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isHighlighted
              ? `0 0 30px ${DARK_MINT.accent.glow}`
              : "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 22,
              fontWeight: 700,
              color: isHighlighted ? DARK_MINT.bg.primary : DARK_MINT.text.primary,
            }}
          >
            {step.number}
          </span>
        </div>

        {/* Connecting line */}
        {!isLast && (
          <div
            style={{
              width: 2,
              height: 40,
              background: `linear-gradient(to bottom, ${DARK_MINT.border.default}, transparent)`,
              marginTop: 8,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : 32,
        }}
      >
        <h3
          style={{
            fontFamily,
            fontSize: 26,
            fontWeight: 700,
            color: isHighlighted ? DARK_MINT.accent.primary : DARK_MINT.text.primary,
            margin: 0,
            marginBottom: step.description ? 8 : 0,
          }}
        >
          {step.title}
        </h3>
        {step.description && (
          <p
            style={{
              fontFamily,
              fontSize: 18,
              fontWeight: 400,
              color: DARK_MINT.text.secondary,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
};

export const TimelineStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "timeline"
    ? scene.infographicData
    : DEFAULT_DATA) as TimelineData;

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

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
        {/* Title */}
        {data.title && (
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
        )}

        {/* Timeline steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {data.steps.map((step, i) => {
            const stepProgress = spring({
              frame: frame - 12 - i * 6,
              fps,
              config: { damping: 22, stiffness: 70 },
            });
            return (
              <TimelineStep
                key={i}
                step={step}
                index={i}
                total={data.steps.length}
                progress={stepProgress}
                fontFamily={fontFamily}
              />
            );
          })}
        </div>
      </div>
    </DarkMintBg>
  );
};
