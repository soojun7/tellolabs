import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import type { 
  BeforeAfterData, ProgressBarsData, IMessageData, 
  TerminalData, BrowserMockupData, TestimonialData, AlertModalData, 
  NewsCardData, StickyNotesData, FeatureCardsData, GaugeData, TableCompareData, MilestoneData
} from "../types";

const DarkWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, background: "rgba(0,0,0,0.8)" }}>
    {children}
  </div>
);

export const BeforeAfter: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as BeforeAfterData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leftP = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 80 } });
  const rightP = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 80 } });

  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 60 }}>{data.title}</h2>}
      <div style={{ display: "flex", gap: 60, width: "100%", maxWidth: 1200 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 24, padding: 40, border: "2px solid #ef4444", opacity: interpolate(leftP, [0, 1], [0, 1]), transform: `translateX(${interpolate(leftP, [0, 1], [-30, 0])}px)` }}>
          <h3 style={{ fontSize: 36, color: "#ef4444", marginBottom: 24 }}>{data.before?.icon || "❌"} {data.before?.title || "Before"}</h3>
          {(data.before?.items || []).map((item, i) => (
            <p key={i} style={{ fontSize: 24, color: "#d1d5db", margin: "12px 0" }}>✗ {item}</p>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 64, color: "#fff" }}>→</div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 24, padding: 40, border: "2px solid #22c55e", opacity: interpolate(rightP, [0, 1], [0, 1]), transform: `translateX(${interpolate(rightP, [0, 1], [30, 0])}px)` }}>
          <h3 style={{ fontSize: 36, color: "#22c55e", marginBottom: 24 }}>{data.after?.icon || "✅"} {data.after?.title || "After"}</h3>
          {(data.after?.items || []).map((item, i) => (
            <p key={i} style={{ fontSize: 24, color: "#fff", margin: "12px 0" }}>✓ {item}</p>
          ))}
        </div>
      </div>
    </DarkWrapper>
  );
};

export const ProgressBarsList: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as ProgressBarsData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.highlightColor || "#3b82f6";

  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 60 }}>{data.title}</h2>}
      <div style={{ width: "100%", maxWidth: 1000, display: "flex", flexDirection: "column", gap: 32 }}>
        {(data.items || []).map((item, i) => {
          const p = spring({ frame: frame - 12 - i * 5, fps, config: { damping: 22, stiffness: 70 } });
          return (
            <div key={i} style={{ opacity: interpolate(p, [0, 1], [0, 1]) }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 32, color: "#fff" }}>{item.label}</span>
                <span style={{ fontSize: 32, color: accent, fontWeight: 700 }}>{item.value}%</span>
              </div>
              <div style={{ height: 24, background: "#374151", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ width: `${interpolate(p, [0, 1], [0, item.value])}%`, height: "100%", background: item.color || accent }} />
              </div>
            </div>
          );
        })}
      </div>
    </DarkWrapper>
  );
};

export const Testimonial: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as TestimonialData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 60 } });

  return (
    <DarkWrapper>
      <div style={{ maxWidth: 1000, opacity: interpolate(p, [0, 1], [0, 1]), transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})` }}>
        <span style={{ fontSize: 120, color: scene.highlightColor || "#3b82f6", opacity: 0.5, lineHeight: 0.5 }}>"</span>
        <h2 style={{ fontSize: 48, color: "#fff", fontStyle: "italic", margin: "20px 0 40px", lineHeight: 1.4 }}>{data.quote}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: scene.highlightColor || "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: "bold" }}>{data.author?.name?.[0] || "U"}</div>
          <div>
            <div style={{ fontSize: 32, color: "#fff", fontWeight: 700 }}>{data.author?.name}</div>
            <div style={{ fontSize: 24, color: "#9ca3af" }}>{data.author?.role}</div>
          </div>
        </div>
      </div>
    </DarkWrapper>
  );
};

export const BrowserMockup: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as BrowserMockupData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 5, fps });

  return (
    <DarkWrapper>
      <div style={{ width: 1200, height: 700, background: "#1f2937", borderRadius: 16, border: "1px solid #374151", overflow: "hidden", opacity: interpolate(p, [0, 1], [0, 1]), transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)` }}>
        <div style={{ height: 60, background: "#111827", display: "flex", alignItems: "center", padding: "0 20px", gap: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ef4444" }}/>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#f59e0b" }}/>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#22c55e" }}/>
          </div>
          <div style={{ flex: 1, background: "#374151", height: 36, borderRadius: 18, display: "flex", alignItems: "center", padding: "0 20px", color: "#9ca3af", fontSize: 18 }}>{data.url || "https://example.com"}</div>
        </div>
        <div style={{ padding: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          {data.title && <h1 style={{ fontSize: 56, color: "#fff", marginBottom: 20 }}>{data.title}</h1>}
          {data.subtitle && <p style={{ fontSize: 32, color: "#9ca3af" }}>{data.subtitle}</p>}
        </div>
      </div>
    </DarkWrapper>
  );
};

