import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, OrchestraData } from "../types";

const DEFAULT_DATA: OrchestraData = {
  layout: "orchestra",
  centerLabel: "Claude",
  centerSubLabel: "AI Assistant",
  nodes: [
    { label: "기획", icon: "📋" },
    { label: "디자인", icon: "🎨" },
    { label: "코딩", icon: "💻" },
    { label: "검토", icon: "🔍" },
    { label: "정리", icon: "📁" },
  ],
};

interface NodeProps {
  node: OrchestraData["nodes"][number];
  index: number;
  total: number;
  progress: number;
  fontFamily: string;
  centerX: number;
  centerY: number;
  radius: number;
}

const OrbitNode: React.FC<NodeProps> = ({
  node,
  index,
  total,
  progress,
  fontFamily,
  centerX,
  centerY,
  radius,
}) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        opacity: interpolate(progress, [0, 1], [0, 1]),
      }}
    >
      <div
        style={{
          background: DARK_MINT.bg.card,
          borderRadius: 16,
          border: `1px solid ${DARK_MINT.border.default}`,
          padding: "16px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3)`,
          transform: `scale(${interpolate(progress, [0, 1], [0.5, 1])})`,
        }}
      >
        {node.icon && (
          <span style={{ fontSize: 28 }}>{node.icon}</span>
        )}
        <span
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: DARK_MINT.text.primary,
            whiteSpace: "nowrap",
          }}
        >
          {node.label}
        </span>
      </div>
    </div>
  );
};

export const OrchestraStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "orchestra"
    ? scene.infographicData
    : DEFAULT_DATA) as OrchestraData;

  const centerX = 960;
  const centerY = 540;
  const orbitRadius = 320;

  const centerProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const lineProgress = spring({ frame: frame - 12, fps, config: { damping: 25, stiffness: 50 } });

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* Connection lines (dashed) */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {data.nodes.map((node, i) => {
            const angle = (i / data.nodes.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + Math.cos(angle) * orbitRadius;
            const y = centerY + Math.sin(angle) * orbitRadius;

            const lineLength = Math.sqrt(
              Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            const dashOffset = interpolate(lineProgress, [0, 1], [lineLength, 0]);

            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={DARK_MINT.accent.primary}
                strokeWidth={2}
                strokeDasharray="8 8"
                strokeDashoffset={dashOffset}
                opacity={0.4}
              />
            );
          })}

          {/* Orbit circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={orbitRadius}
            fill="none"
            stroke={DARK_MINT.border.default}
            strokeWidth={1}
            strokeDasharray="4 8"
            opacity={interpolate(lineProgress, [0, 1], [0, 0.5])}
          />
        </svg>

        {/* Center node */}
        <div
          style={{
            position: "absolute",
            left: centerX,
            top: centerY,
            transform: "translate(-50%, -50%)",
            opacity: interpolate(centerProgress, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${DARK_MINT.accent.primary}, ${DARK_MINT.accent.secondary})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 60px ${DARK_MINT.accent.glow}, 0 8px 40px rgba(0, 0, 0, 0.4)`,
              transform: `scale(${interpolate(centerProgress, [0, 1], [0.5, 1])})`,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 28,
                fontWeight: 800,
                color: DARK_MINT.bg.primary,
                textAlign: "center",
              }}
            >
              {data.centerLabel}
            </span>
            {data.centerSubLabel && (
              <span
                style={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 500,
                  color: DARK_MINT.bg.secondary,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {data.centerSubLabel}
              </span>
            )}
          </div>
        </div>

        {/* Orbit nodes */}
        {data.nodes.map((node, i) => {
          const nodeProgress = spring({
            frame: frame - 20 - i * 4,
            fps,
            config: { damping: 22, stiffness: 70 },
          });
          return (
            <OrbitNode
              key={i}
              node={node}
              index={i}
              total={data.nodes.length}
              progress={nodeProgress}
              fontFamily={fontFamily}
              centerX={centerX}
              centerY={centerY}
              radius={orbitRadius}
            />
          );
        })}
      </div>
    </DarkMintBg>
  );
};
