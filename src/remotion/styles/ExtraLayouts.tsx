import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import type { CircularProgressData, BarChartData, VsCompareData, TwitterPostData } from "../types";

export const CircularProgress: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as CircularProgressData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = scene.highlightColor || "#3b82f6"; // 동적 컬러 (기본: 파란색)

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const circleProgress = spring({ frame: frame - 10, fps, config: { damping: 25, stiffness: 50 } });

  const size = 380;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = data.percentage ?? 0;
  const progress = interpolate(circleProgress, [0, 1], [0, percentage / 100]);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 100px", background: "rgba(0,0,0,0.75)" }}>
      {data.title && (
        <h1 style={{ fontSize: 40, fontWeight: 500, color: "#e5e7eb", marginBottom: 48, opacity: interpolate(titleProgress, [0, 1], [0, 1]) }}>{data.title}</h1>
      )}

      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={accentColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ filter: `drop-shadow(0 0 20px ${accentColor}80)` }} />
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 100, fontWeight: 900, color: accentColor }}>{Math.round(progress * 100)}</span>
          <span style={{ fontSize: 48, fontWeight: 700, color: accentColor, marginTop: -12 }}>%</span>
          {data.label && <span style={{ fontSize: 24, color: "#9ca3af", marginTop: 12 }}>{data.label}</span>}
        </div>
      </div>

      {data.subtitle && (
        <p style={{ fontSize: 26, color: "#9ca3af", marginTop: 40, opacity: interpolate(circleProgress, [0, 1], [0, 1]) }}>{data.subtitle}</p>
      )}
    </div>
  );
};

export const BarChart: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as BarChartData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = scene.highlightColor || "#3b82f6";

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const maxVal = Math.max(...(data.bars || []).map(b => b.maxValue || b.value));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "100px 150px", background: "rgba(0,0,0,0.75)" }}>
      {data.title && (
        <h1 style={{ fontSize: 48, fontWeight: 600, color: "#ffffff", marginBottom: 56, opacity: interpolate(titleProgress, [0, 1], [0, 1]) }}>{data.title}</h1>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 40 }}>
        {(data.bars || []).map((bar, i) => {
          const barProgress = spring({ frame: frame - 12 - i * 4, fps, config: { damping: 22, stiffness: 70 } });
          const height = maxVal === 0 ? 0 : (bar.value / maxVal) * 100;

          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: interpolate(barProgress, [0, 1], [0, 1]) }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: bar.highlight ? accentColor : "#ffffff", marginBottom: 16 }}>{bar.value}</span>
              <div style={{ width: "100%", height: 450, background: "#1f2937", borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${interpolate(barProgress, [0, 1], [0, height])}%`, background: bar.highlight ? accentColor : "#4b5563", borderRadius: 16, boxShadow: bar.highlight ? `0 0 30px ${accentColor}80` : "none" }} />
              </div>
              <span style={{ fontSize: 26, color: "#d1d5db", marginTop: 20 }}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VsCompare: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as VsCompareData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = scene.highlightColor || "#ef4444"; // VS는 빨간계열이 어울림

  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });
  const leftProgress = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 80 } });
  const vsProgress = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 100 } });
  const rightProgress = spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 80 } });

  const vsScale = 1 + Math.sin(frame * 0.1) * 0.05;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, background: "rgba(0,0,0,0.8)" }}>
      {data.title && (
        <h2 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", marginBottom: 80, opacity: interpolate(titleProgress, [0, 1], [0, 1]) }}>
          {data.title}
        </h2>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 100 }}>
        {/* Left */}
        <div style={{
          textAlign: "center",
          opacity: interpolate(leftProgress, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(leftProgress, [0, 1], [-50, 0])}px)`,
        }}>
          {data.left?.icon && <span style={{ fontSize: 100 }}>{data.left.icon}</span>}
          <h3 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", marginTop: 30 }}>{data.left?.title}</h3>
          {data.left?.subtitle && (
            <p style={{ fontSize: 24, color: "#9ca3af", marginTop: 12 }}>{data.left.subtitle}</p>
          )}
        </div>

        {/* VS */}
        <div style={{
          fontSize: 80,
          fontWeight: 900,
          color: accentColor,
          textShadow: `0 0 30px ${accentColor}80`,
          opacity: interpolate(vsProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(vsProgress, [0, 1], [0, vsScale])})`,
        }}>
          VS
        </div>

        {/* Right */}
        <div style={{
          textAlign: "center",
          opacity: interpolate(rightProgress, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(rightProgress, [0, 1], [50, 0])}px)`,
        }}>
          {data.right?.icon && <span style={{ fontSize: 100 }}>{data.right.icon}</span>}
          <h3 style={{ fontSize: 40, fontWeight: 700, color: data.right?.highlight ? accentColor : "#ffffff", marginTop: 30 }}>
            {data.right?.title}
          </h3>
          {data.right?.subtitle && (
            <p style={{ fontSize: 24, color: "#9ca3af", marginTop: 12 }}>{data.right.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const TwitterPost: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as TwitterPostData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = scene.highlightColor || "#1d9bf0"; // 트위터 블루

  const cardProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div style={{ width: 800, background: "#000", borderRadius: 24, border: "1px solid #2f3336", padding: 40, opacity: interpolate(cardProgress, [0, 1], [0, 1]), transform: `scale(${interpolate(cardProgress, [0, 1], [0.9, 1])})`, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{data.username?.[0] || "U"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.username}</span>
              {data.verified !== false && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={accentColor}><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
              )}
            </div>
            <span style={{ fontSize: 18, color: "#71767b" }}>@{data.handle}</span>
          </div>
        </div>

        {/* Content */}
        <p style={{ fontSize: 24, color: "#fff", lineHeight: 1.5, marginBottom: 24, whiteSpace: "pre-wrap" }}>{data.content}</p>

        {/* Time */}
        <div style={{ fontSize: 18, color: "#71767b", marginBottom: 20 }}>
          {data.time || "3:57 PM"} · {data.date || "Jan 20, 2026"}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#2f3336", marginBottom: 16 }} />

        {/* Engagement */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#71767b", fontSize: 20 }}>
            <span>💬</span><span>{data.replies || "656"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#71767b", fontSize: 20 }}>
            <span>🔁</span><span>{data.retweets || "3K"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#71767b", fontSize: 20 }}>
            <span>❤️</span><span>{data.likes || "16K"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#71767b", fontSize: 20 }}>
            <span>🔖</span><span>{data.bookmarks || "29K"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
