// =============================================================
//  src/components/Toolbar.jsx
//  Top green bar: logo, project name, board/port selectors,
//  upload button, save/load controls.
// =============================================================

import { useState, useEffect } from "react";
import { colors, fonts, fontSizes, spacing, radius, shadows } from "../theme/tokens.js";
import { fetchBoards, fetchPorts, fetchCliStatus, compileSketch, flashSketch } from "../api/arduino.js";

export default function Toolbar({
  projectName,
  onRenameProject,
  onNewProject,
  onSaveProject,
  onToggleProjectPanel,
  code,
  selectedBoard, onBoardChange,
  selectedPort,  onPortChange,
  onUploadStart, onUploadDone,
  onOpenSerialMonitor,
}) {
  const [boards,     setBoards]     = useState([]);
  const [ports,      setPorts]      = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cliOk,      setCliOk]      = useState(null);   // null=checking, true, false
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(projectName);

  // ── Load boards + CLI status once on mount ──────────────────
  useEffect(() => {
    fetchBoards().then(setBoards);
    fetchCliStatus().then(r => setCliOk(r.available));
    refreshPorts();
  }, []);

  // Keep name input in sync with prop
  useEffect(() => { setNameInput(projectName); }, [projectName]);

  const refreshPorts = () => {
    fetchPorts().then(ports => {
      setPorts(ports);
      if (ports.length > 0 && !selectedPort) onPortChange(ports[0]);
    });
  };

  // ── Upload ──────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!code)          return alert("No code to upload. Add some blocks first.");
    if (!selectedBoard) return alert("Please select a board.");
    if (!selectedPort)  return alert("Please select a port.");

    setUploading(true);
    setUploadStep("Compiling...");
    setUploadProgress(30);
    onUploadStart?.();

    const compResult = await compileSketch(code, selectedBoard);
    if (!compResult.success) {
      setUploading(false);
      onUploadDone?.(compResult);
      return;
    }

    setUploadStep("Uploading...");
    setUploadProgress(80);
    const flashResult = await flashSketch(selectedBoard, selectedPort);
    
    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      onUploadDone?.({
        success: flashResult.success,
        log: compResult.log + "\n\n" + flashResult.log
      });
    }, 500);
  };

  // ── Rename ──────────────────────────────────────────────────
  const commitRename = () => {
    setEditingName(false);
    if (nameInput.trim() && nameInput !== projectName) {
      onRenameProject?.(nameInput.trim());
    }
  };

  return (
    <header style={{
      display:        "flex",
      alignItems:     "center",
      gap:            spacing.md,
      padding:        `0 ${spacing.lg}`,
      height:         "56px",
      background:     colors.primaryGreen,
      boxShadow:      shadows.md,
      flexShrink:     0,
      zIndex:         100,
    }}>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <span style={{
        fontFamily:  fonts.display,
        fontSize:    fontSizes.xxl,
        color:       "#fff",
        letterSpacing: "-0.5px",
        whiteSpace:  "nowrap",
        userSelect:  "none",
      }}>
        CODEX
      </span>

      <div style={{ width: "1px", height: "32px", background: "#ffffff44" }} />

      {/* ── Project name (editable) ───────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
        {editingName ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
            style={{
              fontFamily:  fonts.ui,
              fontSize:    fontSizes.md,
              fontWeight:  700,
              color:       "#fff",
              background:  "rgba(0,0,0,0.2)",
              border:      "1px solid rgba(255,255,255,0.5)",
              borderRadius: radius.sm,
              padding:     `${spacing.xs} ${spacing.sm}`,
              outline:     "none",
              minWidth:    "160px",
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            title="Click to rename project"
            style={{
              fontFamily:  fonts.ui,
              fontSize:    fontSizes.md,
              fontWeight:  700,
              color:       "#fff",
              background:  "transparent",
              border:      "none",
              cursor:      "pointer",
              padding:     `${spacing.xs} ${spacing.xs}`,
              display:     "flex",
              alignItems:  "center",
              gap:         "6px",
            }}
          >
            {projectName} <span style={{ fontSize: "11px", opacity: 0.7 }}></span>
          </button>
        )}
      </div>

      {/* ── Save button ──────────────────────────────────────── */}
      <ToolBtn onClick={onSaveProject} title="Save project" icon="" label="Save" />

      {/* ── Projects panel toggle ────────────────────────────── */}
      <ToolBtn onClick={onToggleProjectPanel} title="All projects" icon="" label="Projects" />

      {/* ── Spacer ───────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── CLI warning ──────────────────────────────────────── */}
      {cliOk === false && (
        <span style={{
          fontFamily: fonts.ui,
          fontSize:   fontSizes.xs,
          color:      colors.accentYellow,
          background: "rgba(0,0,0,0.3)",
          padding:    `2px ${spacing.sm}`,
          borderRadius: radius.sm,
          whiteSpace: "nowrap",
        }}>
          ⚠️ arduino-cli not found
        </span>
      )}

      {/* ── Board selector ────────────────────────────────────── */}
      <label style={labelStyle}>Board</label>
      <select
        value={selectedBoard}
        onChange={e => onBoardChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">Select board...</option>
        {boards.map(b => (
          <option key={b.fqbn} value={b.fqbn}>{b.name}</option>
        ))}
      </select>

      {/* ── Port selector ─────────────────────────────────────── */}
      <label style={labelStyle}>Port</label>
      <div style={{ display: "flex", gap: "3px" }}>
        <select
          value={selectedPort}
          onChange={e => onPortChange(e.target.value)}
          style={{ ...selectStyle, minWidth: "90px" }}
        >
          <option value="">Select port...</option>
          {ports.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          onClick={refreshPorts}
          title="Refresh ports"
          style={{ ...selectStyle, padding: "0 8px", cursor: "pointer", minWidth: "unset" }}
        >
          Refresh
        </button>
      </div>

      {/* ── Upload button & Progress ───────────────────────────── */}
        <button
          onClick={!uploading ? handleUpload : undefined}
          style={{
            fontFamily:    fonts.ui,
            fontSize:      fontSizes.md,
            fontWeight:    800,
            padding:       `${spacing.sm} ${spacing.xl}`,
            background:    uploading
              ? `linear-gradient(to right, ${colors.primaryGreenDark} ${uploadProgress}%, rgba(29,185,84,0.3) ${uploadProgress}%)`
              : colors.primaryGreenDark,
            color:         "#fff",
            border:        "none",
            borderRadius:  radius.md,
            cursor:        uploading ? "not-allowed" : "pointer",
            boxShadow:     shadows.md,
            transition:    "background 0.3s ease",
            whiteSpace:    "nowrap",
            letterSpacing: "0.03em",
            minWidth:      "120px",
            position:      "relative",
            overflow:      "hidden",
          }}
        >
          {uploading ? `${uploadStep} ${uploadProgress}%` : "Upload"}
        </button>
      

    </header>
  );
}

// ── Small reusable toolbar button ────────────────────────────
function ToolBtn({ onClick, title, icon, label }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontFamily:  fonts.ui,
        fontSize:    fontSizes.sm,
        fontWeight:  600,
        color:       "#fff",
        background:  "rgba(0,0,0,0.15)",
        border:      "1px solid rgba(255,255,255,0.25)",
        borderRadius: radius.sm,
        padding:     `${spacing.xs} ${spacing.md}`,
        cursor:      "pointer",
        display:     "flex",
        alignItems:  "center",
        gap:         "5px",
        whiteSpace:  "nowrap",
        transition:  "background 0.1s",
      }}
    >
      {icon} {label}
    </button>
  );
}

const labelStyle = {
  fontFamily:  fonts.ui,
  fontSize:    fontSizes.xs,
  fontWeight:  900,
  color:       "rgb(255, 255, 255)",
  whiteSpace:  "nowrap",
  letterSpacing: "0.05em",
};

const selectStyle = {
  fontFamily:  fonts.ui,
  fontSize:    fontSizes.sm,
  padding:     `${spacing.xs} ${spacing.sm}`,
  background:  "rgba(0,0,0,0.25)",
  color:       "#fff",
  border:      "1px solid rgba(255,255,255,0.3)",
  borderRadius: "4px",
  cursor:      "pointer",
  outline:     "none",
  minWidth:    "170px",
};
