"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SessionInfo } from "@/lib/types";

/**
 * Manages session list loading, pinned sessions, and refresh indicator.
 *
 * @param refreshKey - When this number changes, sessions are reloaded (without loading spinner).
 */
export function useSessions(refreshKey?: number) {
  const [allSessions, setAllSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [sessionRefreshDone, setSessionRefreshDone] = useState(false);
  const sessionRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadPins = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/pins");
      if (!res.ok) return;
      const data = await res.json() as { pinned?: string[] };
      setPinnedIds(Array.isArray(data.pinned) ? data.pinned : []);
    } catch {
      // Pins are best-effort; missing file is fine.
    }
  }, []);

  const handlePinToggle = useCallback(async (id: string) => {
    const isPinned = pinnedIds.includes(id);
    // Optimistic update so the star flips immediately.
    setPinnedIds((prev) =>
      isPinned ? prev.filter((x) => x !== id) : [id, ...prev.filter((x) => x !== id)],
    );
    try {
      const res = await fetch("/api/sessions/pins", {
        method: isPinned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        // Roll back on server error.
        setPinnedIds((prev) =>
          isPinned ? [id, ...prev.filter((x) => x !== id)] : prev.filter((x) => x !== id),
        );
      }
    } catch {
      // Roll back on network error.
      setPinnedIds((prev) =>
        isPinned ? [id, ...prev.filter((x) => x !== id)] : prev.filter((x) => x !== id),
      );
    }
  }, [pinnedIds]);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    const isFirst = !initialLoadDone.current;
    initialLoadDone.current = true;
    loadSessions(isFirst);
    loadPins();
  }, [loadSessions, loadPins, refreshKey]);

  return { allSessions, loading, error, pinnedIds, sessionRefreshDone, loadSessions, handlePinToggle };
}