export const TerminalLayout: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as TerminalData;
  const frame = useCurrentFrame();

  return (
    <DarkWrapper>
      <div style={{ width: 1100, background: "#000", borderRadius: 16, border: "2px solid #333", overflow: "hidden" }}>
        <div style={{ height: 40, background: "#222", display: "flex", alignItems: "center", padding: "0 20px" }}>
          <span style={{ color: "#888", fontFamily: "monospace", fontSize: 18 }}>{data.title || "terminal"}</span>
        </div>
        <div style={{ padding: 30, fontFamily: "monospace", fontSize: 24, lineHeight: 1.6 }}>
          {(data.lines || []).map((line, i) => {
            if (frame < i * 15) return null;
            return (
              <div key={i} style={{ color: line.type === "input" ? "#fff" : line.type === "error" ? "#ef4444" : "#a3e635" }}>
                {line.type === "input" ? "$ " : ""}{line.text}
              </div>
            );
          })}
        </div>
      </div>
    </DarkWrapper>
  );
};

export const AlertModal: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as AlertModalData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 10, fps, config: { damping: 12 } });

  const colors = { warning: "#f59e0b", error: "#ef4444", success: "#22c55e", info: "#3b82f6" };
  const color = colors[data.type || "warning"];

  return (
    <DarkWrapper>
      <div style={{ width: 600, background: "#1f2937", borderRadius: 24, padding: 50, textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: `2px solid ${color}`, opacity: interpolate(p, [0, 1], [0, 1]), transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})` }}>
        <div style={{ width: 100, height: 100, borderRadius: 50, background: `${color}33`, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, margin: "0 auto 30px" }}>!</div>
        <h2 style={{ fontSize: 40, color: "#fff", marginBottom: 20 }}>{data.title}</h2>
        <p style={{ fontSize: 24, color: "#9ca3af" }}>{data.message}</p>
        <div style={{ marginTop: 40, background: color, color: "#fff", padding: "16px 32px", borderRadius: 12, fontSize: 24, fontWeight: "bold", display: "inline-block" }}>Confirm</div>
      </div>
    </DarkWrapper>
  );
};

export const IMessage: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as IMessageData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneP = spring({ frame: frame - 3, fps, config: { damping: 18, stiffness: 70 } });

  return (
    <DarkWrapper>
      <div style={{
        width: 620, background: "#000", borderRadius: 48, border: "6px solid #2a2a2a", height: 820,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
        opacity: interpolate(phoneP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(phoneP, [0, 1], [60, 0])}px)`,
      }}>
        <div style={{ padding: "16px 20px", textAlign: "center", background: "rgba(20,20,20,0.95)", borderBottom: "1px solid #2a2a2a", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>9:41</div>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg, #667eea, #764ba2)", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", fontWeight: 700 }}>
            {(data.contact || "U")[0]}
          </div>
          <div style={{ fontSize: 20, color: "#fff", fontWeight: 600 }}>{data.contact || "Contact"}</div>
          <div style={{ fontSize: 13, color: "#6b6b6b", marginTop: 2 }}>iMessage</div>
        </div>
        <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
          {(data.messages || []).map((msg, i) => {
            const msgDelay = 12 + i * 18;
            const msgP = spring({ frame: frame - msgDelay, fps, config: { damping: 16, stiffness: 90 } });
            if (frame < msgDelay) return null;
            const isMe = msg.sender === "me";
            return (
              <div key={i} style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                opacity: interpolate(msgP, [0, 1], [0, 1]),
                transform: `scale(${interpolate(msgP, [0, 1], [0.3, 1])}) translateY(${interpolate(msgP, [0, 1], [20, 0])}px)`,
                transformOrigin: isMe ? "bottom right" : "bottom left",
              }}>
                <div style={{
                  background: isMe ? "#0b84fe" : "#303030",
                  color: "#fff", padding: "14px 20px",
                  borderRadius: isMe ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
                  fontSize: 22, maxWidth: 400, lineHeight: 1.4,
                }}>
                  {msg.text}
                </div>
                {i === (data.messages || []).length - 1 && isMe && (
                  <div style={{ textAlign: "right", fontSize: 11, color: "#6b6b6b", marginTop: 3, paddingRight: 4 }}>
                    읽음
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: "#3a3a3c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>+</div>
          <div style={{ flex: 1, height: 36, borderRadius: 18, border: "1px solid #3a3a3c", paddingLeft: 14, display: "flex", alignItems: "center", color: "#6b6b6b", fontSize: 16 }}>iMessage</div>
          <div style={{ fontSize: 22, color: "#0b84fe" }}>↑</div>
        </div>
      </div>
    </DarkWrapper>
  );
};

export const StickyNotes: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as StickyNotesData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 60 }}>{data.title}</h2>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "center", maxWidth: 1200 }}>
        {(data.notes || []).map((note, i) => {
          const p = spring({ frame: frame - i * 5, fps });
          const rot = (i % 2 === 0 ? 1 : -1) * (i * 2 + 2);
          return (
            <div key={i} style={{ width: 300, height: 300, background: note.color || "#fef08a", padding: 30, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "5px 5px 15px rgba(0,0,0,0.3)", opacity: interpolate(p, [0, 1], [0, 1]), transform: `scale(${interpolate(p, [0, 1], [0, 1])}) rotate(${rot}deg)` }}>
              <span style={{ fontSize: 32, color: "#000", fontWeight: "bold", textAlign: "center", lineHeight: 1.4 }}>{note.text}</span>
            </div>
          );
        })}
      </div>
    </DarkWrapper>
  );
};

