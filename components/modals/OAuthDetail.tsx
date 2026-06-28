"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OAuthProvider, OAuthLoginState } from "./models-config-types";
import { SectionTitle } from "./models-config-forms";
import styles from "./OAuthDetail.module.css";

export function OAuthDetail({ provider, onRefresh }: { provider: OAuthProvider; onRefresh: () => void }) {
  const [loginState, setLoginState] = useState<OAuthLoginState>({ phase: "idle" });
  const [inputValue, setInputValue] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loginState.phase === "auth" || loginState.phase === "prompt") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loginState.phase]);

  // Reset state when provider changes
  useEffect(() => {
    setLoginState({ phase: "idle" });
    setInputValue("");
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, [provider.id]);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  const handleLogin = useCallback(() => {
    eventSourceRef.current?.close();
    setLoginState({ phase: "connecting" });
    setInputValue("");

    const es = new EventSource(`/api/auth/login/${encodeURIComponent(provider.id)}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as {
        type: string; url?: string; instructions?: string | null;
        token?: string; message?: string; placeholder?: string | null;
        userCode?: string; verificationUri?: string; intervalSeconds?: number | null; expiresInSeconds?: number | null;
        options?: { id: string; label: string }[];
      };
      if (data.type === "auth") {
        setLoginState({ phase: "auth", url: data.url!, instructions: data.instructions ?? null, token: data.token! });
        window.open(data.url!, "_blank", "noopener,noreferrer");
      } else if (data.type === "device_code") {
        setLoginState({
          phase: "device_code",
          userCode: data.userCode!,
          verificationUri: data.verificationUri!,
          intervalSeconds: data.intervalSeconds ?? null,
          expiresInSeconds: data.expiresInSeconds ?? null,
        });
        window.open(data.verificationUri!, "_blank", "noopener,noreferrer");
      } else if (data.type === "prompt_request") {
        setLoginState({ phase: "prompt", message: data.message!, placeholder: data.placeholder ?? null, token: data.token! });
      } else if (data.type === "select_request") {
        setLoginState({ phase: "select", message: data.message!, options: data.options ?? [], token: data.token! });
      } else if (data.type === "progress") {
        setLoginState({ phase: "progress", message: data.message! });
      } else if (data.type === "success") {
        es.close();
        setLoginState({ phase: "success" });
        onRefresh();
      } else if (data.type === "error") {
        es.close();
        setLoginState({ phase: "error", message: data.message! });
      } else if (data.type === "cancelled") {
        es.close();
        setLoginState({ phase: "idle" });
      }
    };
    es.onerror = () => {
      es.close();
      setLoginState((prev) => prev.phase === "success" ? prev : { phase: "error", message: "Connection lost" });
    };
  }, [provider.id, onRefresh]);

  const handleLogout = useCallback(async () => {
    await fetch(`/api/auth/logout/${encodeURIComponent(provider.id)}`, { method: "POST" });
    setLoginState({ phase: "idle" });
    onRefresh();
  }, [provider.id, onRefresh]);

  const submitCode = useCallback(async (token: string, code: string) => {
    if (!code.trim()) return;
    setLoginState({ phase: "progress", message: "Verifying…" });
    try {
      const res = await fetch(`/api/auth/login/${encodeURIComponent(provider.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: code.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setLoginState({ phase: "error", message: d.error ?? `Server error ${res.status}` });
        return;
      }
      setInputValue("");
      // Success path: SSE stream will emit "success" and update state
    } catch (e) {
      setLoginState({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  }, [provider.id]);

  const submitSelection = useCallback(async (token: string, value: string) => {
    setLoginState({ phase: "progress", message: "Continuing…" });
    try {
      const res = await fetch(`/api/auth/login/${encodeURIComponent(provider.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setLoginState({ phase: "error", message: d.error ?? `Server error ${res.status}` });
      }
    } catch (e) {
      setLoginState({ phase: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  }, [provider.id]);

  const isWorking = loginState.phase === "connecting" || loginState.phase === "progress" ||
    loginState.phase === "auth" || loginState.phase === "device_code" ||
    loginState.phase === "prompt" || loginState.phase === "select";

  const hasInput = !!inputValue.trim();

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <SectionTitle>Subscription</SectionTitle>
        <div className={styles.statusBadge}>
          <span className={`${styles.statusDot} ${provider.loggedIn ? styles.statusDotConnected : styles.statusDotDisconnected}`} />
          <span className={`${styles.statusText} ${provider.loggedIn ? styles.statusTextConnected : styles.statusTextDisconnected}`}>
            {provider.loggedIn ? "connected" : "not connected"}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className={styles.statusArea}>
        {loginState.phase === "idle" && (
          <p className={styles.messageText}>
            {provider.loggedIn ? "Already connected. You can re-login or disconnect." : `Connect your ${provider.name} account.`}
          </p>
        )}
        {loginState.phase === "connecting" && (
          <p className={styles.messageTextSimple}>Opening browser…</p>
        )}
        {loginState.phase === "select" && (
          <div className={styles.columnGap10}>
            <p className={styles.messageText}>
              {loginState.message}
            </p>
            <div className={styles.optionsContainer}>
              {loginState.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => submitSelection(loginState.token, option.id)}
                  className={styles.optionButton}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {(loginState.phase === "auth" || loginState.phase === "prompt") && (
          <div className={styles.columnGap10}>
            <p className={styles.messageText}>
              {loginState.phase === "auth"
                ? "Complete sign-in in the browser, then copy the redirect URL from the address bar and paste it below."
                : loginState.message}
            </p>
            {loginState.phase === "auth" && (
              <p className={styles.helpText}>
                If the browser window did not open,{" "}
                <a href={loginState.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  click here to open the login page
                </a>
                .
              </p>
            )}
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitCode(loginState.token, inputValue); }}
                placeholder={loginState.phase === "auth" ? "http://localhost:1455/auth/callback?code=…" : (loginState.placeholder ?? "Enter value…")}
                className={styles.textInput}
              />
              <button
                onClick={() => submitCode(loginState.token, inputValue)}
                disabled={!hasInput}
                className={`${styles.submitBtn} ${hasInput ? styles.submitBtnEnabled : styles.submitBtnDisabled}`}
              >
                Submit
              </button>
            </div>
          </div>
        )}
        {loginState.phase === "device_code" && (
          <div className={styles.columnGap10}>
            <p className={styles.messageText}>
              Open the verification page and enter this code:
            </p>
            <div className={styles.codeDisplay}>
              {loginState.userCode}
            </div>
            <p className={styles.helpText}>
              <a href={loginState.verificationUri} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {loginState.verificationUri}
              </a>
              {loginState.expiresInSeconds ? ` Expires in ${Math.ceil(loginState.expiresInSeconds / 60)} minutes.` : ""}
            </p>
          </div>
        )}
        {loginState.phase === "progress" && (
          <p className={styles.messageTextSimple}>{loginState.message}</p>
        )}
        {loginState.phase === "success" && (
          <p className={styles.successMessage}>Connected successfully.</p>
        )}
        {loginState.phase === "error" && (
          <p className={styles.errorMessage}>{loginState.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actionsRow}>
        {isWorking ? (
          <button
            onClick={() => { eventSourceRef.current?.close(); setLoginState({ phase: "idle" }); }}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        ) : (
          <>
            <button
              onClick={handleLogin}
              className={styles.loginBtn}
            >
              {provider.loggedIn ? "Re-login" : "Login"}
            </button>
            {provider.loggedIn && (
              <button
                onClick={handleLogout}
                className={styles.disconnectBtn}
              >
                Disconnect
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
