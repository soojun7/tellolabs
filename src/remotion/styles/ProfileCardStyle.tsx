import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DarkMintBg } from "./DarkMintBg";
import { getFontFamily } from "../fonts";
import { DARK_MINT } from "../themes/darkMint";
import type { SceneData, ProfileCardData } from "../types";

const DEFAULT_DATA: ProfileCardData = {
  layout: "profileCard",
  name: "Boris Cherny",
  initials: "BC",
  role: "TypeScript Expert",
  company: "Meta",
  quote: "타입스크립트는 자바스크립트의 슈퍼셋입니다.",
  stats: [
    { label: "저서", value: "Programming TypeScript" },
    { label: "경력", value: "10년+" },
  ],
};

export const ProfileCardStyle: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = getFontFamily(scene.fontId, scene.language);

  const data = (scene.infographicData?.layout === "profileCard"
    ? scene.infographicData
    : DEFAULT_DATA) as ProfileCardData;

  const initials = data.initials || data.name.split(" ").map(n => n[0]).join("").toUpperCase();

  const avatarProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const nameProgress = spring({ frame: frame - 10, fps, config: { damping: 22, stiffness: 70 } });
  const roleProgress = spring({ frame: frame - 16, fps, config: { damping: 22, stiffness: 70 } });
  const quoteProgress = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 70 } });
  const statsProgress = spring({ frame: frame - 32, fps, config: { damping: 22, stiffness: 70 } });

  return (
    <DarkMintBg showGrid>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
        }}
      >
        <div
          style={{
            background: DARK_MINT.bg.card,
            borderRadius: 24,
            border: `1px solid ${DARK_MINT.border.default}`,
            padding: "60px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            maxWidth: 700,
            boxShadow: `0 8px 40px rgba(0, 0, 0, 0.4), 0 0 60px ${DARK_MINT.accent.glowLight}`,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${DARK_MINT.accent.primary}, ${DARK_MINT.accent.secondary})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: interpolate(avatarProgress, [0, 1], [0, 1]),
              transform: `scale(${interpolate(avatarProgress, [0, 1], [0.5, 1])})`,
              boxShadow: `0 0 40px ${DARK_MINT.accent.glow}`,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 42,
                fontWeight: 800,
                color: DARK_MINT.bg.primary,
                letterSpacing: -1,
              }}
            >
              {initials}
            </span>
          </div>

          {/* Name */}
          <h1
            style={{
              fontFamily,
              fontSize: 48,
              fontWeight: 700,
              color: DARK_MINT.text.primary,
              margin: 0,
              textAlign: "center",
              opacity: interpolate(nameProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(nameProgress, [0, 1], [20, 0])}px)`,
            }}
          >
            {data.name}
          </h1>

          {/* Role & Company */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(roleProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(roleProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 22,
                fontWeight: 500,
                color: DARK_MINT.text.secondary,
              }}
            >
              {data.role}
            </span>
            {data.company && (
              <>
                <span style={{ color: DARK_MINT.text.muted, fontSize: 20 }}>•</span>
                <span
                  style={{
                    fontFamily,
                    fontSize: 22,
                    fontWeight: 600,
                    color: DARK_MINT.accent.primary,
                  }}
                >
                  {data.company}
                </span>
              </>
            )}
          </div>

          {/* Quote */}
          {data.quote && (
            <div
              style={{
                marginTop: 16,
                padding: "24px 32px",
                background: DARK_MINT.bg.secondary,
                borderRadius: 16,
                borderLeft: `4px solid ${DARK_MINT.accent.primary}`,
                opacity: interpolate(quoteProgress, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(quoteProgress, [0, 1], [15, 0])}px)`,
              }}
            >
              <p
                style={{
                  fontFamily,
                  fontSize: 20,
                  fontWeight: 400,
                  color: DARK_MINT.text.secondary,
                  fontStyle: "italic",
                  margin: 0,
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                "{data.quote}"
              </p>
            </div>
          )}

          {/* Stats */}
          {data.stats && data.stats.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 40,
                marginTop: 16,
                opacity: interpolate(statsProgress, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(statsProgress, [0, 1], [15, 0])}px)`,
              }}
            >
              {data.stats.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily,
                      fontSize: 14,
                      fontWeight: 500,
                      color: DARK_MINT.text.muted,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {stat.label}
                  </span>
                  <span
                    style={{
                      fontFamily,
                      fontSize: 18,
                      fontWeight: 600,
                      color: DARK_MINT.text.primary,
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DarkMintBg>
  );
};
