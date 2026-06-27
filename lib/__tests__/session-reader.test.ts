import { describe, it, expect } from "vitest";
import { buildTree, getLeafId } from "../session-reader";
import type { SessionEntry } from "../types";

// Helper to create a minimal SessionEntry
function entry(id: string, parentId?: string, extra?: Partial<SessionEntry>): SessionEntry {
  return {
    id,
    type: "message",
    role: "user",
    content: `msg-${id}`,
    timestamp: "2026-01-01T00:00:00Z",
    parentId,
    ...extra,
  } as unknown as SessionEntry;
}

describe("getLeafId", () => {
  it("returns null for empty array", () => {
    expect(getLeafId([])).toBeNull();
  });

  it("returns the last entry's id", () => {
    const entries = [entry("a"), entry("b"), entry("c")];
    expect(getLeafId(entries)).toBe("c");
  });
});

describe("buildTree", () => {
  it("returns empty roots for empty entries", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("builds a flat list of independent entries", () => {
    const entries = [entry("a"), entry("b"), entry("c")];
    const tree = buildTree(entries);
    expect(tree).toHaveLength(3);
    expect(tree.map((n) => n.entry.id)).toEqual(["a", "b", "c"]);
  });

  it("nests children under parents", () => {
    const entries = [entry("a"), entry("b", "a"), entry("c", "b")];
    const tree = buildTree(entries);
    expect(tree).toHaveLength(1);
    expect(tree[0].entry.id).toBe("a");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].entry.id).toBe("b");
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].entry.id).toBe("c");
  });

  it("handles orphan entries (parent missing)", () => {
    const entries = [entry("b", "missing-parent")];
    const tree = buildTree(entries);
    expect(tree).toHaveLength(1);
    expect(tree[0].entry.id).toBe("b");
    expect(tree[0].children).toHaveLength(0);
  });

  it("sorts children by timestamp", () => {
    const entries = [
      entry("a"),
      entry("c", "a", { timestamp: "2026-01-03T00:00:00Z" }),
      entry("b", "a", { timestamp: "2026-01-02T00:00:00Z" }),
    ];
    const tree = buildTree(entries);
    expect(tree[0].children.map((n) => n.entry.id)).toEqual(["b", "c"]);
  });

  it("applies labels from label entries", () => {
    const entries = [
      entry("a"),
      { id: "label-1", type: "label", targetId: "a", label: "My Label" } as SessionEntry,
    ];
    const tree = buildTree(entries);
    expect(tree[0].label).toBe("My Label");
  });

  it("removes label when label entry has no label", () => {
    const entries = [
      entry("a"),
      { id: "label-1", type: "label", targetId: "a", label: "My Label" } as SessionEntry,
      { id: "label-2", type: "label", targetId: "a" } as SessionEntry,
    ];
    const tree = buildTree(entries);
    expect(tree[0].label).toBeUndefined();
  });
});
