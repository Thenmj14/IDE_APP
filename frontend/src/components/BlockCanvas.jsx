// =============================================================
//  src/components/BlockCanvas.jsx
//  Uses npm blockly — no CDN race conditions.
// =============================================================

import { useEffect, useRef } from "react";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import * as En from "blockly/msg/en";
Blockly.setLocale(En);

import { javascriptGenerator } from "blockly/javascript";
import { colors } from "../theme/tokens.js";
import { registerAllBlocks } from "../blocks/index.js";

// ── Arduino code generator ────────────────────────────────────
function buildArduinoGenerator() {
  const gen = { ...javascriptGenerator };

  gen.workspaceToCode = (workspace) => {
    const allBlocks = workspace.getAllBlocks(false);
    const usesMark1 = allBlocks.some(b => b.type.startsWith("mark1_"));
    const topBlocks = workspace.getTopBlocks(true);

    let includeCode = usesMark1 ? '#include "mark1.h"\n' : "";
    let globalCode = usesMark1 ? "Mark1 robot;\n" : "";
    let setupCode = "";
    let loopCode = "";

    for (const block of topBlocks) {
      if (block.type === "arduino_setup") {
        setupCode += genChain(block.getInputTargetBlock("DO"), gen);
      } else if (block.type === "arduino_loop") {
        loopCode += genChain(block.getInputTargetBlock("DO"), gen);
      } else {
        loopCode += genChain(block, gen);
      }
    }

    return [
      includeCode, globalCode, "",
      "void setup() {",
      setupCode ? indentCode(setupCode) : "  // setup code here",
      "}", "",
      "void loop() {",
      loopCode ? indentCode(loopCode) : "  // loop code here",
      "}",
    ].join("\n");
  };
  return gen;
}

function indentCode(code) {
  return code.split("\n").map(l => l ? "  " + l : l).join("\n");
}

function genChain(block, gen) {
  let code = "", current = block;
  while (current) {
    const fn = gen[current.type];
    if (fn) {
      const r = fn.call(gen, current);
      code += Array.isArray(r) ? r[0] : (r || "");
    }
    current = current.getNextBlock();
  }
  return code;
}

function getInput(block, name, gen) {
  const child = block.getInputTargetBlock(name);
  if (!child) return null;
  const fn = gen[child.type];
  if (!fn) return null;
  const r = fn.call(gen, child);
  return Array.isArray(r) ? r[0] : r;
}

function registerArduinoGenerators(gen) {
  // Mark1 blocks
  gen["mark1_begin"] = () => "robot.begin();\n";
  gen["mark1_stop"] = () => "robot.stop();\n";
  gen["mark1_led_off"] = () => "robot.ledOff();\n";
  gen["mark1_on_line"] = () => ["robot.onLine()", 0];
  gen["mark1_read_sensor"] = (b) => {
    const fn = b.getFieldValue("SENSOR") === "left" ? "readLeftSensor" : "readRightSensor";
    return [`robot.${fn}()`, 0];
  };
  gen["mark1_forward"] = (b) => {
    const dir = b.getFieldValue("DIRECTION");
    const spd = getInput(b, "SPEED", gen) || "150";
    return `robot.${dir}(${spd});\n`;
  };
  gen["mark1_move_timed"] = (b) => {
    const dir = b.getFieldValue("DIRECTION");
    const spd = getInput(b, "SPEED", gen) || "150";
    const dur = getInput(b, "DURATION", gen) || "1000";
    return `robot.move("${dir}", ${spd}, ${dur});\n`;
  };
  gen["mark1_set_speed"] = (b) => {
    const l = getInput(b, "LEFT", gen) || "0";
    const r = getInput(b, "RIGHT", gen) || "0";
    return `robot.setSpeed(${l}, ${r});\n`;
  };
  gen["mark1_led_color"] = (b) => `robot.setLEDColor(${b.getFieldValue("COLOR")});\n`;
  gen["mark1_led_rgb"] = (b) => `robot.setLED(${getInput(b, "R", gen) || 0}, ${getInput(b, "G", gen) || 0}, ${getInput(b, "B", gen) || 0});\n`;
  gen["mark1_led_blink"] = (b) => `robot.blinkLED(${b.getFieldValue("COLOR")}, ${getInput(b, "TIMES", gen) || 3}, ${getInput(b, "INTERVAL", gen) || 300});\n`;
  gen["mark1_led_brightness"] = (b) => `robot.setLEDBrightness(${getInput(b, "BRIGHTNESS", gen) || 80});\n`;
  // Standard blocks
  gen["math_number"] = (b) => [b.getFieldValue("NUM"), 0];
  gen["logic_boolean"] = (b) => [b.getFieldValue("BOOL") === "TRUE" ? "true" : "false", 0];
  gen["time_delay"] = (b) => `delay(${getInput(b, "DELAY_TIME_MILI", gen) || 1000});\n`;
  gen["controls_repeat_ext"] = (b) => {
    const times = getInput(b, "TIMES", gen) || "10";
    const body = genChain(b.getInputTargetBlock("DO"), gen);
    return `for (int i = 0; i < ${times}; i++) {\n${indentCode(body)}}\n`;
  };
  gen["arduino_setup"] = () => "";
  gen["arduino_loop"] = () => "";
}

