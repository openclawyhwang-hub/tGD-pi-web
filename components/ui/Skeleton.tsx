"use client";

import styles from "./Skeleton.module.css";

interface Props {
  count?: number;
  /** Width pattern: array of CSS widths (e.g. ["55%", "67%", "79%"]) */
  widths?: (string | number)[];
  /** Extra class for the wrapper (each line also gets a unique key) */
  className?: string;
  /** Inline style for the wrapper */
  style?: React.CSSProperties;
  /** Indent each line by this many pixels (left margin) */
  indentStep?: number;
  /** Vertical spacing between lines */
  marginBottom?: number;
  /** Alternate indent on/off */
  alternateIndent?: boolean;
}

/**
 * Loading skeleton — a stack of animated placeholder lines.
 * Defaults to 6 lines with random-feeling widths to simulate content.
 */
export function Skeleton({
  count = 6,
  widths,
  className,
  style,
  indentStep = 0,
  marginBottom,
  alternateIndent = false,
}: Props) {
  return (
    <div className={className ?? styles.wrapper} style={style}>
      {Array.from({ length: count }, (_, i) => {
        const width = widths?.[i] ?? `${50 + (i % 4) * 12}%`;
        return (
          <div
            key={i}
            className={`skeleton-line ${styles.line}`}
            style={{
              width,
              marginLeft: indentStep ? i * indentStep : alternateIndent ? (i % 2 === 0 ? 0 : 60) : 0,
              marginBottom,
            }}
          />
        );
      })}
    </div>
  );
}
