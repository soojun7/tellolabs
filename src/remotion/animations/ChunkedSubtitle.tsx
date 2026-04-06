import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getFontFamily } from "../fonts";

interface ChunkedSubtitleProps {
  text: string;
  startDelay?: number;
  position?: "bottom" | "center" | "top";
  x?: number;
  y?: number;
  fontSize?: number;
  fontId?: string;
  language?: string;
  color?: string;
  bg?: "none" | "box" | "fullbar";
  stroke?: boolean;
  strokeWidth?: number;
}

function isJapanese(text: string): boolean {
  const matches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g);
  return (matches?.length ?? 0) > text.length * 0.15;
}

export function splitByMeaning(text: string): string[] {
  if (!text || text.trim().length === 0) return [""];
  const cleaned = text.replace(/\n/g, " ").trim();

  if (isJapanese(cleaned)) return splitJapanese(cleaned);

  if (cleaned.length <= 25) return [cleaned];

  const chunks: string[] = [];
  const parts = cleaned.split(/(?<=[,，.!?])\s*/);
  let buf = "";
  for (const part of parts) {
    const joined = buf ? `${buf} ${part}` : part;
    if (joined.length > 28 && buf.length > 0) {
      chunks.push(buf.replace(/[,，]\s*$/, "").trim());
      buf = part;
    } else {
      buf = joined;
    }
  }
  if (buf.trim()) chunks.push(buf.replace(/[,，]\s*$/, "").trim());
  if (chunks.length <= 1 && cleaned.length > 25) return splitByParticle(cleaned);
  return chunks.length > 0 ? chunks : [cleaned];
}

function splitJapanese(text: string): string[] {
  if (text.length <= 20) return [text];

  const punctSplit = text.split(/(?<=[。！？、])\s*/);
  const chunks: string[] = [];
  let buf = "";
  for (const part of punctSplit) {
    const joined = buf + part;
    if (joined.length > 22 && buf.length > 0) {
      chunks.push(buf.replace(/[、，]\s*$/, "").trim());
      buf = part;
    } else {
      buf = joined;
    }
  }
  if (buf.trim()) chunks.push(buf.replace(/[、，]\s*$/, "").trim());

  if (chunks.length > 1) return chunks;

  return splitByJaParticle(text);
}

function splitByJaParticle(text: string): string[] {
  const particles =
    /(?<=(?:は|が|を|に|で|と|も|から|まで|より|けど|けれど|ので|のに|ながら|たら|ても|のは|って|ですが|ますが|した|して|しても|ている|ていた|された|ました|ません|ですが))/g;
  const segs = text.split(particles).filter((s) => s.length > 0);
  if (segs.length <= 1) {
    if (text.length > 22) {
      const mid = Math.ceil(text.length / 2);
      const tryBreak = [
        text.lastIndexOf("、", mid + 3),
        text.lastIndexOf("は", mid + 3),
        text.lastIndexOf("が", mid + 3),
        text.lastIndexOf("を", mid + 3),
        text.lastIndexOf("で", mid + 3),
        text.lastIndexOf("に", mid + 3),
      ].filter((i) => i > 3 && i < text.length - 3);
      if (tryBreak.length > 0) {
        const best = tryBreak.reduce((a, b) => Math.abs(a - mid) < Math.abs(b - mid) ? a : b);
        return [text.slice(0, best + 1).trim(), text.slice(best + 1).trim()];
      }
    }
    return [text];
  }
  const result: string[] = [];
  let buf = "";
  for (const seg of segs) {
    const joined = buf + seg;
    if (joined.length > 22 && buf.length > 0) {
      result.push(buf.trim());
      buf = seg;
    } else {
      buf = joined;
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}

function splitByParticle(text: string): string[] {
  const particles =
    /(?<=(?:하고|빠지고|되고|지고|으면|이면|니까|는데|지만|아서|어서|해서|해도|라도|거든|거든요|는|을|를|와|과|에서|까지|부터|에게|한테|이랑|처럼))\s+/g;
  const segs = text.split(particles).filter((s) => s.trim().length > 0);
  if (segs.length <= 1) {
    const mid = Math.ceil(text.length / 2);
    const spaceAfter = text.indexOf(" ", mid - 5);
    if (spaceAfter > 0 && spaceAfter < text.length - 3) {
      return [text.slice(0, spaceAfter).trim(), text.slice(spaceAfter).trim()];
    }
    return [text];
  }
  const result: string[] = [];
  let buf = "";
  for (const seg of segs) {
    const joined = buf ? `${buf} ${seg}` : seg;
    if (joined.length > 28 && buf.length > 0) {
      result.push(buf.trim());
      buf = seg;
    } else {
      buf = joined;
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}

export const ChunkedSubtitle: React.FC<ChunkedSubtitleProps> = ({
  text,
  startDelay = 0,
  position = "bottom",
  x,
  y,
  fontSize: customFontSize,
  fontId,
  language,
  color = "#ffffff",
  bg = "box",
  stroke = true,
  strokeWidth,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chunks = splitByMeaning(text);
  const fontFamily = getFontFamily(fontId, language);
  const size = customFontSize || 54;

  const totalAvail = durationInFrames - startDelay - 10;
  const chunkDuration = Math.floor(totalAvail / chunks.length);

  let currentIdx = 0;
  for (let i = 0; i < chunks.length; i++) {
    const start = startDelay + i * chunkDuration;
    if (frame >= start) currentIdx = i;
  }

  const chunkStart = startDelay + currentIdx * chunkDuration;
  const visible = frame >= chunkStart;
  const opacity = visible ? 1 : 0;

  const useCoords = x !== undefined && y !== undefined;

  const posStyle: React.CSSProperties = useCoords
    ? {
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        maxWidth: "90%",
      }
    : position === "top"
      ? { position: "absolute", top: 60, left: 0, right: 0 }
      : position === "center"
        ? { position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)" }
        : { position: "absolute", bottom: 60, left: 0, right: 0 };

  const sw = strokeWidth ?? Math.max(1, Math.round(size / 16));
  const strokeStyle: React.CSSProperties = stroke
    ? {
        WebkitTextStroke: `${sw}px rgba(0,0,0,0.8)`,
        paintOrder: "stroke fill",
        textShadow: `0 2px ${sw * 3}px rgba(0,0,0,0.7), 0 0px ${sw}px rgba(0,0,0,0.5)`,
      }
    : { textShadow: "none" };

  const textEl = (
    <span
      style={{
        color,
        fontSize: size,
        fontWeight: 700,
        fontFamily,
        letterSpacing: 0.3,
        opacity,
        display: "inline-block",
        lineHeight: 1.4,
        ...strokeStyle,
      }}
    >
      {chunks[currentIdx]}
    </span>
  );

  if (bg === "fullbar" && !useCoords) {
    return (
      <div style={posStyle}>
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            padding: "14px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {textEl}
        </div>
      </div>
    );
  }

  if (bg === "box" || (bg === "fullbar" && useCoords)) {
    return (
      <div style={{ ...posStyle, display: useCoords ? undefined : "flex", justifyContent: useCoords ? undefined : "center", textAlign: "center" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.65)",
            borderRadius: 8,
            padding: "8px 24px",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {textEl}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...posStyle, display: useCoords ? undefined : "flex", justifyContent: useCoords ? undefined : "center", textAlign: "center" }}>
      {textEl}
    </div>
  );
};