// ── Custom Scratch-style Category ─────────────────────────────
class CustomCategory extends Blockly.ToolboxCategory {
  createLabelDom_(name) {
    const label = document.createElement("div");
    label.textContent = name;
    label.style.fontSize = "11px";
    label.style.marginTop = "4px";
    label.style.color = "#555";
    label.style.textAlign = "center";
    return label;
  }

  createIconDom_() {
    const icon = document.createElement("div");
    icon.style.width = "28px";
    icon.style.height = "28px";
    icon.style.borderRadius = "50%";
    icon.style.backgroundColor = this.colour_ || "#ccc";
    icon.style.margin = "0 auto";
    return icon;
  }

  createRowContainer_() {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.padding = "10px 4px";
    container.style.cursor = "pointer";
    container.className = "custom-category-row";
    return container;
  }
}
Blockly.registry.register(
  Blockly.registry.Type.TOOLBOX_ITEM,
  Blockly.ToolboxCategory.registrationName,
  CustomCategory,
  true
);

// ── Toolbox ───────────────────────────────────────────────────
const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category", name: "Structure", colour: "#2C3E50", contents: [
        { kind: "block", type: "arduino_setup" },
        { kind: "block", type: "arduino_loop" },
      ]
    },
    {
      kind: "category", name: "Mark1", colour: "#FF6B35", contents: [
        { kind: "label", text: "Setup" },
        { kind: "block", type: "mark1_begin" },
        { kind: "label", text: "Motion" },
        { kind: "block", type: "mark1_forward", inputs: { SPEED: { block: { type: "math_number", fields: { NUM: 150 } } } } },
        { kind: "block", type: "mark1_move_timed", inputs: { SPEED: { block: { type: "math_number", fields: { NUM: 150 } } }, DURATION: { block: { type: "math_number", fields: { NUM: 1000 } } } } },
        { kind: "block", type: "mark1_stop" },
        { kind: "block", type: "mark1_set_speed", inputs: { LEFT: { block: { type: "math_number", fields: { NUM: 150 } } }, RIGHT: { block: { type: "math_number", fields: { NUM: 150 } } } } },
        { kind: "label", text: "LED" },
        { kind: "block", type: "mark1_led_color" },
        { kind: "block", type: "mark1_led_rgb", inputs: { R: { block: { type: "math_number", fields: { NUM: 255 } } }, G: { block: { type: "math_number", fields: { NUM: 0 } } }, B: { block: { type: "math_number", fields: { NUM: 0 } } } } },
        { kind: "block", type: "mark1_led_off" },
        { kind: "block", type: "mark1_led_blink", inputs: { TIMES: { block: { type: "math_number", fields: { NUM: 3 } } }, INTERVAL: { block: { type: "math_number", fields: { NUM: 300 } } } } },
        { kind: "block", type: "mark1_led_brightness", inputs: { BRIGHTNESS: { block: { type: "math_number", fields: { NUM: 80 } } } } },
        { kind: "label", text: "Sensors" },
        { kind: "block", type: "mark1_read_sensor" },
        { kind: "block", type: "mark1_on_line" },
      ]
    },
    {
      kind: "category", name: "Time", colour: "#A29BFE", contents: [
        { kind: "block", type: "time_delay", inputs: { DELAY_TIME_MILI: { block: { type: "math_number", fields: { NUM: 1000 } } } } },
      ]
    },
    {
      kind: "category", name: "Loops", colour: "#5BA55B", contents: [
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { block: { type: "math_number", fields: { NUM: 10 } } } } },
        { kind: "block", type: "controls_whileUntil" },
      ]
    },
    {
      kind: "category", name: "Logic", colour: "#5C81A6", contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_boolean" },
      ]
    },
    {
      kind: "category", name: "Math", colour: "#5B67A5", contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
      ]
    },
    { kind: "category", name: "Variables", colour: "#A55B80", custom: "VARIABLE" },
    { kind: "category", name: "Functions", colour: "#995BA5", custom: "PROCEDURE" },
  ],
};

