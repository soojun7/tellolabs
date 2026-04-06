import React from "react";

export function renderHighlighted(
  text: string,
  highlights: string[],
  color: string = "#FFD600",
) {
  if (highlights.length === 0) return <span>{text}</span>;
  const escaped = highlights.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        highlights.some((h) => h === part) ? (
          <span key={i} style={{ color, fontWeight: 700 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
