"use client";

import { useEffect, useState } from "react";
import { encodeFilePathForApi, getFileName, getRelativeFilePath } from "@/lib/file-paths";
import { useFileWatch } from "@/hooks/useFileWatch";
import { formatSize } from "./file-viewer-utils";
import styles from "./ImageViewer.module.css";

export function ImageViewer({ filePath, cwd }: { filePath: string; cwd?: string }) {
  const { watching, refreshTrigger } = useFileWatch(filePath);
  const [bust, setBust] = useState(0);
  const [size, setSize] = useState<number | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ext = getFileName(filePath).toLowerCase().split(".").pop() ?? "";

  useEffect(() => {
    setBust(0);
    setSize(null);
    setNaturalSize(null);
    setError(null);
  }, [filePath]);

  // Bust image cache on each file-watch change event
  useEffect(() => {
    if (refreshTrigger > 0) {
      setBust((b) => b + 1);
      setSize(null);
      setNaturalSize(null);
      setError(null);
    }
  }, [refreshTrigger]);

  const encoded = encodeFilePathForApi(filePath);
  const src = `/api/files/${encoded}?type=read${bust ? `&v=${bust}` : ""}`;

  const formatSizeStr = size != null ? formatSize(size) : null;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.filePath} title={filePath}>
          {getRelativeFilePath(filePath, cwd)}
        </span>
        <span className={styles.extension}>{ext || "image"}</span>
        {naturalSize && <span>{naturalSize.w} × {naturalSize.h}</span>}
        {formatSizeStr && <span>{formatSizeStr}</span>}
        <span
          title={watching ? "Live sync active" : "Not watching"}
          className={`${styles.watchStatus} ${watching ? styles.watchStatusLive : styles.watchStatusStatic}`}
        >
          <span
            className={`${styles.watchDot} ${watching ? styles.watchDotLive : styles.watchDotStatic}`}
          />
          {watching ? "live" : "static"}
        </span>
      </div>
      <div className={styles.imageContainer}>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={filePath}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            onError={() => setError("Failed to load image")}
            className={styles.image}
          />
        )}
      </div>
    </div>
  );
}
