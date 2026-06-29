"use client";

import styles from "./PiAgentTitle.module.css";

export function PiAgentTitle() {
  return (
    <span
      className={styles.titleIdle}
      style={{
        color: "var(--text)",
        fontFamily: "inherit",
        minWidth: "6ch",
      }}
    >
      <span className={styles.piSymbol}>π</span>
      <span className={styles.titleText}>with tGD</span>
    </span>
  );
}