// ── Theme ─────────────────────────────────────────────────────
const MARK1_THEME = Blockly.Theme.defineTheme("mark1Light", {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: colors.canvasBg,
    toolboxBackgroundColour: colors.sidebarDark,
    toolboxForegroundColour: colors.textPrimary,
    flyoutBackgroundColour: colors.surface,
    flyoutForegroundColour: colors.textPrimary,
    flyoutOpacity: 0.97,
    scrollbarColour: colors.scrollbarThumb,
    insertionMarkerColour: colors.primaryGreen,
    scrollbarOpacity: 0.6,
    cursorColour: colors.primaryGreen,
  },
});

// ── Component ─────────────────────────────────────────────────
export default function BlockCanvas({ onCodeChange, onXMLChange, loadXML }) {
  const containerRef = useRef(null);
  const workspaceRef = useRef(null);
  const arduinoGen = useRef(null);
  const prevXMLRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    registerAllBlocks(Blockly, Blockly.Blocks);

    const gen = buildArduinoGenerator();
    registerArduinoGenerators(gen);
    arduinoGen.current = gen;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: TOOLBOX,
      theme: MARK1_THEME,
      grid: { spacing: 25, length: 3, colour: colors.canvasGrid, snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      scrollbars: true,
      sounds: false,
    });
    workspaceRef.current = workspace;

    const handleChange = (event) => {
      if (
        event.type === Blockly.Events.VIEWPORT_CHANGE ||
        event.type === Blockly.Events.SELECTED ||
        event.type === Blockly.Events.CLICK
      ) return;
      try {
        const code = arduinoGen.current.workspaceToCode(workspace);
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
        if (xml !== prevXMLRef.current) {
          prevXMLRef.current = xml;
          onCodeChange?.(code);
          onXMLChange?.(xml);
        }
      } catch (err) {
        console.error("[BlockCanvas] codegen error:", err);
      }
    };

    workspace.addChangeListener(handleChange);

    return () => {
      workspace.removeChangeListener(handleChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadXML || !workspaceRef.current) return;
    try {
      const dom = Blockly.Xml.textToDom(loadXML);
      workspaceRef.current.clear();
      Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
    } catch (err) {
      console.error("[BlockCanvas] Failed to load XML:", err);
    }
  }, [loadXML]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: colors.canvasBg }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
