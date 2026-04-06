import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { DARK_MINT } from "../themes/darkMint";
import type { PixelCharacterData, MascotData, EmojiSceneData, AvatarSpeechData, CharacterCompareData } from "../types";

// Pixel art characters using CSS blocks
const PixelRobot = ({ color, expression }: { color: string; expression: string }) => {
  const eyeY = expression === "happy" ? 2 : expression === "sad" ? 4 : 3;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 12px)", gap: 2 }}>
      {/* Row 1 - Head top */}
      {[0, 1, 1, 1, 1, 1, 1, 0].map((v, i) => <div key={`1-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
      {/* Row 2 - Head */}
      {[1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => <div key={`2-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
      {/* Row 3 - Eyes */}
      {[1, 0, 1, 0, 0, 1, 0, 1].map((v, i) => <div key={`3-${i}`} style={{ width: 12, height: 12, background: v ? color : (i === 2 || i === 5) ? "#00ffff" : "transparent", borderRadius: i === 2 || i === 5 ? "50%" : 2 }} />)}
      {/* Row 4 - Mouth area */}
      {[1, 1, expression === "happy" ? 0 : 1, 0, 0, expression === "happy" ? 0 : 1, 1, 1].map((v, i) => <div key={`4-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
      {/* Row 5 - Neck */}
      {[0, 0, 1, 1, 1, 1, 0, 0].map((v, i) => <div key={`5-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
      {/* Row 6 - Body */}
      {[0, 1, 1, 1, 1, 1, 1, 0].map((v, i) => <div key={`6-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
      {/* Row 7 - Body */}
      {[1, 1, 1, 0, 0, 1, 1, 1].map((v, i) => <div key={`7-${i}`} style={{ width: 12, height: 12, background: v ? color : i === 3 || i === 4 ? "#ff0000" : "transparent", borderRadius: 2 }} />)}
      {/* Row 8 - Legs */}
      {[0, 1, 1, 0, 0, 1, 1, 0].map((v, i) => <div key={`8-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    </div>
  );
};

const PixelCat = ({ color }: { color: string }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 12px)", gap: 2 }}>
    {/* Ears */}
    {[1, 0, 0, 0, 0, 0, 0, 1].map((v, i) => <div key={`1-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    {[1, 1, 0, 0, 0, 0, 1, 1].map((v, i) => <div key={`2-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    {/* Head */}
    {[1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => <div key={`3-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    {/* Eyes */}
    {[1, 0, 1, 1, 1, 1, 0, 1].map((v, i) => <div key={`4-${i}`} style={{ width: 12, height: 12, background: v ? color : (i === 1 || i === 6) ? DARK_MINT.accent.primary : "transparent", borderRadius: (i === 1 || i === 6) ? "50%" : 2 }} />)}
    {/* Nose/Mouth */}
    {[1, 1, 1, 0, 0, 1, 1, 1].map((v, i) => <div key={`5-${i}`} style={{ width: 12, height: 12, background: v ? color : (i === 3 || i === 4) ? "#ffcccc" : "transparent", borderRadius: 2 }} />)}
    {/* Body */}
    {[0, 1, 1, 1, 1, 1, 1, 0].map((v, i) => <div key={`6-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    {[0, 1, 1, 1, 1, 1, 1, 0].map((v, i) => <div key={`7-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
    {/* Feet */}
    {[0, 1, 0, 1, 1, 0, 1, 0].map((v, i) => <div key={`8-${i}`} style={{ width: 12, height: 12, background: v ? color : "transparent", borderRadius: 2 }} />)}
  </div>
);

export const PixelCharacter: React.FC<{ data: PixelCharacterData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const charProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const bounce = Math.sin(frame * 0.1) * 5;
  const color = data.color || DARK_MINT.accent.primary;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DARK_MINT.bg.primary }}>
      <div style={{
        transform: `translateY(${bounce}px) scale(${interpolate(charProgress, [0, 1], [0, 2])})`,
        opacity: interpolate(charProgress, [0, 1], [0, 1]),
      }}>
        {data.character === "robot" && <PixelRobot color={color} expression={data.expression || "neutral"} />}
        {data.character === "cat" && <PixelCat color={color} />}
        {(data.character === "person" || data.character === "custom") && (
          <div style={{ fontSize: 96 }}>👾</div>
        )}
        {data.character === "alien" && <div style={{ fontSize: 96 }}>👽</div>}
        {data.character === "monster" && <div style={{ fontSize: 96 }}>👹</div>}
        {data.character === "dog" && <div style={{ fontSize: 96 }}>🐕</div>}
      </div>

      {data.speech && (
        <div style={{
          position: "absolute",
          top: 200,
          right: 300,
          background: "#fff",
          color: "#000",
          padding: "16px 24px",
          borderRadius: 16,
          fontSize: 20,
          maxWidth: 300,
          opacity: interpolate(spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 70 } }), [0, 1], [0, 1]),
        }}>
          {data.speech}
          <div style={{
            position: "absolute",
            bottom: -10,
            left: 30,
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "10px solid #fff",
          }} />
        </div>
      )}

      {data.label && (
        <p style={{
          fontSize: 28,
          color: DARK_MINT.text.primary,
          marginTop: 40,
          opacity: interpolate(charProgress, [0, 1], [0, 1]),
        }}>
          {data.label}
        </p>
      )}
    </div>
  );
};

export const Mascot: React.FC<{ data: MascotData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotProgress = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 60 } });
  const breathe = Math.sin(frame * 0.08) * 5;
  const color = data.color || DARK_MINT.accent.primary;

  const renderMascot = () => {
    if (data.type === "blob") {
      return (
        <div style={{
          width: 280,
          height: 250,
          background: color,
          borderRadius: "60% 60% 50% 50%",
          position: "relative",
          boxShadow: `0 0 80px ${color}50`,
        }}>
          {/* Eyes */}
          <div style={{ position: "absolute", top: 70, left: 55, width: 44, height: 44, background: "#fff", borderRadius: "50%" }}>
            <div style={{ position: "absolute", top: 12, left: 14, width: 18, height: 18, background: "#000", borderRadius: "50%" }} />
          </div>
          <div style={{ position: "absolute", top: 70, right: 55, width: 44, height: 44, background: "#fff", borderRadius: "50%" }}>
            <div style={{ position: "absolute", top: 12, right: 14, width: 18, height: 18, background: "#000", borderRadius: "50%" }} />
          </div>
          {/* Mouth */}
          <div style={{ position: "absolute", bottom: 55, left: "50%", transform: "translateX(-50%)", width: 70, height: 35, borderRadius: "0 0 70px 70px", background: "#ff6b6b" }} />
        </div>
      );
    }

    if (data.type === "geometric") {
      return (
        <svg width="280" height="280" viewBox="0 0 200 200">
          <polygon points="100,10 190,150 10,150" fill={color} />
          <circle cx="75" cy="100" r="16" fill="#fff" />
          <circle cx="125" cy="100" r="16" fill="#fff" />
          <circle cx="75" cy="100" r="8" fill="#000" />
          <circle cx="125" cy="100" r="8" fill="#000" />
        </svg>
      );
    }

    // Default robot mascot
    return (
      <div style={{
        width: 220,
        height: 280,
        background: color,
        borderRadius: 40,
        position: "relative",
        boxShadow: `0 0 80px ${color}50`,
      }}>
        {/* Antenna */}
        <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 6, height: 40, background: color }} />
        <div style={{ position: "absolute", top: -54, left: "50%", transform: "translateX(-50%)", width: 22, height: 22, background: "#ff0", borderRadius: "50%" }} />
        {/* Eyes */}
        <div style={{ position: "absolute", top: 55, left: 40, width: 50, height: 50, background: "#fff", borderRadius: 12 }}>
          <div style={{ position: "absolute", top: 14, left: 16, width: 20, height: 20, background: "#00ffff", borderRadius: "50%" }} />
        </div>
        <div style={{ position: "absolute", top: 55, right: 40, width: 50, height: 50, background: "#fff", borderRadius: 12 }}>
          <div style={{ position: "absolute", top: 14, right: 16, width: 20, height: 20, background: "#00ffff", borderRadius: "50%" }} />
        </div>
        {/* Mouth */}
        <div style={{ position: "absolute", bottom: 70, left: "50%", transform: "translateX(-50%)", width: 80, height: 12, background: "#fff", borderRadius: 6 }} />
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DARK_MINT.bg.primary }}>
      <div style={{
        transform: `translateY(${breathe}px) scale(${interpolate(mascotProgress, [0, 1], [0.3, 1])})`,
        opacity: interpolate(mascotProgress, [0, 1], [0, 1]),
      }}>
        {renderMascot()}
      </div>

      {data.message && (
        <p style={{
          fontSize: 36,
          color: DARK_MINT.text.primary,
          marginTop: 56,
          opacity: interpolate(mascotProgress, [0, 1], [0, 1]),
        }}>
          {data.message}
        </p>
      )}
    </div>
  );
};

export const EmojiScene: React.FC<{ data: EmojiSceneData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

  return (
    <div style={{ position: "absolute", inset: 0, background: DARK_MINT.bg.primary, overflow: "hidden" }}>
      {(data.emojis || []).map((emoji, i) => {
        const emojiProgress = spring({ frame: frame - 8 - i * 3, fps, config: { damping: 22, stiffness: 70 } });
        const sizes: Record<string, number> = { sm: 72, md: 100, lg: 140, xl: 180 };
        const size = sizes[emoji.size || "md"];

        // Random positions if not specified
        const x = emoji.position?.x ?? (20 + Math.random() * 60);
        const y = emoji.position?.y ?? (20 + Math.random() * 60);
        const float = Math.sin((frame + i * 20) * 0.05) * 15;

        return (
          <span key={i} style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            fontSize: size,
            transform: `translate(-50%, -50%) translateY(${float}px) scale(${interpolate(emojiProgress, [0, 1], [0, 1])})`,
            opacity: interpolate(emojiProgress, [0, 1], [0, 1]),
          }}>
            {emoji.emoji}
          </span>
        );
      })}

      {data.title && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{
            fontSize: 72,
            fontWeight: 700,
            color: DARK_MINT.text.primary,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
          }}>
            {data.title}
          </h1>
        </div>
      )}
    </div>
  );
};

export const AvatarSpeech: React.FC<{ data: AvatarSpeechData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const avatarProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const speechProgress = spring({ frame: frame - 16, fps, config: { damping: 22, stiffness: 70 } });
  const isLeft = data.position !== "right";

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: isLeft ? "flex-start" : "flex-end",
      padding: "60px 120px",
      background: DARK_MINT.bg.primary,
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        flexDirection: isLeft ? "row" : "row-reverse",
      }}>
        {/* Avatar */}
        <div style={{
          opacity: interpolate(avatarProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(avatarProgress, [0, 1], [0.5, 1])})`,
        }}>
          <div style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${DARK_MINT.accent.primary}, ${DARK_MINT.accent.secondary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 60px ${DARK_MINT.accent.glow}`,
          }}>
            <span style={{ fontSize: 80 }}>{data.avatar || "👨‍💼"}</span>
          </div>
          {data.name && (
            <p style={{ textAlign: "center", color: DARK_MINT.text.secondary, fontSize: 22, marginTop: 16 }}>{data.name}</p>
          )}
        </div>

        {/* Speech bubble */}
        <div style={{
          position: "relative",
          background: DARK_MINT.bg.secondary,
          border: `3px solid ${DARK_MINT.border}`,
          borderRadius: 24,
          padding: "32px 40px",
          maxWidth: 600,
          opacity: interpolate(speechProgress, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(speechProgress, [0, 1], [isLeft ? -20 : 20, 0])}px)`,
        }}>
          <p style={{ fontSize: 28, color: DARK_MINT.text.primary, lineHeight: 1.5 }}>{data.speech}</p>

          {/* Bubble tail */}
          <div style={{
            position: "absolute",
            bottom: 40,
            [isLeft ? "left" : "right"]: -16,
            width: 0,
            height: 0,
            borderTop: "16px solid transparent",
            borderBottom: "16px solid transparent",
            [isLeft ? "borderRight" : "borderLeft"]: `16px solid ${DARK_MINT.bg.secondary}`,
          }} />
        </div>
      </div>
    </div>
  );
};

export const CharacterCompare: React.FC<{ data: CharacterCompareData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const leftProgress = spring({ frame: frame - 12, fps, config: { damping: 22, stiffness: 70 } });
  const arrowProgress = spring({ frame: frame - 30, fps, config: { damping: 22, stiffness: 70 } });
  const rightProgress = spring({ frame: frame - 40, fps, config: { damping: 22, stiffness: 70 } });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f8f8" }}>
      {data.title && (
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#333",
          marginBottom: 60,
          opacity: interpolate(titleProgress, [0, 1], [0, 1]),
        }}>
          {data.title}
        </h1>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
        {/* Before */}
        <div style={{
          textAlign: "center",
          opacity: interpolate(leftProgress, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(leftProgress, [0, 1], [-30, 0])}px)`,
        }}>
          <div style={{
            width: 200,
            height: 250,
            background: "#e8e8e8",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 80 }}>😔</span>
          </div>
          <span style={{
            display: "inline-block",
            background: "#e0e0e0",
            color: "#666",
            padding: "8px 24px",
            borderRadius: 20,
            fontSize: 16,
            fontWeight: 600,
          }}>
            {data.before.label}
          </span>
          {data.before.description && (
            <p style={{ color: "#888", fontSize: 14, marginTop: 12, maxWidth: 180 }}>{data.before.description}</p>
          )}
        </div>

        {/* Arrow */}
        <svg width="80" height="40" viewBox="0 0 80 40" style={{
          opacity: interpolate(arrowProgress, [0, 1], [0, 1]),
          transform: `scaleX(${interpolate(arrowProgress, [0, 1], [0, 1])})`,
        }}>
          <path d="M0 20H60M50 10L60 20L50 30" stroke="#9b59b6" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* After */}
        <div style={{
          textAlign: "center",
          opacity: interpolate(rightProgress, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(rightProgress, [0, 1], [30, 0])}px)`,
        }}>
          <div style={{
            width: 220,
            height: 270,
            background: `linear-gradient(180deg, #fffacd, #fff)`,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 10px 40px rgba(255, 200, 0, 0.3)",
          }}>
            <span style={{ fontSize: 100 }}>💪😎</span>
          </div>
          <span style={{
            display: "inline-block",
            background: "linear-gradient(90deg, #9b59b6, #3498db)",
            color: "#fff",
            padding: "8px 24px",
            borderRadius: 20,
            fontSize: 16,
            fontWeight: 600,
          }}>
            {data.after.label}
          </span>
          {data.after.description && (
            <p style={{ color: "#666", fontSize: 14, marginTop: 12, maxWidth: 200 }}>{data.after.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
