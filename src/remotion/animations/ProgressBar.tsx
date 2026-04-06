import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { DARK_MINT } from "../themes/darkMint";

interface Segment {
  label?: string;
  startFrame: number;
  endFrame: number;
}

interface ProgressBarProps {
  segments?: Segment[];
  height?: number;
  showDot?: boolean;
  dotColor?: string;
  barColor?: string;
  bgColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  segments,
  height = 4,
  showDot = true,
  dotColor = DARK_MINT.status.error,
  barColor = DARK_MINT.status.error,
  bgColor = DARK_MINT.bg.secondary,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height,
        background: bgColor,
      }}
    >
      {/* Segment markers */}
      {segments && segments.length > 0 && (
        <>
          {segments.map((segment, i) => {
            const segmentStart = segment.startFrame / durationInFrames;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${segmentStart * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: DARK_MINT.border.default,
                }}
              />
            );
          })}
        </>
      )}

      {/* Progress fill */}
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: barColor,
          position: "relative",
        }}
      >
        {/* Progress dot */}
        {showDot && (
          <div
            style={{
              position: "absolute",
              right: -4,
              top: "50%",
              transform: "translateY(-50%)",
              width: height * 2,
              height: height * 2,
              borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}, 0 0 16px ${dotColor}50`,
            }}
          />
        )}
      </div>
    </div>
  );
};

interface FullSubtitleBarProps {
  text: string;
  segments?: Segment[];
  showProgress?: boolean;
  fontFamily?: string;
  fontSize?: number;
}

export const FullSubtitleBar: React.FC<FullSubtitleBarProps> = ({
  text,
  segments,
  showProgress = true,
  fontFamily = "sans-serif",
  fontSize = 32,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(0, 0, 0, 0.9)",
        borderTop: `1px solid ${DARK_MINT.border.light}`,
        opacity: fadeIn,
      }}
    >
      {/* Progress bar at top */}
      {showProgress && (
        <ProgressBar segments={segments} height={3} />
      )}

      {/* Subtitle text */}
      <div
        style={{
          padding: "24px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 80,
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize,
            fontWeight: 600,
            color: DARK_MINT.text.primary,
            textAlign: "center",
            lineHeight: 1.4,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

interface SceneProgressIndicatorProps {
  currentScene: number;
  totalScenes: number;
  sceneProgress: number; // 0-1 progress within current scene
}

export const SceneProgressIndicator: React.FC<SceneProgressIndicatorProps> = ({
  currentScene,
  totalScenes,
  sceneProgress,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {Array.from({ length: totalScenes }).map((_, i) => {
        const isActive = i === currentScene;
        const isPast = i < currentScene;

        return (
          <div
            key={i}
            style={{
              width: isActive ? 32 : 8,
              height: 8,
              borderRadius: 4,
              background: isPast
                ? DARK_MINT.accent.primary
                : isActive
                  ? DARK_MINT.bg.secondary
                  : DARK_MINT.bg.card,
              border: `1px solid ${isActive ? DARK_MINT.accent.primary : DARK_MINT.border.light}`,
              overflow: "hidden",
              transition: "width 0.3s ease",
            }}
          >
            {isActive && (
              <div
                style={{
                  width: `${sceneProgress * 100}%`,
                  height: "100%",
                  background: DARK_MINT.accent.primary,
                  boxShadow: `0 0 8px ${DARK_MINT.accent.glow}`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
