import React from "react";
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT } from "../types";
import { DARK_MINT } from "../themes/darkMint";

interface DarkMintBgProps {
  children: React.ReactNode;
  showGrid?: boolean;
  showSubtitleArea?: boolean;
  showProgressBar?: boolean;
  progress?: number; // 0-1 for progress bar
}

export const DarkMintBg: React.FC<DarkMintBgProps> = ({
  children,
  showGrid = true,
  showSubtitleArea = false,
  showProgressBar = false,
  progress = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOutStart = durationInFrames - 12;
  const fadeOut = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        position: "relative",
        overflow: "hidden",
        background: DARK_MINT.bg.primary,
        opacity: Math.min(fadeIn, fadeOut),
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${DARK_MINT.accent.glowLight} 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      {/* Grid overlay */}
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage: `
              linear-gradient(${DARK_MINT.accent.primary}15 1px, transparent 1px),
              linear-gradient(90deg, ${DARK_MINT.accent.primary}15 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main content area */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          bottom: showSubtitleArea ? 120 : 0,
        }}
      >
        {children}
      </div>

      {/* Subtitle area */}
      {showSubtitleArea && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: "rgba(0, 0, 0, 0.85)",
            borderTop: `1px solid ${DARK_MINT.border.light}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Progress bar */}
          {showProgressBar && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: DARK_MINT.bg.secondary,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  background: DARK_MINT.status.error,
                  position: "relative",
                }}
              >
                {/* Progress indicator dot */}
                <div
                  style={{
                    position: "absolute",
                    right: -4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: DARK_MINT.status.error,
                    boxShadow: `0 0 8px ${DARK_MINT.status.error}`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
