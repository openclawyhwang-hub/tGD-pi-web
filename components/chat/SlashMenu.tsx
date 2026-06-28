"use client";

import { useRef } from "react";
import { TGD_COMMANDS } from "./chat-input-constants";
import styles from "./SlashMenu.module.css";

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
      className={styles.menu}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd.name + " ")}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => { if (i === selectedIndex) onLeave(); }}
          className={`${styles.item} ${i === selectedIndex ? "bg-selected" : "bg-none hover-bg-text text-muted"} ${i === selectedIndex ? styles.itemSelected : ""}`}
        >
          <span className={styles.commandName}>
            {cmd.name}
          </span>
          <span className={styles.description}>
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}
