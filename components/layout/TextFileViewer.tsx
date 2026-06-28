"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/hooks/useTheme";
import { encodeFilePathForApi, getFileName, getRelativeFilePath } from "@/lib/file-paths";
import { formatSize, type FileData } from "./file-viewer-utils";
import { DiffView } from "./DiffView";
import styles from "./TextFileViewer.module.css";

interface Props {
  filePath: string;
  cwd?: string;
}

export function TextFileViewer({ filePath, cwd }: Props) {
  const { isDark } = useTheme();
  const [data, setData] = useState<FileData | null>(null);
  const [prevContent, setPrevContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [viewMode, setViewMode] = useState<"source" | "diff">("source");
  const [wrapLines, setWrapLines] = useState(false);
  const [watching, setWatching] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

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

  // Initial load + SSE watch setup
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setPrevContent(null);
    setPreviewMode(false);
    setViewMode("source");
    setWrapLines(false);
    setChangeCount(0);
    setWatching(false);

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    fetchContent(filePath).then((d) => {
      if (d?.language === "markdown") setPreviewMode(true);
    }).finally(() => setLoading(false));

    // Set up SSE watch
    const encoded = encodeFilePathForApi(filePath);
    const es = new EventSource(`/api/files/${encoded}?type=watch`);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setWatching(true);
    });

    es.addEventListener("change", () => {
      fetchContent(filePath, true);
    });

    es.addEventListener("error", () => {
      setWatching(false);
    });

    es.onerror = () => {
      setWatching(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [filePath, fetchContent]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        {error}
      </div>
    );
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
          <span
            className={watching ? styles.watchDotActive : styles.watchDotInactive}
          />
          {watching ? "live" : "static"}
        </span>

        {/* Diff / Source toggle — shown only when there are changes */}
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

        {/* HTML source/preview toggle */}
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

        {/* Markdown preview/raw toggle */}
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

      {/* Content area */}
      <div className={styles.contentArea}>
        {viewMode === "diff" && hasDiff ? (
          <DiffView oldContent={prevContent!} newContent={data.content} language={data.language} />
        ) : isHtml && previewMode ? (
          <iframe
            srcDoc={data.content}
            sandbox="allow-scripts"
            className={styles.htmlPreview}
            title="HTML preview"
          />
        ) : isMarkdown && previewMode ? (
          <div
            className={`markdown-body markdown-file-preview ${styles.markdownPreview}`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
          </div>
        ) : (
          <SyntaxHighlighter
            language={data.language === "text" ? "plaintext" : data.language}
            style={isDark ? vscDarkPlus : vs}
            showLineNumbers
            lineNumberStyle={{
              color: "var(--text-dim)",
              fontStyle: "normal",
              minWidth: "3em",
              paddingRight: "1em",
            }}
            customStyle={{
              margin: 0,
              padding: "12px 0",
              background: "var(--bg)",
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: "var(--font-mono)",
              minHeight: "100%",
            }}
            codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
            wrapLongLines={wrapLines}
          >
            {data.content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
