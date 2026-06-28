"use client";

import type { RefObject } from "react";
import { shortenCwd } from "./session-utils";

interface CwdPickerProps {
  selectedCwd: string | null;
  homeDir: string;
  initialSessionId: string | null;
  isRestoring: boolean;
  dropdownOpen: boolean;
  setDropdownOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  customPathOpen: boolean;
  setCustomPathOpen: (v: boolean) => void;
  customPathValue: string;
  setCustomPathValue: (v: string) => void;
  customPathError: string | null;
  setCustomPathError: (v: string | null) => void;
  customPathValidating: boolean;
  customPathInputRef: RefObject<HTMLInputElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
  recentCwds: string[];
  onSelectCwd: (cwd: string) => void;
  onDefaultCwd: () => void;
  onCommitCustomPath: () => void;
}

export function CwdPicker({
  selectedCwd,
  homeDir,
  initialSessionId,
  isRestoring,
  dropdownOpen,
  setDropdownOpen,
  customPathOpen,
  setCustomPathOpen,
  customPathValue,
  setCustomPathValue,
  customPathError,
  setCustomPathError,
  customPathValidating,
  customPathInputRef,
  dropdownRef,
  recentCwds,
  onSelectCwd,
  onDefaultCwd,
  onCommitCustomPath,
}: CwdPickerProps) {
  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setDropdownOpen((v: boolean) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "6px 10px",
          background: selectedCwd ? "var(--bg-hover)" : "var(--color-accent-bg-subtle)",
          border: selectedCwd ? "1px solid var(--border)" : "1px solid var(--color-accent-border-focus-strong)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          fontSize: "var(--text-sm)",
          color: "var(--text)",
          textAlign: "left",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: selectedCwd ? "var(--text)" : "var(--text-dim)",
          }}
          title={selectedCwd ?? ""}
        >
          {selectedCwd ? shortenCwd(selectedCwd, homeDir) : (initialSessionId && !isRestoring ? "" : "Select project…")}
        </span>
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 6px 20px var(--color-shadow-popup)",
            overflow: "hidden",
          }}
        >
          {recentCwds.map((cwd) => (
            <button
              key={cwd}
              onClick={() => {
                onSelectCwd(cwd);
                setCustomPathOpen(false);
                setCustomPathValue("");
                setCustomPathError(null);
                setDropdownOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                padding: "8px 10px",
                background: cwd === selectedCwd ? "var(--bg-selected)" : "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                color: cwd === selectedCwd ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={cwd}
            >
              {cwd === selectedCwd && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="1.5 5 4 7.5 8.5 2.5" />
                </svg>
              )}
              {cwd !== selectedCwd && <span style={{ width: 10, flexShrink: 0 }} />}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortenCwd(cwd, homeDir)}</span>
            </button>
          ))}

          {/* Default cwd shortcut */}
          {!customPathOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); onDefaultCwd(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                padding: "8px 10px",
                background: "none",
                border: "none",
                borderTop: recentCwds.length > 0 ? "1px solid var(--border)" : "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 11,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M1 3A1 1 0 0 1 2 2H4L5 3.5H8.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 1 8V3Z" />
              </svg>
              <span>Use default directory</span>
            </button>
          )}

          {/* Custom path entry */}
          {!customPathOpen ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCustomPathOpen(true);
                setCustomPathError(null);
                setTimeout(() => customPathInputRef.current?.focus(), 0);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                padding: "8px 10px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 11,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <line x1="5" y1="1" x2="5" y2="9" />
                <line x1="1" y1="5" x2="9" y2="5" />
              </svg>
              <span>Custom path…</span>
            </button>
          ) : (
            <div style={{ padding: "6px 8px", borderTop: recentCwds.length > 0 ? "none" : undefined }}>
              <input
                ref={customPathInputRef}
                value={customPathValue}
                onChange={(e) => {
                  setCustomPathValue(e.target.value);
                  setCustomPathError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onCommitCustomPath();
                  }
                  if (e.key === "Escape") {
                    setCustomPathOpen(false);
                    setCustomPathValue("");
                    setCustomPathError(null);
                  }
                }}
                placeholder="/path/to/project"
                style={{
                  width: "100%",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  padding: "5px 8px",
                  border: "1px solid var(--accent)",
                  borderRadius: 5,
                  outline: "none",
                  background: "var(--bg)",
                  color: "var(--text)",
                  boxSizing: "border-box",
                }}
              />
              {customPathError && (
                <div style={{
                  marginTop: 5,
                  color: "var(--color-error-text)",
                  fontSize: 11,
                  lineHeight: 1.35,
                  overflowWrap: "anywhere",
                }}>
                  {customPathError}
                </div>
              )}
              <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                <button
                  onClick={() => void onCommitCustomPath()}
                  disabled={customPathValidating || !customPathValue.trim()}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 5,
                    color: "var(--color-white)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: customPathValidating || !customPathValue.trim() ? "not-allowed" : "pointer",
                    opacity: customPathValidating || !customPathValue.trim() ? 0.65 : 1,
                  }}
                >
                  {customPathValidating ? "Checking…" : "Open"}
                </button>
                <button
                  onClick={() => { setCustomPathOpen(false); setCustomPathValue(""); setCustomPathError(null); }}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    color: "var(--text-muted)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
