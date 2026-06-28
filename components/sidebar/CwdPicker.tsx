"use client";

import type { RefObject } from "react";
import { shortenCwd } from "./session-utils";
import styles from "./CwdPicker.module.css";

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
    <div ref={dropdownRef} className={styles.root}>
      <button
        onClick={() => setDropdownOpen((v: boolean) => !v)}
        className={selectedCwd ? styles.mainButtonSelected : styles.mainButtonDefault}
      >
        <span
          className={selectedCwd ? styles.pathSpanSelected : styles.pathSpanDefault}
          title={selectedCwd ?? ""}
        >
          {selectedCwd ? shortenCwd(selectedCwd, homeDir) : (initialSessionId && !isRestoring ? "" : "Select project…")}
        </span>
      </button>

      {dropdownOpen && (
        <div className={styles.dropdown}>
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
              className={cwd === selectedCwd ? styles.cwdItemSelected : styles.cwdItemDefault}
              title={cwd}
            >
              {cwd === selectedCwd && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.flexShrink0}>
                  <polyline points="1.5 5 4 7.5 8.5 2.5" />
                </svg>
              )}
              {cwd !== selectedCwd && <span className={styles.spacer} />}
              <span className={styles.cwdText}>{shortenCwd(cwd, homeDir)}</span>
            </button>
          ))}

          {/* Default cwd shortcut */}
          {!customPathOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); onDefaultCwd(); }}
              className={recentCwds.length > 0 ? styles.dropdownButtonWithBorder : styles.dropdownButton}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className={styles.flexShrink0}>
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
              className={styles.dropdownButton}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" className={styles.flexShrink0}>
                <line x1="5" y1="1" x2="5" y2="9" />
                <line x1="1" y1="5" x2="9" y2="5" />
              </svg>
              <span>Custom path…</span>
            </button>
          ) : (
            <div className={styles.customPathContainer}>
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
                className={styles.customPathInput}
              />
              {customPathError && (
                <div className={styles.customPathError}>
                  {customPathError}
                </div>
              )}
              <div className={styles.customPathButtons}>
                <button
                  onClick={() => void onCommitCustomPath()}
                  disabled={customPathValidating || !customPathValue.trim()}
                  className={styles.openButton}
                >
                  {customPathValidating ? "Checking…" : "Open"}
                </button>
                <button
                  onClick={() => { setCustomPathOpen(false); setCustomPathValue(""); setCustomPathError(null); }}
                  className={styles.cancelButton}
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
