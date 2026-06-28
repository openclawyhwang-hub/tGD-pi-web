"use client";

import { useRef } from "react";
import { TGD_COMMANDS } from "./chat-input-constants";

interface SlashMenuProps {
  show: boolean;
  filter: string;
  selectedIndex: number;
  onSelect: (command: string) => void;
  onHover: (index: number) => void;
  onLeave: () => void;
  onClose: () => void;
}

export function SlashMenu({ show, filter, selectedIndex, onSelect, onHover, onLeave }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = TGD_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!show || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        marginBottom: 8,
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--color-shadow-popup)",
        overflow: "hidden",
        zIndex: 100,
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd.name + " ")}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => { if (i === selectedIndex) onLeave(); }}
          className={i === selectedIndex ? "bg-selected" : "bg-none hover-bg-text text-muted"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            textAlign: "left",
            ...(i === selectedIndex ? { color: "var(--text)" } : {}),
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 100, fontSize: "var(--text-sm)" }}>
            {cmd.name}
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "var(--text-sm)", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}
