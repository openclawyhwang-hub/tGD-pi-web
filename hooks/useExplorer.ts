"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Manages file explorer open/close state and refresh indicator.
 *
 * @param explorerRefreshKey - When this changes, explorer content is remounted via key bump.
 */
export function useExplorer(explorerRefreshKey?: number) {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [explorerKey, setExplorerKey] = useState(0);
  const [explorerRefreshDone, setExplorerRefreshDone] = useState(false);
  const explorerRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (explorerRefreshKey !== undefined) setExplorerKey((k) => k + 1);
  }, [explorerRefreshKey]);

  const toggleExplorer = useCallback(() => {
    setExplorerOpen((v) => !v);
  }, []);

  const refreshExplorer = useCallback(() => {
    setExplorerKey((k) => k + 1);
    setExplorerRefreshDone(true);
    if (explorerRefreshTimerRef.current) clearTimeout(explorerRefreshTimerRef.current);
    explorerRefreshTimerRef.current = setTimeout(() => setExplorerRefreshDone(false), 2000);
  }, []);

  return { explorerOpen, explorerKey, explorerRefreshDone, toggleExplorer, refreshExplorer };
}
