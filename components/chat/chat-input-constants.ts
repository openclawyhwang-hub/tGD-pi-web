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
  { name: "/tgd-map", description: "Map - 定義問題空間" },
  { name: "/tgd-define", description: "Define - 拆解需求" },
  { name: "/tgd-plan", description: "Plan - 規劃實作" },
  { name: "/tgd-develop", description: "Develop - 實作開發" },
  { name: "/tgd-verify", description: "Verify - 測試驗證" },
  { name: "/tgd-review", description: "Review - 程式碼審查" },
  { name: "/tgd-ship", description: "Ship - 部署上線" },
];
