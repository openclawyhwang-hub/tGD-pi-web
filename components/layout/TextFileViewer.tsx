"use client";

import { useEffect, useState, useCallback } from "react";
import { encodeFilePathForApi, getRelativeFilePath } from "@/lib/file-paths";
import { useFileWatch } from "@/hooks/useFileWatch";
import { formatSize, type FileData } from "./file-viewer-utils";
import { SourceView } from "./text-viewer/SourceView";
import { DiffViewMode } from "./text-viewer/DiffViewMode";
import { PreviewView } from "./text-viewer/PreviewView";
import styles from "./TextFileViewer.module.css";

interface Props {
  filePath: string;
  cwd?: string;
}

export function TextFileViewer({ filePath, cwd }: Props) {
  const [data, setData] = useState<FileData | null>(null);
  const [prevContent, setPrevContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [viewMode, setViewMode] = useState<"source" | "diff">("source");
  const [wrapLines, setWrapLines] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const { watching, refreshTrigger } = useFileWatch(filePath);

  const fetchContent = useCallback((filePath: string, isRefresh = false) => {
    const encoded = encodeFilePathForApi(filePath);
    return fetch(`/api/files/${encoded}?type=read`)
      .then((r) => r.json())
      .then((d: FileData & { error?: string }) => {
        if (d.error) {
          setError(d.error);
          return null;
        }
        if (isRefresh) {
          setData((prev) => {
            if (prev) setPrevContent(prev.content);
            return d;
          });
          setChangeCount((c) => c + 1);
        } else {
          setData(d);
        }
        return d;
      })
      .catch((e) => {
        setError(String(e));
        return null;
      });
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setPrevContent(null);
    setPreviewMode(false);
    setViewMode("source");
    setWrapLines(false);
    setChangeCount(0);

    fetchContent(filePath).then((d) => {
      if (d?.language === "markdown") setPreviewMode(true);
    }).finally(() => setLoading(false));
  }, [filePath, fetchContent]);

  // Refresh on file-watch change events
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchContent(filePath, true);
    }
  }, [refreshTrigger, filePath, fetchContent]);

  if (loading) {
    return <div className={styles.loadingState}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (!data) return null;

  const isHtml = data.language === "html";
  const isMarkdown = data.language === "markdown";
  const lines = data.content.split("\n");
  const hasDiff = prevContent !== null && prevContent !== data.content;

  return (
    <div className={styles.root}>
      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.filePath} title={filePath}>
          {getRelativeFilePath(filePath, cwd)}
        </span>
        <span className={styles.language}>{data.language}</span>
        {viewMode === "source" && <span>{lines.length} lines</span>}
        <span>{formatSize(data.size)}</span>

        {/* Live watch indicator */}
        <span
          title={watching ? "Live sync active" : "Not watching"}
          className={watching ? styles.watchIndicatorActive : styles.watchIndicatorInactive}
        >
          <span className={watching ? styles.watchDotActive : styles.watchDotInactive} />
          {watching ? "live" : "static"}
        </span>

        {/* Diff / Source toggle */}
        {hasDiff && (
          <div className={styles.toggleGroup}>
            <button
              onClick={() => setViewMode("source")}
              className={`${styles.toggleGroupFirst} ${viewMode === "source" ? styles.toggleActive : styles.toggleInactive}`}
            >
              Source
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`${styles.toggleGroupSecond} ${viewMode === "diff" ? styles.toggleActive : styles.toggleInactive}`}
            >
              Diff {changeCount > 0 && <span className={styles.changeCount}>+{changeCount}</span>}
            </button>
          </div>
        )}

        {/* Word wrap toggle */}
        {viewMode === "source" && !previewMode && (
          <button
            onClick={() => setWrapLines((v) => !v)}
            title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
            className={`${styles.toggleStandalone} ${wrapLines ? styles.toggleActive : styles.toggleInactive}`}
          >
            wrap
          </button>
        )}

        {/* HTML Code/Preview toggle */}
        {isHtml && viewMode === "source" && (
          <div className={styles.toggleGroup}>
            <button
              onClick={() => setPreviewMode(false)}
              className={`${styles.toggleGroupFirst} ${!previewMode ? styles.toggleActive : styles.toggleInactive}`}
            >
              Code
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`${styles.toggleGroupSecond} ${previewMode ? styles.toggleActive : styles.toggleInactive}`}
            >
              Preview
            </button>
          </div>
        )}

        {/* Markdown Preview/Raw toggle */}
        {isMarkdown && viewMode === "source" && (
          <div className={styles.toggleGroup}>
            <button
              onClick={() => setPreviewMode(true)}
              className={`${styles.toggleGroupFirst} ${previewMode ? styles.toggleActive : styles.toggleInactive}`}
            >
              Preview
            </button>
            <button
              onClick={() => setPreviewMode(false)}
              className={`${styles.toggleGroupSecond} ${!previewMode ? styles.toggleActive : styles.toggleInactive}`}
            >
              Raw
            </button>
          </div>
        )}
      </div>

      {/* Content area — dispatch to mode-specific component */}
      <div className={styles.contentArea}>
        {viewMode === "diff" && hasDiff ? (
          <DiffViewMode
            oldContent={prevContent!}
            newContent={data.content}
            language={data.language}
          />
        ) : (isHtml || isMarkdown) && previewMode ? (
          <PreviewView content={data.content} language={data.language} />
        ) : (
          <SourceView content={data.content} language={data.language} wrapLines={wrapLines} />
        )}
      </div>
    </div>
  );
}
