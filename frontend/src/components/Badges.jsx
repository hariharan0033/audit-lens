import React from "react";
import { severityColor, severityBg, statusColor } from "../utils/helpers";

const badgeStyle = (color, bg) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.72rem",
  fontFamily: "var(--font-mono)",
  fontWeight: 500,
  letterSpacing: "0.06em",
  color,
  background: bg,
  border: `1px solid ${color}33`,
  whiteSpace: "nowrap",
});

export function SeverityBadge({ value }) {
  if (!value) return null;
  return (
    <span style={badgeStyle(severityColor(value), severityBg(value))}>
      {value === "CRITICAL" && <span style={{ fontSize: "8px" }}>●</span>}
      {value}
    </span>
  );
}

export function StatusBadge({ value }) {
  if (!value) return null;
  const color = statusColor(value);
  return (
    <span style={badgeStyle(color, `${color}18`)}>
      {value}
    </span>
  );
}
