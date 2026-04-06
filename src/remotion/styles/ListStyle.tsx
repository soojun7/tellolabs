import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { PaperBg } from "./PaperBg";
import { getFontFamily } from "../fonts";
import type { SceneData, ListData } from "../types";

const DEFAULT_DATA: ListData = {
  layout: "list",
  title: "주요 항목",
  items: [
    { label: "항목 1", value: "설명" },
    { label: "항목 2", value: "설명" },
    { label: "항목 3", value: "설명" },
  ],
};

export const ListStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);
  const hlColor = scene.highlightColor ?? "#e53935";

  const data = (scene.infographicData?.layout === "list"
    ? scene.infographicData
    : DEFAULT_DATA) as ListData;

  const titleProgress = spring({
    frame: frame - 4,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  return (
    <PaperBg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "70px 120px",
        }}
      >
        {/* 제목 */}
        <h1
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 40,
            color: "#1a1a1a",
            marginBottom: 40,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {data.title}
        </h1>

        {/* 항목 리스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.items.map((item, i) => {
            const itemProgress = spring({
              frame: frame - 12 - i * 6,
              fps,
              config: { damping: 22, stiffness: 70 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 24px",
                  background: "#fff",
                  borderRadius: 14,
                  borderLeft: `5px solid ${hlColor}`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  opacity: interpolate(itemProgress, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(itemProgress, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontWeight: 800,
                    fontSize: 22,
                    color: hlColor,
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontFamily,
                      fontWeight: 600,
                      fontSize: 22,
                      color: "#1a1a1a",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.value && (
                    <span
                      style={{
                        fontFamily,
                        fontWeight: 400,
                        fontSize: 18,
                        color: "#888",
                        marginLeft: 12,
                      }}
                    >
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PaperBg>
  );
};