const HighlightedText: React.FC<{
  text: string;
  highlightWords?: string[];
  frame: number;
  fps: number;
  baseDelay: number;
  style: React.CSSProperties;
  highlightColor?: string;
}> = ({ text, highlightWords, frame, fps, baseDelay, style: textStyle, highlightColor = "#fff44f" }) => {
  if (!highlightWords?.length) {
    return <span style={textStyle}>{text}</span>;
  }

  const escaped = highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  let hlIdx = 0;
  return (
    <span style={textStyle}>
      {parts.map((part, i) => {
        const isHL = highlightWords.some(w => w.toLowerCase() === part.toLowerCase());
        if (isHL) {
          const delay = baseDelay + hlIdx * 8;
          hlIdx++;
          const hlP = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
          const width = interpolate(hlP, [0, 1], [0, 100]);
          return (
            <span key={i} style={{ position: "relative", display: "inline", whiteSpace: "pre-wrap" }}>
              <span style={{
                position: "absolute", left: -3, right: -3, bottom: 2, height: "40%",
                background: highlightColor, opacity: 0.5,
                borderRadius: 3,
                width: `${width}%`,
              }} />
              <span style={{ position: "relative", fontWeight: 800 }}>{part}</span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const NewsCard: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as NewsCardData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paperP = spring({ frame: frame - 3, fps, config: { damping: 18, stiffness: 70 } });
  const headP = spring({ frame: frame - 12, fps, config: { damping: 20, stiffness: 80 } });
  const bodyP = spring({ frame: frame - 22, fps, config: { damping: 20, stiffness: 80 } });
  const lineP = spring({ frame: frame - 8, fps, config: { damping: 25, stiffness: 60 } });

  const hlWords = data.highlightWords || scene.keywords || [];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a" }}>
      <div style={{
        width: 1300, background: "#faf8f2", overflow: "hidden",
        opacity: interpolate(paperP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(paperP, [0, 1], [40, 0])}px)`,
        boxShadow: "0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.08)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}>
        {/* NYT Header */}
        <div style={{
          borderBottom: "3px double #222", padding: "24px 60px 20px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 13, color: "#666", letterSpacing: 1, marginBottom: 12 }}>
            <span>{data.date || "Monday, April 6, 2026"}</span>
            <span style={{ fontStyle: "italic" }}>{data.source || "News Report"}</span>
          </div>
          <div style={{
            fontSize: 52, fontWeight: 700, letterSpacing: 4, color: "#111",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            textTransform: "uppercase",
            opacity: interpolate(lineP, [0, 1], [0, 1]),
          }}>
            The Daily Report
          </div>
          <div style={{
            width: `${interpolate(lineP, [0, 1], [0, 100])}%`,
            height: 1, background: "#999", marginTop: 12,
          }} />
        </div>

        {/* Article */}
        <div style={{ padding: "40px 60px 50px" }}>
          <div style={{
            opacity: interpolate(headP, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headP, [0, 1], [20, 0])}px)`,
          }}>
            <h1 style={{
              fontSize: 54, fontWeight: 800, color: "#111",
              lineHeight: 1.2, marginBottom: 24, letterSpacing: -0.5,
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}>
              <HighlightedText
                text={data.headline || ""}
                highlightWords={hlWords}
                frame={frame} fps={fps} baseDelay={25}
                style={{}}
                highlightColor="#fff44f"
              />
            </h1>
          </div>

          <div style={{
            width: 80, height: 3, background: "#111", marginBottom: 28,
            opacity: interpolate(headP, [0, 1], [0, 1]),
          }} />

          {data.summary && (
            <div style={{
              opacity: interpolate(bodyP, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(bodyP, [0, 1], [15, 0])}px)`,
            }}>
              <p style={{
                fontSize: 28, color: "#333", lineHeight: 1.7,
                fontFamily: "'Georgia', 'Times New Roman', serif",
                maxWidth: 900,
              }}>
                <HighlightedText
                  text={data.summary}
                  highlightWords={hlWords}
                  frame={frame} fps={fps} baseDelay={35}
                  style={{}}
                  highlightColor="#fff44f"
                />
              </p>
            </div>
          )}

          <div style={{
            marginTop: 36, paddingTop: 20, borderTop: "1px solid #ddd",
            display: "flex", alignItems: "center", gap: 16,
            opacity: interpolate(bodyP, [0, 1], [0, 1]),
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#c41d1d" }} />
            <span style={{ fontSize: 16, color: "#888", fontStyle: "italic", letterSpacing: 0.5 }}>
              {data.source ? `Reported by ${data.source}` : "Breaking Report"} · {data.date || "Just now"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeatureCards: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as FeatureCardsData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 60 }}>{data.title}</h2>}
      <div style={{ display: "flex", gap: 40, width: "100%", maxWidth: 1400, justifyContent: "center" }}>
        {(data.cards || []).map((card, i) => {
          const p = spring({ frame: frame - i * 10, fps });
          return (
            <div key={i} style={{ flex: 1, background: "#1f2937", borderRadius: 24, padding: 40, border: "1px solid #374151", opacity: interpolate(p, [0, 1], [0, 1]), transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)` }}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>{card.icon}</div>
              <h3 style={{ fontSize: 32, color: "#fff", marginBottom: 16 }}>{card.title}</h3>
              <p style={{ fontSize: 20, color: "#9ca3af", lineHeight: 1.5 }}>{card.description}</p>
            </div>
          );
        })}
      </div>
    </DarkWrapper>
  );
};

export const GaugeChart: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as GaugeData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const accent = scene.highlightColor || "#22c55e";
  const percentage = data.maxValue ? Math.min(data.value / data.maxValue, 1) : 0;
  const currentVal = Math.round(interpolate(p, [0, 1], [0, data.value]));
  const rotation = interpolate(p, [0, 1], [-90, -90 + (180 * percentage)]);

  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 100 }}>{data.title}</h2>}
      <div style={{ position: "relative", width: 600, height: 300, overflow: "hidden" }}>
        <div style={{ width: 600, height: 600, borderRadius: "50%", border: "40px solid #374151", borderBottomColor: "transparent", borderRightColor: "transparent", transform: "rotate(-45deg)" }} />
        {/* Needle */}
        <div style={{ position: "absolute", bottom: -20, left: 280, width: 40, height: 250, background: accent, borderRadius: 20, transformOrigin: "bottom center", transform: `rotate(${rotation}deg)` }} />
        <div style={{ position: "absolute", bottom: -30, left: 270, width: 60, height: 60, borderRadius: 30, background: "#fff", border: `10px solid ${accent}` }} />
      </div>
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div style={{ fontSize: 80, color: "#fff", fontWeight: "bold" }}>{currentVal}</div>
        {data.label && <div style={{ fontSize: 32, color: "#9ca3af" }}>{data.label}</div>}
      </div>
    </DarkWrapper>
  );
};

