"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { SessionInfo } from "@/lib/types";
import { FileExplorer } from "./FileExplorer";
import { getRecentCwds, getSessionDateGroup, buildSessionTree } from "./session-utils";
import { PiAgentTitle } from "./PiAgentTitle";
import { SessionTreeItem } from "./SessionTreeItem";
import { CwdPicker } from "./CwdPicker";
import styles from "./SessionSidebar.module.css";

interface Props {
  selectedSessionId: string | null;
  onSelectSession: (session: SessionInfo, isRestore?: boolean) => void;
  onNewSession?: (sessionId: string, cwd: string) => void;
  initialSessionId?: string | null;
  onInitialRestoreDone?: () => void;
  refreshKey?: number;
  onSessionDeleted?: (sessionId: string) => void;
  selectedCwd?: string | null;
  onCwdChange?: (cwd: string | null) => void;
  onOpenFile?: (filePath: string, fileName: string) => void;
  explorerRefreshKey?: number;
  onAtMention?: (relativePath: string) => void;
}

export function SessionSidebar({ selectedSessionId, onSelectSession, onNewSession, initialSessionId, onInitialRestoreDone, refreshKey, onSessionDeleted, selectedCwd: selectedCwdProp, onCwdChange, onOpenFile, explorerRefreshKey, onAtMention }: Props) {
  const [allSessions, setAllSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCwd, setSelectedCwd] = useState<string | null>(null);
  const [homeDir, setHomeDir] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customPathOpen, setCustomPathOpen] = useState(false);
  const [customPathValue, setCustomPathValue] = useState("");
  const [customPathError, setCustomPathError] = useState<string | null>(null);
  const [customPathValidating, setCustomPathValidating] = useState(false);
  const customPathInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [explorerKey, setExplorerKey] = useState(0);
  const [sessionRefreshDone, setSessionRefreshDone] = useState(false);
  const [explorerRefreshDone, setExplorerRefreshDone] = useState(false);
  const sessionRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const explorerRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSessions = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { sessions: SessionInfo[] };
      setAllSessions(data.sessions);
      setError(null);
      if (!showLoading) {
        setSessionRefreshDone(true);
        if (sessionRefreshTimerRef.current) clearTimeout(sessionRefreshTimerRef.current);
        sessionRefreshTimerRef.current = setTimeout(() => setSessionRefreshDone(false), 2000);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    const isFirst = !initialLoadDone.current;
    initialLoadDone.current = true;
    loadSessions(isFirst);
  }, [loadSessions, refreshKey]);

  useEffect(() => {
    if (explorerRefreshKey !== undefined) setExplorerKey((k) => k + 1);
  }, [explorerRefreshKey]);

  useEffect(() => {
    fetch("/api/home").then((r) => r.json()).then((d: { home?: string }) => {
      if (d.home) setHomeDir(d.home);
    }).catch(() => {});
  }, []);

  const restoredRef = useRef(false);

  useEffect(() => {
    onCwdChange?.(selectedCwd);
  }, [selectedCwd, onCwdChange]);

  // Auto-select cwd and restore session from URL on first load
  useEffect(() => {
    if (allSessions.length === 0) return;

    if (selectedCwd === null) {
      // If restoring a session, set cwd to match that session
      if (initialSessionId && !restoredRef.current) {
        restoredRef.current = true;
        const target = allSessions.find((s) => s.id === initialSessionId);
        if (target) {
          setSelectedCwd(target.cwd);
          onSelectSession(target, true);
          return;
        }
        // Session not found — notify parent so it can show the placeholder
        onInitialRestoreDone?.();
      }
      const cwds = getRecentCwds(allSessions);
      if (cwds.length > 0) setSelectedCwd(cwds[0]);
    }
  }, [allSessions, selectedCwd, initialSessionId, onSelectSession, onInitialRestoreDone]);

  const commitCustomPath = useCallback(async () => {
    const path = customPathValue.trim();
    if (!path || customPathValidating) return;

    setCustomPathValidating(true);
    setCustomPathError(null);
    try {
      const res = await fetch("/api/cwd/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: path }),
      });
      const data = await res.json().catch(() => ({})) as { cwd?: string; error?: string };
      if (!res.ok || data.error) {
        setCustomPathError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSelectedCwd(data.cwd ?? path);
      setCustomPathOpen(false);
      setCustomPathValue("");
      setDropdownOpen(false);
    } catch (e) {
      setCustomPathError(e instanceof Error ? e.message : String(e));
    } finally {
      setCustomPathValidating(false);
    }
  }, [customPathValue, customPathValidating]);

  const handleDefaultCwd = useCallback(async () => {
    try {
      const res = await fetch("/api/default-cwd", { method: "POST" });
      const data = await res.json() as { cwd?: string; error?: string };
      if (data.cwd) {
        setSelectedCwd(data.cwd);
        setCustomPathOpen(false);
        setCustomPathValue("");
        setCustomPathError(null);
        setDropdownOpen(false);
      }
    } catch {
      // ignore
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setCustomPathOpen(false);
        setCustomPathValue("");
        setCustomPathError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNewSession = useCallback(() => {
    if (!selectedCwd) return;
    // Generate a temporary UUID client-side — no backend call needed.
    // Pi will be spawned lazily when the user sends the first message.
    const tempId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    onNewSession?.(tempId, selectedCwd);
  }, [selectedCwd, onNewSession]);

  const recentCwds = getRecentCwds(allSessions);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const filteredSessions = selectedCwd
    ? allSessions.filter((s) => s.cwd === selectedCwd)
    : allSessions;

  // Apply search filter
  const searchFilteredSessions = searchQuery.trim()
    ? filteredSessions.filter((s) => {
        const q = searchQuery.toLowerCase();
        const name = s.name?.toLowerCase() ?? "";
        const firstMsg = s.firstMessage?.toLowerCase() ?? "";
        return name.includes(q) || firstMsg.includes(q);
      })
    : filteredSessions;

  // Build parent-child tree within the filtered set
  const sessionTree = buildSessionTree(searchFilteredSessions);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <PiAgentTitle />
          <div className={styles.headerButtons}>
            <button
              onClick={handleNewSession}
              disabled={!selectedCwd}
              className={`${styles.newSessionButton} ${selectedCwd ? styles.newSessionButtonEnabled : styles.newSessionButtonDisabled} hover-bg-selected-accent`}
              title={selectedCwd ? `New session in ${selectedCwd}` : "Select a project first"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11" />
                <line x1="1" y1="6" x2="11" y2="6" />
              </svg>
              New
            </button>
            <button
              onClick={() => loadSessions(false)}
              className={`${styles.refreshButton} ${sessionRefreshDone ? styles.refreshButtonDone : styles.refreshButtonDefault} ${sessionRefreshDone ? "" : "hover-bg-selected-accent"}`}
              title="Refresh"
            >
              {sessionRefreshDone ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* CWD picker */}
        <CwdPicker
          selectedCwd={selectedCwd}
          homeDir={homeDir}
          initialSessionId={initialSessionId ?? null}
          isRestoring={restoredRef.current}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          customPathOpen={customPathOpen}
          setCustomPathOpen={setCustomPathOpen}
          customPathValue={customPathValue}
          setCustomPathValue={setCustomPathValue}
          customPathError={customPathError}
          setCustomPathError={setCustomPathError}
          customPathValidating={customPathValidating}
          customPathInputRef={customPathInputRef}
          dropdownRef={dropdownRef}
          recentCwds={recentCwds}
          onSelectCwd={setSelectedCwd}
          onDefaultCwd={handleDefaultCwd}
          onCommitCustomPath={commitCustomPath}
        />
      </div>

      {/* Search — always visible when a search is active, otherwise only when >3 sessions */}
      {(filteredSessions.length > 3 || searchQuery.trim()) && (
        <div className={styles.searchWrapper}>
          <div className={styles.searchContainer}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search sessions…"
              aria-label="Search sessions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); searchInputRef.current?.blur(); } }}
              className={styles.searchInput}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-border-focus-strong)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </div>
        </div>
      )}

      {/* Session list */}
      <div
        role="listbox"
        aria-label="Sessions"
        className={styles.sessionList}
        style={{ flex: explorerOpen && (selectedCwdProp || selectedCwd) ? "1 1 0" : "1 1 auto" }}
      >
        {loading && (
          <div className={styles.loadingWrapper}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`skeleton-line ${styles.skeletonLine}`} style={{ width: `${55 + (i % 4) * 12}%` }} />
            ))}
          </div>
        )}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        {!loading && !error && filteredSessions.length === 0 && (
          <div className={styles.emptyMessage}>
            No sessions found
          </div>
        )}
        {!loading && !error && filteredSessions.length > 0 && searchFilteredSessions.length === 0 && searchQuery.trim() && (
          <div className={styles.emptyMessage}>
            No matches for &ldquo;{searchQuery}&rdquo;
          </div>
        )}
        {sessionTree.map((node, idx) => {
          const group = getSessionDateGroup(node.session.modified);
          const prevGroup = idx > 0 ? getSessionDateGroup(sessionTree[idx - 1].session.modified) : null;
          const showHeader = group !== prevGroup;
          return (
            <div key={node.session.id}>
              {showHeader && (
                <div className={styles.groupHeader}>
                  {group}
                </div>
              )}
              <SessionTreeItem
                node={node}
                selectedSessionId={selectedSessionId}
                onSelectSession={onSelectSession}
                onRenamed={loadSessions}
                onSessionDeleted={(id) => {
                  onSessionDeleted?.(id);
                  loadSessions();
                }}
                depth={0}
              />
            </div>
          );
        })}
      </div>

      {/* File Explorer section */}
      {(selectedCwdProp || selectedCwd) && (
        <div
          className={styles.explorerSection}
          style={{ flex: explorerOpen ? "1 1 0" : "0 0 auto" }}
        >
          <div className={styles.explorerHeader}>
            <button
              onClick={() => setExplorerOpen((v) => !v)}
              className={styles.explorerToggle}
            >
              <svg
                width="9" height="9" viewBox="0 0 10 10" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className={styles.explorerChevron}
                style={{ transform: explorerOpen ? "rotate(90deg)" : "none" }}
              >
                <polyline points="3 2 7 5 3 8" />
              </svg>
              Explorer
            </button>
            <button
              onClick={() => {
                setExplorerKey((k) => k + 1);
                setExplorerRefreshDone(true);
                if (explorerRefreshTimerRef.current) clearTimeout(explorerRefreshTimerRef.current);
                explorerRefreshTimerRef.current = setTimeout(() => setExplorerRefreshDone(false), 2000);
              }}
              title="Refresh explorer"
              className={`${styles.explorerRefreshButton} ${explorerRefreshDone ? styles.explorerRefreshButtonDone : styles.explorerRefreshButtonDefault} ${explorerRefreshDone ? "" : "hover-bg-selected-accent"}`}
            >
              {explorerRefreshDone ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              )}
            </button>
          </div>
          {explorerOpen && (
            <div className={styles.explorerContent}>
              <FileExplorer
                cwd={selectedCwdProp ?? selectedCwd!}
                onOpenFile={onOpenFile ?? (() => {})}
                refreshKey={explorerKey}
                onAtMention={onAtMention}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
