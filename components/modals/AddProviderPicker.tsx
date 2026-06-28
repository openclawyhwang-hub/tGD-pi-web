"use client";

import { useState, useEffect, useRef } from "react";
import type { OAuthProvider, ApiKeyProvider } from "./models-config-types";
import { ProviderIcon } from "./ProviderIcon";
import styles from "./AddProviderPicker.module.css";

interface AddProviderPickerProps {
  oauthProviders: OAuthProvider[];
  apiKeyProviders: ApiKeyProvider[];
  onSelectOAuth: (id: string) => void;
  onSelectApiKey: (id: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

export function AddProviderPicker({
  oauthProviders, apiKeyProviders,
  onSelectOAuth, onSelectApiKey, onAddCustom, onClose,
}: AddProviderPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

  const q = search.trim().toLowerCase();

  const availableOAuth = oauthProviders.filter((p) => !p.loggedIn && (!q || p.name.toLowerCase().includes(q)));
  const availableApiKey = apiKeyProviders.filter((p) => !p.configured && (!q || p.displayName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)));
  const showCustom = !q || "custom".includes(q) || "openai-compatible".includes(q) || "anthropic-compatible".includes(q);

  const totalCount = availableOAuth.length + availableApiKey.length + (showCustom ? 1 : 0);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        {/* Search */}
        <div className={styles.searchBar}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Search providers…"
            className={styles.searchInput}
          />
        </div>

        {/* Card grid */}
        <div className={styles.cardGridArea}>
          {totalCount === 0 ? (
            <div className={styles.emptyMessage}>No providers match</div>
          ) : (
            <div className={styles.cardGrid}>
              {showCustom && (
                <div className={styles.sectionHeader}>Custom</div>
              )}
              {showCustom && (
                <button
                  onClick={() => { onAddCustom(); onClose(); }}
                  className={`hover-border-accent-bg ${styles.card}`}
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle}>OpenAI / Anthropic compatible</div>
                    <div className={styles.cardSubtitle}>Custom endpoint format</div>
                  </div>
                  <span className={styles.plusIconBox}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.plusIcon}>
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
              )}

              {availableOAuth.length > 0 && (
                <div className={`${styles.sectionHeader} ${showCustom ? styles.sectionHeaderPadding : ""}`}>Subscriptions</div>
              )}
              {availableOAuth.map((p) => (
                <button key={p.id} onClick={() => { onSelectOAuth(p.id); onClose(); }}
                  className={`hover-border-accent-bg ${styles.card}`}
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle}>{p.name}</div>
                    <div className={styles.cardSubtitle}>OAuth</div>
                  </div>
                  <ProviderIcon id={p.id} size={28} />
                </button>
              ))}

              {availableApiKey.length > 0 && (
                <div className={`${styles.sectionHeader} ${availableOAuth.length > 0 ? styles.sectionHeaderPadding : ""}`}>API Key</div>
              )}
              {availableApiKey.map((p) => (
                <button key={p.id} onClick={() => { onSelectApiKey(p.id); onClose(); }}
                  className={`hover-border-accent-bg ${styles.card}`}
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle}>{p.displayName}</div>
                    <div className={styles.cardSubtitle}>{p.modelCount} models</div>
                  </div>
                  <ProviderIcon id={p.id} size={28} />
                </button>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
