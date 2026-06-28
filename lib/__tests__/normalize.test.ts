import { describe, it, expect } from "vitest";
import { normalizeToolCalls } from "../normalize";
import type { AgentMessage, AssistantMessage, AssistantContentBlock } from "../types";

function asMsg(input: unknown): AgentMessage {
  return input as AgentMessage;
}

function asAssistant(msg: AgentMessage): AssistantMessage {
  return msg as AssistantMessage;
}

function asBlock(input: unknown): AssistantContentBlock {
  return input as AssistantContentBlock;
}

describe("normalizeToolCalls", () => {
  it("passes through non-assistant messages unchanged", () => {
    const msg = asMsg({ role: "user", content: "hello" });
    expect(normalizeToolCalls(msg)).toBe(msg);
  });

  it("passes through assistant messages with string content", () => {
    const msg = asMsg({ role: "assistant", content: "hello" });
    expect(normalizeToolCalls(msg)).toBe(msg);
  });

  it("normalizes toolCall blocks with id/name/arguments", () => {
    const msg = asMsg({
      role: "assistant",
      content: [
        asBlock({ type: "text", text: "let me check" }),
        asBlock({ type: "toolCall", id: "abc123", name: "web_search", arguments: { query: "test" } }),
      ],
    });
    const result = normalizeToolCalls(msg);
    const blocks = asAssistant(result).content;
    expect(blocks[0].type).toBe("text");
    expect(blocks[1]).toEqual({
      type: "toolCall",
      toolCallId: "abc123",
      toolName: "web_search",
      input: { query: "test" },
    });
  });

  it("normalizes toolCall blocks with toolCallId/toolName/input", () => {
    const msg = asMsg({
      role: "assistant",
      content: [
        asBlock({ type: "toolCall", toolCallId: "def456", toolName: "read_file", input: { path: "/foo" } }),
      ],
    });
    const result = normalizeToolCalls(msg);
    const blocks = asAssistant(result).content;
    expect(blocks[0]).toEqual({
      type: "toolCall",
      toolCallId: "def456",
      toolName: "read_file",
      input: { path: "/foo" },
    });
  });

  it("handles missing fields gracefully", () => {
    const msg = asMsg({
      role: "assistant",
      content: [
        asBlock({ type: "toolCall" }),
      ],
    });
    const result = normalizeToolCalls(msg);
    const blocks = asAssistant(result).content;
    expect(blocks[0]).toEqual({
      type: "toolCall",
      toolCallId: "",
      toolName: "",
      input: {},
    });
  });

  it("handles mixed content with text and toolCalls", () => {
    const msg = asMsg({
      role: "assistant",
      content: [
        asBlock({ type: "text", text: "searching..." }),
        asBlock({ type: "toolCall", id: "a", name: "search", arguments: { q: "hi" } }),
        asBlock({ type: "text", text: "done" }),
      ],
    });
    const result = normalizeToolCalls(msg);
    const blocks = asAssistant(result).content;
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("text");
    expect(blocks[1].type === "toolCall" && blocks[1].toolCallId).toBe("a");
    expect(blocks[2].type).toBe("text");
  });
});
