export const TOOL_PRESETS = ["off", "default", "full"] as const;
export const TOOL_PRESET_MAP: Record<"off" | "default" | "full", "none" | "default" | "full"> = { off: "none", default: "default", full: "full" };
export const COMPOSITION_END_ENTER_GRACE_MS = 100;

export const THINKING_LEVELS = ["auto", "off", "minimal", "low", "medium", "high", "xhigh"] as const;
export type ThinkingLevelOption = typeof THINKING_LEVELS[number];
export const THINKING_LEVEL_DESC: Record<ThinkingLevelOption, string> = {
  auto: "沿用 pi 默认设置",
  off: "关闭推理",
  minimal: "最少推理",
  low: "低强度推理",
  medium: "中等推理",
  high: "高强度推理",
  xhigh: "最高强度推理",
};

// tGD 7-phase slash commands
export const TGD_COMMANDS = [
  { name: "/tgd-map", description: "Map — understand the codebase" },
  { name: "/tgd-define", description: "Define — write the PRD" },
  { name: "/tgd-plan", description: "Plan — break into tasks" },
  { name: "/tgd-develop", description: "Develop — implement features" },
  { name: "/tgd-verify", description: "Verify — run tests" },
  { name: "/tgd-review", description: "Review — code review" },
  { name: "/tgd-release", description: "Release — ship to production" },
];