export const TableCompare: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as TableCompareData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleP = spring({ frame: frame - 5, fps });
  
  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 40, opacity: interpolate(titleP, [0, 1], [0, 1]) }}>{data.title}</h2>}
      <div style={{ background: "#1f2937", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 1200, opacity: interpolate(titleP, [0, 1], [0, 1]) }}>
        <div style={{ display: "flex", background: "#111827", padding: "20px 0" }}>
          <div style={{ flex: 2, padding: "0 30px", fontSize: 24, fontWeight: "bold", color: "#9ca3af" }}>Features</div>
          {(data.headers || []).map((h, i) => (
            <div key={i} style={{ flex: 1, padding: "0 20px", textAlign: "center", fontSize: 24, fontWeight: "bold", color: "#fff" }}>{h}</div>
          ))}
        </div>
        {(data.rows || []).map((row, i) => {
          const rowP = spring({ frame: frame - 10 - i * 5, fps });
          return (
            <div key={i} style={{ display: "flex", borderTop: "1px solid #374151", padding: "20px 0", opacity: interpolate(rowP, [0, 1], [0, 1]), transform: `translateY(${interpolate(rowP, [0, 1], [20, 0])}px)` }}>
              <div style={{ flex: 2, padding: "0 30px", fontSize: 24, color: "#fff" }}>{row.label}</div>
              {(row.values || []).map((val, j) => (
                <div key={j} style={{ flex: 1, padding: "0 20px", textAlign: "center", fontSize: 28, color: val === "O" || val === "Yes" || val === "✓" ? "#22c55e" : val === "X" || val === "No" ? "#ef4444" : "#9ca3af" }}>
                  {val}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </DarkWrapper>
  );
};

export const Milestone: React.FC<{ scene: any }> = ({ scene }) => {
  const data = (scene.infographicData || {}) as MilestoneData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.highlightColor || "#3b82f6";
  
  return (
    <DarkWrapper>
      {data.title && <h2 style={{ fontSize: 48, fontWeight: 700, color: "#fff", marginBottom: 100 }}>{data.title}</h2>}
      <div style={{ display: "flex", width: "100%", maxWidth: 1200, position: "relative" }}>
        <div style={{ position: "absolute", top: 20, left: 0, right: 0, height: 8, background: "#374151", zIndex: 0 }} />
        {(data.milestones || []).map((m, i) => {
          const isDone = data.current >= i;
          const p = spring({ frame: frame - i * 10, fps });
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1, opacity: interpolate(p, [0, 1], [0, 1]) }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: isDone ? accent : "#1f2937", border: `4px solid ${isDone ? accent : "#4b5563"}`, marginBottom: 24, transition: "0.3s" }} />
              <div style={{ fontSize: 24, color: isDone ? "#fff" : "#6b7280", fontWeight: isDone ? "bold" : "normal", textAlign: "center" }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </DarkWrapper>
  );
};
