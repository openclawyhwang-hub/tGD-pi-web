"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface CwdState {
  selectedCwd: string | null;
  homeDir: string;
  dropdownOpen: boolean;
  customPathOpen: boolean;
  customPathValue: string;
  customPathError: string | null;
  customPathValidating: boolean;
}

interface CwdActions {
  commitCustomPath: () => Promise<void>;
  handleDefaultCwd: () => Promise<void>;
  setSelectedCwd: (v: string | null) => void;
  setDropdownOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setCustomPathOpen: (v: boolean) => void;
  setCustomPathValue: (v: string) => void;
  setCustomPathError: (v: string | null) => void;
}

interface CwdRefs {
  customPathInputRef: React.RefObject<HTMLInputElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Manages CWD picker state: selected cwd, home dir, dropdown open/close,
 * custom path entry, validation, and outside-click dismissal.
 *
 * @param onCwdChange - Called whenever selectedCwd changes.
 */
export function useCwd(onCwdChange?: (cwd: string | null) => void) {
  const [selectedCwd, setSelectedCwd] = useState<string | null>(null);
  const [homeDir, setHomeDir] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customPathOpen, setCustomPathOpen] = useState(false);
  const [customPathValue, setCustomPathValue] = useState("");
  const [customPathError, setCustomPathError] = useState<string | null>(null);
  const [customPathValidating, setCustomPathValidating] = useState(false);
  const customPathInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notify parent when cwd changes
  useEffect(() => {
    onCwdChange?.(selectedCwd);
  }, [selectedCwd, onCwdChange]);

  // Fetch home directory on mount
  useEffect(() => {
    fetch("/api/home").then((r) => r.json()).then((d: { home?: string }) => {
      if (d.home) setHomeDir(d.home);
    }).catch(() => {});
  }, []);

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

  const state: CwdState = {
    selectedCwd,
    homeDir,
    dropdownOpen,
    customPathOpen,
    customPathValue,
    customPathError,
    customPathValidating,
  };

  const actions: CwdActions = {
    commitCustomPath,
    handleDefaultCwd,
    setSelectedCwd,
    setDropdownOpen,
    setCustomPathOpen,
    setCustomPathValue,
    setCustomPathError,
  };

  const refs: CwdRefs = {
    customPathInputRef,
    dropdownRef,
  };

  return { state, actions, refs };
}
