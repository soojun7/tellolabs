import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { PaperBg } from "./PaperBg";
import { getFontFamily } from "../fonts";
import type { SceneData, LineChartData } from "../types";

const DEFAULT_DATA: LineChartData = {
  layout: "lineChart",
  title: "추이 그래프",
  yMax: 100,
  points: [
    { x: "1월", y: 60 },
    { x: "3월", y: 72 },
    { x: "5월", y: 55 },
    { x: "7월", y: 80 },
    { x: "9월", y: 45 },
    { x: "11월", y: 40 },
  ],
  annotations: [{ xIndex: 1, label: "급등" }],
  lineColor: "#e53935",
};

const CHART_LEFT = 100;
const CHART_TOP = 130;
const CHART_RIGHT = 1820;
const CHART_BOTTOM = 880;
const CHART_W = CHART_RIGHT - CHART_LEFT;
const CHART_H = CHART_BOTTOM - CHART_TOP;

export const LineChartStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "lineChart"
    ? scene.infographicData
    : DEFAULT_DATA) as LineChartData;

  const lineColor = data.lineColor ?? "#e53935";
  const points = data.points;
  const yMax = data.yMax || 100;

  const titleProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const drawProgress = interpolate(frame, [15, durationInFrames - 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const coords = points.map((p, i) => ({
    x: CHART_LEFT + (i / Math.max(points.length - 1, 1)) * CHART_W,
    y: CHART_BOTTOM - (p.y / yMax) * CHART_H,
  }));

  let pathD = "";
  coords.forEach((c, i) => {
    if (i === 0) {
      pathD += `M ${c.x} ${c.y}`;
    } else {
      const prev = coords[i - 1];
      const cpx1 = prev.x + (c.x - prev.x) * 0.4;
      const cpx2 = prev.x + (c.x - prev.x) * 0.6;
      pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${c.y}, ${c.x} ${c.y}`;
    }
  });

  const areaD =
    pathD +
    ` L ${coords[coords.length - 1].x} ${CHART_BOTTOM} L ${coords[0].x} ${CHART_BOTTOM} Z`;

  const pathLength = CHART_W * 2;
  const dashOffset = pathLength * (1 - drawProgress);

  const yTicks = 5;

  return (
    <PaperBg>
      <div style={{ position: "absolute", inset: 0 }}>
        {/* 제목 */}
        <h1
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 38,
            color: "#1a1a1a",
            textAlign: "center",
            marginTop: 50,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
          }}
        >
          {data.title}
        </h1>

        <svg
          viewBox={`0 0 1920 1080`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* Y축 눈금선 + 라벨 */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = Math.round((yMax / yTicks) * i);
            const y = CHART_BOTTOM - (val / yMax) * CHART_H;
            return (
              <g key={i}>
                <line
                  x1={CHART_LEFT}
                  y1={y}
                  x2={CHART_RIGHT}
                  y2={y}
                  stroke="#ddd"
                  strokeWidth={1}
                />
                <text
                  x={CHART_LEFT - 14}
                  y={y + 5}
                  textAnchor="end"
                  fill="#999"
                  fontSize={16}
                  fontFamily={fontFamily}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X축 라벨 */}
          {points.map((p, i) => (
            <text
              key={i}
              x={coords[i].x}
              y={CHART_BOTTOM + 32}
              textAnchor="middle"
              fill="#999"
              fontSize={15}
              fontFamily={fontFamily}
            >
              {p.x}
            </text>
          ))}

          {/* 영역 채우기 */}
          <path
            d={areaD}
            fill={`${lineColor}18`}
            strokeDasharray={pathLength}
            strokeDashoffset={dashOffset}
          />

          {/* 메인 라인 */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={dashOffset}
          />

          {/* 주석 */}
          {data.annotations?.map((ann, i) => {
            const idx = Math.min(ann.xIndex, coords.length - 1);
            const cx = coords[idx].x;
            const cy = coords[idx].y;
            const pointDrawRatio = idx / Math.max(points.length - 1, 1);
            const isVisible = drawProgress > pointDrawRatio;

            const annProgress = spring({
              frame: frame - (20 + pointDrawRatio * (durationInFrames - 50)),
              fps,
              config: { damping: 22, stiffness: 80 },
            });

            return (
              <g
                key={i}
                opacity={isVisible ? interpolate(annProgress, [0, 1], [0, 1]) : 0}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="#fff"
                  stroke={lineColor}
                  strokeWidth={3}
                />
                <text
                  x={cx}
                  y={cy - 20}
                  textAnchor="middle"
                  fill="#1a1a1a"
                  fontSize={18}
                  fontWeight={700}
                  fontFamily={fontFamily}
                >
                  {ann.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </PaperBg>
  );
};
