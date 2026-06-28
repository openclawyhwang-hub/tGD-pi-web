"use client";

import React from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled render errors in its subtree and shows a recovery UI
 * instead of a blank white page.  The user can retry the failed subtree
 * or reload the entire page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; in prod you'd send to an error-reporting service.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className={styles.container}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-error)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className={styles.title}>
            Something went wrong
          </div>
          <div className={styles.message}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </div>
          <div className={styles.actions}>
            <button
              onClick={this.handleRetry}
              className={styles.retryBtn}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className={styles.reloadBtn}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
