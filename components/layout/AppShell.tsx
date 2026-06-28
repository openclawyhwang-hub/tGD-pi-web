"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionSidebar } from "../sidebar/SessionSidebar";
import { ChatWindow } from "../chat/ChatWindow";
import { FileViewer } from "./FileViewer";
import { TabBar, type Tab } from "./TabBar";
import { BranchNavigator } from "../chat/BranchNavigator";
import { useTheme } from "@/hooks/useTheme";
import { ErrorBoundary } from "./ErrorBoundary";
import type { SessionInfo, SessionTreeNode } from "@/lib/types";
import type { ChatInputHandle } from "../chat/ChatInput";
import s from "./AppShell.module.css";

// Lazy-load heavy modals — they're ~1000 lines each and rarely opened
const ModelsConfig = lazy(() => import("../modals/ModelsConfig").then((m) => ({ default: m.ModelsConfig })));
const SkillsConfig = lazy(() => import("../modals/SkillsConfig").then((m) => ({ default: m.SkillsConfig })));

export function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  // When user clicks +, we only store the cwd — no fake session id
  const [newSessionCwd, setNewSessionCwd] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [explorerRefreshKey, setExplorerRefreshKey] = useState(0);
  const [modelsConfigOpen, setModelsConfigOpen] = useState(false);
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);
  const [skillsConfigOpen, setSkillsConfigOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const topBarRef = useRef<HTMLDivElement>(null);

  // Branch navigator state — populated by ChatWindow via onBranchDataChange
  const [branchTree, setBranchTree] = useState<SessionTreeNode[]>([]);
  const [branchActiveLeafId, setBranchActiveLeafId] = useState<string | null>(null);
  const branchLeafChangeFnRef = useRef<((leafId: string | null) => void) | null>(null);

  const handleBranchDataChange = useCallback((tree: SessionTreeNode[], activeLeafId: string | null, onLeafChange: (leafId: string | null) => void) => {
    setBranchTree(tree);
    setBranchActiveLeafId(activeLeafId);
    branchLeafChangeFnRef.current = onLeafChange;
  }, []);

  const handleBranchLeafChange = useCallback((leafId: string | null) => {
    branchLeafChangeFnRef.current?.(leafId);
  }, []);

  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const systemBtnRef = useRef<HTMLButtonElement>(null);

  const handleSystemPromptChange = useCallback((prompt: string | null) => {
    setSystemPrompt(prompt);
  }, []);

  // Session stats (tokens + cost) — populated by ChatWindow, displayed in top bar
  const [sessionStats, setSessionStats] = useState<{ tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }; cost?: number } | null>(null);
  const handleSessionStatsChange = useCallback((stats: { tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }; cost?: number } | null) => {
    setSessionStats(stats);
  }, []);

  // Context usage — populated by ChatWindow, displayed in top bar
  const [contextUsage, setContextUsage] = useState<{ percent: number | null; contextWindow: number; tokens: number | null } | null>(null);
  const handleContextUsageChange = useCallback((usage: { percent: number | null; contextWindow: number; tokens: number | null } | null) => {
    setContextUsage(usage);
  }, []);

  // Single active panel — only one dropdown open at a time
  const [activeTopPanel, setActiveTopPanel] = useState<"branches" | "system" | null>(null);
  const [topPanelPos, setTopPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const toggleTopPanel = useCallback((panel: "branches" | "system") => {
    setActiveTopPanel((cur) => cur === panel ? null : panel);
  }, []);

  useEffect(() => {
    if (!activeTopPanel || !topBarRef.current) return;
    const update = () => {
      const rect = topBarRef.current!.getBoundingClientRect();
      setTopPanelPos({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(topBarRef.current);
    return () => ro.disconnect();
  }, [activeTopPanel]);

  // Right panel — file tabs only
  const [fileTabs, setFileTabs] = useState<Tab[]>([]);
  const [activeFileTabId, setActiveFileTabId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const handleAtMention = useCallback((relativePath: string) => {
    chatInputRef.current?.insertText("`" + relativePath + "`");
  }, []);

  const [initialSessionId] = useState<string | null>(() => searchParams.get("session"));
  const [activeCwd, setActiveCwd] = useState<string | null>(null);
  // True once the initial ?session= URL param has been resolved (or confirmed absent)
  const [initialSessionRestored, setInitialSessionRestored] = useState<boolean>(() => !searchParams.get("session"));
  // Suppresses sessionKey bump in handleCwdChange during the initial URL restore
  const suppressCwdBumpRef = useRef(false);

  const handleCwdChange = useCallback((cwd: string | null) => {
    setActiveCwd(cwd);
    // Skip if cwd is null (initial mount) or during the initial URL restore.
    if (!cwd || suppressCwdBumpRef.current) return;
    // Close any session that belongs to a different cwd — it no longer
    // matches the selected project directory.
    setSelectedSession((prev) => {
      if (prev && prev.cwd !== cwd) return null;
      return prev;
    });
    setNewSessionCwd((prev) => {
      if (prev && prev !== cwd) return null;
      return prev;
    });
    setSessionKey((k) => k + 1);
    setBranchTree([]);
    setBranchActiveLeafId(null);
    setSystemPrompt(null);
    setActiveTopPanel(null);
    router.replace("/", { scroll: false });
  }, [router]);

  const handleSelectSession = useCallback((session: SessionInfo, isRestore = false) => {
    setNewSessionCwd(null);
    setSelectedSession(session);
    setSessionKey((k) => k + 1);
    setSystemPrompt(null);
    setInitialSessionRestored(true);
    if (isRestore) {
      // Suppress the redundant sessionKey bump that would come from the
      // onCwdChange effect firing after setSelectedCwd in the sidebar
      suppressCwdBumpRef.current = true;
      setTimeout(() => { suppressCwdBumpRef.current = false; }, 0);
    }
    // Skip router.replace when restoring from URL — the param is already correct
    // and calling replace in production Next.js triggers a Suspense remount loop
    if (!isRestore) {
      router.replace(`?session=${encodeURIComponent(session.id)}`, { scroll: false });
    }
  }, [router]);

  const handleNewSession = useCallback((_sessionId: string, cwd: string) => {
    setSelectedSession(null);
    setNewSessionCwd(cwd);
    setSessionKey((k) => k + 1);
    setBranchTree([]);
    setBranchActiveLeafId(null);
    setSystemPrompt(null);
    setActiveTopPanel(null);
    router.replace("/", { scroll: false });
  }, [router]);

  // Called by ChatWindow when a new session gets its real id from pi
  const handleSessionCreated = useCallback((session: SessionInfo) => {
    setNewSessionCwd(null);
    setSelectedSession(session);
    setRefreshKey((k) => k + 1);
    router.replace(`?session=${encodeURIComponent(session.id)}`, { scroll: false });
  }, [router]);

  const handleAgentEnd = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setExplorerRefreshKey((k) => k + 1);
  }, []);

  const handleSessionForked = useCallback((newSessionId: string) => {
    setRefreshKey((k) => k + 1);
    setSessionKey((k) => k + 1);
    setNewSessionCwd(null);
    setSelectedSession((prev) => ({
      ...(prev ?? { path: "", cwd: "", created: "", modified: "", messageCount: 0, firstMessage: "" }),
      id: newSessionId,
    }));
    router.replace(`?session=${encodeURIComponent(newSessionId)}`, { scroll: false });
  }, [router]);

  const handleInitialRestoreDone = useCallback(() => {
    setInitialSessionRestored(true);
  }, []);

  const handleSessionDeleted = useCallback((sessionId: string) => {
    setRefreshKey((k) => k + 1);
    if (selectedSession?.id === sessionId) {
      const cwd = selectedSession.cwd;
      setSelectedSession(null);
      setNewSessionCwd(cwd ?? null);
      setSessionKey((k) => k + 1);
      setBranchTree([]);
      setBranchActiveLeafId(null);
      setSystemPrompt(null);
      setActiveTopPanel(null);
      router.replace("/", { scroll: false });
    }
  }, [selectedSession, router]);

  const handleOpenFile = useCallback((filePath: string, fileName: string) => {
    const tabId = `file:${filePath}`;
    setFileTabs((prev) => {
      if (prev.find((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, label: fileName, filePath }];
    });
    setActiveFileTabId(tabId);
    setRightPanelOpen(true);
  }, []);

  const handleCloseFileTab = useCallback((tabId: string) => {
    setFileTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (next.length === 0) setRightPanelOpen(false);
      return next;
    });
    setActiveFileTabId((cur) => {
      if (cur !== tabId) return cur;
      const remaining = fileTabs.filter((t) => t.id !== tabId);
      return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    });
  }, [fileTabs]);

  const handleExportSession = useCallback(() => {
    if (!selectedSession) return;
    window.location.href = `/api/sessions/${encodeURIComponent(selectedSession.id)}/export`;
  }, [selectedSession]);

  // Show chat area if a session is selected, or if we have a cwd to start a new session in
  const effectiveNewSessionCwd = newSessionCwd ?? (selectedSession === null && activeCwd ? activeCwd : null);
  const showChat = selectedSession !== null || effectiveNewSessionCwd !== null;
  // While restoring initial session from URL, don't show the placeholder
  const showPlaceholder = initialSessionRestored && !showChat;

  const activeFileTab = fileTabs.find((t) => t.id === activeFileTabId) ?? null;

  const sidebarContent = (
    <ErrorBoundary>
      <SessionSidebar
        selectedSessionId={selectedSession?.id ?? null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        initialSessionId={initialSessionId}
        onInitialRestoreDone={handleInitialRestoreDone}
        refreshKey={refreshKey}
        onSessionDeleted={handleSessionDeleted}
        selectedCwd={selectedSession?.cwd ?? newSessionCwd ?? null}
        onCwdChange={handleCwdChange}
        onOpenFile={handleOpenFile}
        explorerRefreshKey={explorerRefreshKey}
        onAtMention={handleAtMention}
      />
      <div className={s.sidebarFooter}>
        {([
          {
            label: "Models",
            onClick: () => setModelsConfigOpen(true),
            disabled: false,
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
              </svg>
            ),
          },
          {
            label: "Skills",
            onClick: () => setSkillsConfigOpen(true),
            disabled: !activeCwd && !selectedSession?.cwd && !newSessionCwd,
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            ),
          },
        ] as { label: string; onClick: () => void; disabled: boolean; icon: React.ReactNode }[]).map(({ label, onClick, disabled, icon }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`${s.sidebarFooterButton} ${disabled ? s.sidebarFooterButtonDisabled : s.sidebarFooterButtonEnabled}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </ErrorBoundary>
  );

  return (
    <>
    <div className={s.container}>
      {/* Mobile overlay backdrop */}
      <div
        className="sidebar-overlay-backdrop"
        onClick={() => setSidebarOpen(false)}
        style={{
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      />

      {/* Left sidebar */}
      <div
        className={`sidebar-container${sidebarOpen ? " sidebar-open" : " sidebar-closed"} ${s.sidebarContainer}`}
      >
        {sidebarContent}
      </div>

      {/* Center: chat */}
      <div className={s.centerPanel}>
        {/* Top bar with sidebar toggle */}
        <div ref={topBarRef} className={s.topBar}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className={s.topBarButton}
          >
            {sidebarOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            className={s.topBarButton}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {showChat && (
            <div className={s.chatActions}>
              <button
                onClick={handleExportSession}
                disabled={!selectedSession}
                title={selectedSession ? "Export HTML" : "Export is available after the session is saved"}
                aria-label="Export HTML"
                className={`${s.exportButton} ${selectedSession ? s.exportButtonEnabled : s.exportButtonDisabled}`}
              >
                <span
                  className={s.exportIcon}
                  style={{ color: selectedSession ? "var(--text-muted)" : "var(--text-dim)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <span>Export</span>
              </button>
              <BranchNavigator
                tree={branchTree}
                activeLeafId={branchActiveLeafId}
                onLeafChange={handleBranchLeafChange}
                inline
                containerRef={topBarRef}
                open={activeTopPanel === "branches"}
                onToggle={() => toggleTopPanel("branches")}
                hasSession
              />
              <button
                ref={systemBtnRef}
                onClick={() => toggleTopPanel("system")}
                className={`${s.systemButton} ${activeTopPanel === "system" ? s.systemButtonActive : s.systemButtonDefault} hover-text`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: systemPrompt ? "var(--accent)" : "var(--text-dim)", flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="13" y2="17" />
                </svg>
                <span>System</span>
              </button>
            </div>
          )}
          {/* Session stats — right-aligned in top bar */}
          {showChat && (sessionStats || contextUsage) && (() => {
            const t = sessionStats?.tokens;
            const c = sessionStats?.cost ?? 0;
            const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
            const costStr = c > 0 ? (c >= 0.01 ? `$${c.toFixed(2)}` : `<$0.01`) : null;

            let ctxColor = "var(--text-muted)";
            let ctxStr: string | null = null;
            if (contextUsage?.contextWindow) {
              const pct = contextUsage.percent;
              if (pct !== null && pct > 90) ctxColor = "var(--color-error)";
              else if (pct !== null && pct > 70) ctxColor = "var(--color-warning-text-strong)";
              ctxStr = pct !== null ? `${pct.toFixed(0)}% / ${fmt(contextUsage.contextWindow)}` : `? / ${fmt(contextUsage.contextWindow)}`;
            }

            const tooltipParts: string[] = [];
            if (t) {
              tooltipParts.push(`in: ${t.input.toLocaleString()}`);
              tooltipParts.push(`out: ${t.output.toLocaleString()}`);
              tooltipParts.push(`cache read: ${t.cacheRead.toLocaleString()}`);
              tooltipParts.push(`cache write: ${t.cacheWrite.toLocaleString()}`);
              if (c > 0) tooltipParts.push(`cost: $${c.toFixed(4)}`);
            }
            if (contextUsage?.contextWindow) {
              const pct = contextUsage.percent;
              tooltipParts.push(`context: ${pct !== null ? pct.toFixed(1) + "%" : "unknown"} of ${contextUsage.contextWindow.toLocaleString()} tokens`);
            }
            const tooltip = tooltipParts.join("  |  ");

            return (
              <div
                title={tooltip}
                className={s.sessionStats}
                style={{ paddingRight: rightPanelOpen ? 12 : 48 }}
              >
                {t && t.input > 0 && (
                  <span className={s.tokenStat}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="8.5" x2="5" y2="1.5" /><polyline points="2 4 5 1.5 8 4" />
                    </svg>
                    {fmt(t.input)}
                  </span>
                )}
                {t && t.output > 0 && (
                  <span className={s.tokenStat}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="1.5" x2="5" y2="8.5" /><polyline points="2 6 5 8.5 8 6" />
                    </svg>
                    {fmt(t.output)}
                  </span>
                )}
                {t && t.cacheRead > 0 && (
                  <span className={s.tokenStat}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 5a3.5 3.5 0 1 1-1-2.45" /><polyline points="6.5 1.5 8.5 2.5 7.5 4.5" />
                    </svg>
                    {fmt(t.cacheRead)}
                  </span>
                )}
                {costStr && (
                  <span className={s.costStat}>
                    {costStr}
                  </span>
                )}
                {ctxStr && (
                  <span className={s.contextStat} style={{ color: ctxColor }}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 9 L1 5 Q1 1 5 1 Q9 1 9 5 L9 9" /><line x1="1" y1="9" x2="9" y2="9" />
                    </svg>
                    {ctxStr}
                  </span>
                )}
              </div>
            );
          })()}
          {/* Top panel dropdown — shared, only one active at a time */}
          {activeTopPanel && topPanelPos && (
            <div
              className={s.topPanelDropdown}
              style={{
                top: topPanelPos.top,
                left: topPanelPos.left,
                width: topPanelPos.width,
              }}
            >
              {activeTopPanel === "system" && (
                <div className={s.systemPanel}>
                  {systemPrompt ? (
                    <div className={s.systemPromptContent}>
                      {systemPrompt}
                    </div>
                  ) : systemPrompt === "" ? (
                    <div className={s.systemPromptPlaceholder}>
                      System prompt is empty (tools are disabled)
                    </div>
                  ) : (
                    <div className={s.systemPromptPlaceholder}>
                      Send a message to load the system prompt
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Chat content */}
        <div className={s.chatContent}>
          {showChat ? (
            <ChatWindow
              key={sessionKey}
              session={selectedSession}
              newSessionCwd={effectiveNewSessionCwd}
              onAgentEnd={handleAgentEnd}
              onSessionCreated={handleSessionCreated}
              onSessionForked={handleSessionForked}
              modelsRefreshKey={modelsRefreshKey}
              chatInputRef={chatInputRef}
              onBranchDataChange={handleBranchDataChange}
              onSystemPromptChange={handleSystemPromptChange}
              onSessionStatsChange={handleSessionStatsChange}
              onContextUsageChange={handleContextUsageChange}
              onSessionNamed={() => setRefreshKey((k) => k + 1)}
            />
          ) : showPlaceholder ? (
            activeCwd ? (
              <div className={s.placeholderContainer}>
                <div className={s.placeholderIconBg}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={s.placeholderIcon}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className={s.placeholderText}>
                  <div className={s.placeholderTitle}>Select a session</div>
                  <div className={s.placeholderSubtitle}>
                    Choose from the sidebar or start a new one
                  </div>
                </div>
              </div>
            ) : (
              <div className={s.welcomeContainer}>
                <div className={s.welcomeIconBg}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                  </svg>
                </div>
                <div className={s.placeholderText}>
                  <div className={s.welcomeTitle}>Pi with tGD</div>
                  <div className={s.welcomeSubtitle}>
                    Your AI coding assistant, powered by Pi
                  </div>
                </div>
                <div className={s.welcomeSteps}>
                  <div className={s.welcomeStep}>
                    <span className={s.welcomeStepNumber}>1</span>
                    <span className={s.welcomeStepText}>Select a project directory from the sidebar</span>
                  </div>
                  <div className={s.welcomeStep}>
                    <span className={s.welcomeStepNumber}>2</span>
                    <span className={s.welcomeStepText}>Click <strong style={{ color: "var(--text)" }}>+ New</strong> to start a session</span>
                  </div>
                  <div className={s.welcomeStep}>
                    <span className={s.welcomeStepNumber}>3</span>
                    <span className={s.welcomeStepText}>Configure models via <strong style={{ color: "var(--text)" }}>Models</strong> at the bottom</span>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Right panel: file viewer — always mounted, width animated via CSS */}
      <div
        className={`right-panel-container${rightPanelOpen ? " right-panel-open" : " right-panel-closed"} ${s.rightPanelContainer}`}
      >
        {/* Right panel tab bar */}
        <div className={s.rightPanelTabBar}>
          <div className={s.rightPanelTabBarInner}>
            <TabBar
              tabs={fileTabs}
              activeTabId={activeFileTabId ?? ""}
              onSelectTab={setActiveFileTabId}
              onCloseTab={handleCloseFileTab}
            />
          </div>

        </div>

        {/* File content */}
        <div className={s.rightPanelContent}>
          {activeFileTab?.filePath ? (
            <FileViewer filePath={activeFileTab.filePath} cwd={activeCwd ?? undefined} />
          ) : (
            <div className={s.rightPanelEmpty}>
              No file open
            </div>
          )}
        </div>
      </div>
    </div>
    {/* File panel toggle — always visible at top-right */}
    <button
      onClick={() => setRightPanelOpen((v) => !v)}
      title={rightPanelOpen ? "Hide file panel" : "Show file panel"}
      className={`${s.filePanelToggle} hover-text`}
      style={{ color: rightPanelOpen ? "var(--text)" : "var(--text-muted)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    </button>
    {modelsConfigOpen && <Suspense fallback={null}><ModelsConfig onClose={() => { setModelsConfigOpen(false); setModelsRefreshKey((k) => k + 1); }} /></Suspense>}
    {skillsConfigOpen && (activeCwd ?? selectedSession?.cwd ?? newSessionCwd) && (
      <Suspense fallback={null}><SkillsConfig cwd={(activeCwd ?? selectedSession?.cwd ?? newSessionCwd)!} onClose={() => setSkillsConfigOpen(false)} /></Suspense>
    )}
    </>
  );
}
