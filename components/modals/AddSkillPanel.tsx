"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SkillSearchResult } from "@/app/api/skills/search/route";
import { shortenPath } from "./skills-config-types";
import styles from "./AddSkillPanel.module.css";

export function AddSkillPanel({
  cwd,
  onInstalled,
}: {
  cwd: string;
  onInstalled: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installedPkgs, setInstalledPkgs] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<"global" | "project">("global");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const res = await fetch("/api/skills/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      const d = (await res.json()) as {
        results?: SkillSearchResult[];
        error?: string;
      };
      if (d.error) {
        setSearchError(d.error);
        return;
      }
      setResults(d.results ?? []);
      if ((d.results ?? []).length === 0) setSearchError("No skills found");
    } catch (e) {
      setSearchError(String(e));
    } finally {
      setSearching(false);
    }
  }, []);

  const install = useCallback(
    async (pkg: string) => {
      setInstalling(pkg);
      setInstallError(null);
      try {
        const res = await fetch("/api/skills/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package: pkg, scope, cwd }),
        });
        const d = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || d.error) {
          setInstallError(d.error ?? `HTTP ${res.status}`);
          return;
        }
        setInstalledPkgs((prev) => new Set(prev).add(pkg));
        onInstalled();
      } catch (e) {
        setInstallError(String(e));
      } finally {
        setInstalling(null);
      }
    },
    [onInstalled, scope, cwd],
  );

  const installPath =
    scope === "global"
      ? "~/.pi/agent/skills/"
      : `${shortenPath(cwd)}/.pi/agent/skills/`;

  const searchDisabled = searching || !query.trim();

  return (
    <div className={styles.container}>
      {/* ── Header area ── */}
      <div className={styles.headerArea}>
        <div className={styles.title}>
          Add Skill
        </div>

        {/* Search row */}
        <div className={styles.searchRow}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search(query);
            }}
            placeholder="e.g. react, testing, deploy"
            className={styles.searchInput}
          />
          <button
            onClick={() => search(query)}
            disabled={searchDisabled}
            className={`${styles.searchBtn} ${searchDisabled ? styles.searchBtnDisabled : styles.searchBtnEnabled}`}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Scope + install path row */}
        <div className={styles.scopeRow}>
          <div className={styles.scopeToggle}>
            {(["global", "project"] as const).map((s) => {
              const isActive = scope === s;
              const scopeBtnClass = isActive
                ? styles.scopeBtnActive
                : s === "global"
                  ? styles.scopeBtnInactiveFirst
                  : styles.scopeBtnInactive;
              return (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`${styles.scopeBtn} ${scopeBtnClass}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <span className={styles.installPath}>
            → {installPath}
          </span>
        </div>

        {/* Errors */}
        {searchError && (
          <div className={styles.errorText}>{searchError}</div>
        )}
        {installError && (
          <div className={styles.errorTextBreak}>
            {installError}
          </div>
        )}
      </div>

      {/* ── Results list ── */}
      {results.length > 0 ? (
        <div className={styles.resultsList}>
          {results.map((r) => {
            const isInstalled = installedPkgs.has(r.package);
            const isInstalling = installing === r.package;
            // split "owner/repo@skill" for cleaner display
            const atIdx = r.package.indexOf("@");
            const repopart = atIdx > -1 ? r.package.slice(0, atIdx) : r.package;
            const skillpart = atIdx > -1 ? r.package.slice(atIdx + 1) : null;

            let installBtnClass = styles.installBtn;
            if (isInstalled) {
              installBtnClass += ` ${styles.installBtnInstalled}`;
            } else if (isInstalling) {
              installBtnClass += ` ${styles.installBtnInstalling}`;
            } else if (installing !== null) {
              installBtnClass += ` ${styles.installBtnDisabled}`;
            } else {
              installBtnClass += ` ${styles.installBtnDefault}`;
            }

            return (
              <div
                key={r.package}
                className={styles.resultItem}
              >
                <div className={styles.resultInfo}>
                  {/* skill name prominent */}
                  <div className={styles.skillName}>
                    {skillpart ?? repopart}
                  </div>
                  {/* repo + installs + link row */}
                  <div className={styles.metaRow}>
                    <span className={styles.repoText}>
                      {repopart}
                    </span>
                    <span className={styles.installsText}>
                      {r.installs}
                    </span>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.skillsLink}
                      >
                        skills.sh ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    !isInstalled && !isInstalling && install(r.package)
                  }
                  disabled={isInstalled || isInstalling || installing !== null}
                  className={installBtnClass}
                >
                  {isInstalled
                    ? "✓ Installed"
                    : isInstalling
                      ? "Installing…"
                      : "Install"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !searchError &&
        !searching && (
          <div className={styles.emptyState}>
            Search{" "}
            <a
              href="https://skills.sh"
              target="_blank"
              rel="noreferrer"
              className={styles.emptyStateLink}
            >
              skills.sh
            </a>{" "}
            to discover and install skills for your agent.
          </div>
        )
      )}
    </div>
  );
}
