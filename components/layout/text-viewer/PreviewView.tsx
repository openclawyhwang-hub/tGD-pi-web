"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../TextFileViewer.module.css";

interface Props {
  content: string;
  language: string;
}

export function PreviewView({ content, language }: Props) {
  if (language === "html") {
    return (
      <iframe
        srcDoc={content}
        sandbox="allow-scripts"
        className={styles.htmlPreview}
        title="HTML preview"
      />
    );
  }
  if (language === "markdown") {
    return (
      <div className={`markdown-body markdown-file-preview ${styles.markdownPreview}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }
  return null;
}
