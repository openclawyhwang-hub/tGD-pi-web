import { describe, it, expect } from "vitest";
import { normalizeToolCalls } from "../normalize";

describe("normalizeToolCalls", () => {
  it("passes through non-assistant messages unchanged", () => {
    const msg = { role: "user", content: "hello" } as any;
    expect(normalizeToolCalls(msg)).toBe(msg);
  });

  it("passes through assistant messages with string content", () => {
    const msg = { role: "assistant", content: "hello" } as any;
    expect(normalizeToolCalls(msg)).toBe(msg);
  });

  it("normalizes toolCall blocks with id/name/arguments", () => {
    const msg = {
      role: "assistant",
      content: [
        { type: "text", text: "let me check" },
        { type: "toolCall", id: "abc123", name: "web_search", arguments: { query: "test" } },
      ],
    } as any;
    const result = normalizeToolCalls(msg);
    const blocks = (result as any).content;
    expect(blocks[0].type).toBe("text");
    expect(blocks[1]).toEqual({
      type: "toolCall",
      toolCallId: "abc123",
      toolName: "web_search",
      input: { query: "test" },
    });
  });

  it("normalizes toolCall blocks with toolCallId/toolName/input", () => {
    const msg = {
      role: "assistant",
      content: [
        { type: "toolCall", toolCallId: "def456", toolName: "read_file", input: { path: "/foo" } },
      ],
    } as any;
    const result = normalizeToolCalls(msg);
    const blocks = (result as any).content;
    expect(blocks[0]).toEqual({
      type: "toolCall",
      toolCallId: "def456",
      toolName: "read_file",
      input: { path: "/foo" },
    });
  });

  it("handles missing fields gracefully", () => {
    const msg = {
      role: "assistant",
      content: [
        { type: "toolCall" },
      ],
    } as any;
    const result = normalizeToolCalls(msg);
    const blocks = (result as any).content;
    expect(blocks[0]).toEqual({
      type: "toolCall",
      toolCallId: "",
      toolName: "",
      input: {},
    });
  });

  it("handles mixed content with text and toolCalls", () => {
    const msg = {
      role: "assistant",
      content: [
        { type: "text", text: "searching..." },
        { type: "toolCall", id: "a", name: "search", arguments: { q: "hi" } },
        { type: "text", text: "done" },
      ],
    } as any;
    const result = normalizeToolCalls(msg);
    const blocks = (result as any).content;
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("text");
    expect(blocks[1].toolCallId).toBe("a");
    expect(blocks[2].type).toBe("text");
  });
});
