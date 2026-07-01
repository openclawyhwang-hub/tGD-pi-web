import { describe, it, expect } from "vitest";
import { formatSize, formatDuration, getFileExt, DOCX_PREVIEW_MAX_BYTES } from "../file-viewer-utils";

describe("formatSize", () => {
  it("formats bytes", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("formatDuration", () => {
  it("returns empty for non-finite values", () => {
    expect(formatDuration(NaN)).toBe("");
    expect(formatDuration(Infinity)).toBe("");
    expect(formatDuration(-Infinity)).toBe("");
  });

  it("formats seconds as M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("rounds seconds", () => {
    expect(formatDuration(59.6)).toBe("1:00");
    expect(formatDuration(59.4)).toBe("0:59");
  });
});

describe("getFileExt", () => {
  it("extracts extension lowercase", () => {
    expect(getFileExt("/path/to/file.TXT")).toBe("txt");
    expect(getFileExt("a.b.ts")).toBe("ts");
  });

  it("returns the filename (lowercased) for files without an extension", () => {
    // split(".").pop() on "Makefile" returns "makefile" (lowercased by the helper).
    expect(getFileExt("Makefile")).toBe("makefile");
  });
});

describe("DOCX_PREVIEW_MAX_BYTES", () => {
  it("is 10 MB", () => {
    expect(DOCX_PREVIEW_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
