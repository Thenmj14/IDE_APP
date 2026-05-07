// =============================================================
//  src/components/LogPanel.jsx
//  Collapsible bottom panel showing compile + upload log.
//  Persists across uploads. Color-coded success/error.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { colors, fonts, fontSizes, spacing, radius } from "../theme/tokens.js";

export default function LogPanel({ log, isUploading, lastUploadSuccess }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef  = useRef(null);

  // Auto-scroll to bottom when new log arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Auto-expand on new upload
    if (log) setCollapsed(false);
  }, [log]);

  // Status color for header strip
  const headerBg = isUploading
    ? colors.info
    : lastUploadSuccess === true
      ? colors.success
      : lastUploadSuccess === false
        ? colors.error
        : colors.surface;

  const headerLabel = isUploading
    ? "⏳ Uploading..."
    : lastUploadSuccess === true
      ? "✔ Upload Successful"
      : lastUploadSuccess === false
        ? "✘ Upload Failed"
        : "📋 Log";

  return (
    <div style={{
      flexShrink:   0,
      borderTop:    `1px solid ${colors.border}`,
      background:   colors.codePanel,
      transition:   "height 0.2s ease",
      height:       collapsed ? "36px" : "180px",
      display:      "flex",
      flexDirection:"column",
      overflow:     "hidden",
    }}>

      {/* ── Header strip ─────────────────────────────────────── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        `0 ${spacing.md}`,
          height:         "36px",
          background:     headerBg + (isUploading || lastUploadSuccess != null ? "" : ""),
          cursor:         "pointer",
          flexShrink:     0,
          transition:     "background 0.3s",
          userSelect:     "none",
        }}
      >
        <span style={{
          fontFamily: fonts.ui,
          fontSize:   fontSizes.xs,
          fontWeight: 700,
          color:      (isUploading || lastUploadSuccess != null) ? "#fff" : colors.textSecondary,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {headerLabel}
        </span>
        <span style={{
          fontFamily: fonts.ui,
          fontSize:   fontSizes.xs,
          color:      colors.textMuted,
        }}>
          {collapsed ? "▲ Show" : "▼ Hide"}
        </span>
      </div>

      {/* ── Log content ──────────────────────────────────────── */}
      {!collapsed && (
        <div
          ref={scrollRef}
          style={{
            flex:       1,
            overflowY:  "auto",
            padding:    `${spacing.sm} ${spacing.md}`,
            fontFamily: fonts.code,
            fontSize:   fontSizes.xs,
            lineHeight: "1.7",
            color:      log
              ? (lastUploadSuccess === false ? colors.error : colors.textCode)
              : colors.textMuted,
            whiteSpace: "pre-wrap",
            wordBreak:  "break-word",
          }}
        >
          {log || "Upload log will appear here after you click Upload."}
        </div>
      )}
    </div>
  );
}
