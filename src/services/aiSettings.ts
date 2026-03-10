// Shared AI settings types and helpers — single source of truth
// Used by both Settings page and useChat hook

const STORAGE_KEY = "neovega-ai-settings";

export interface OpenClawConfig {
  agentUrl: string;
  apiKey: string;
  enabled: boolean;
  systemPrompt: string;
  timeout: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiToken: string;
  model: string;
  temperature: string;
  maxTokens: string;
  enabled: boolean;
}

export interface AISettings {
  openclaw: OpenClawConfig;
  llm: LLMConfig;
  priority: "openclaw" | "llm";
}

export const defaultAISettings: AISettings = {
  openclaw: {
    agentUrl: getOpenClawAgentUrl(),
    apiKey: "",
    enabled: true,
    systemPrompt: "",
    timeout: "30",
  },
  llm: {
    baseUrl: "",
    apiToken: "",
    model: "gpt-4o",
    temperature: "0.7",
    maxTokens: "2048",
    enabled: false,
  },
  priority: "openclaw",
};

/** 檢查 URL 是否為有效的絕對 URL（有 protocol） */
function isValidAbsoluteUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** 取得有效的 OpenClaw Agent URL */
function getOpenClawAgentUrl(): string {
  const envUrl = import.meta.env.VITE_OPENCLAW_AGENT_URL;
  // 只有當環境變數是有效的絕對 URL 時才使用
  if (isValidAbsoluteUrl(envUrl)) return envUrl;
  // 否則使用 hardcoded 預設值
  return "https://openclaw.neovega.cc:18789";
}

export function loadAISettings(): AISettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const storedUrl = parsed.openclaw?.agentUrl?.trim() || "";
      // 智慧合併：只有當 localStorage 的 agentUrl 是有效的絕對 URL 時才使用
      // 否則使用預設值（環境變數或 hardcoded）
      const finalUrl = isValidAbsoluteUrl(storedUrl) ? storedUrl : defaultAISettings.openclaw.agentUrl;
      return {
        ...defaultAISettings,
        ...parsed,
        openclaw: {
          ...defaultAISettings.openclaw,
          ...parsed.openclaw,
          agentUrl: finalUrl,
        },
      };
    }
  } catch { /* ignore */ }
  return { ...defaultAISettings };
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAISettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns which AI source is currently configured and available */
export function getActiveAISource(settings: AISettings): "openclaw" | "llm" | null {
  const primary = settings.priority;
  const secondary = primary === "openclaw" ? "llm" : "openclaw";

  if (primary === "openclaw" && settings.openclaw.enabled && settings.openclaw.agentUrl.trim()) return "openclaw";
  if (primary === "llm" && settings.llm.enabled && settings.llm.baseUrl.trim() && settings.llm.apiToken.trim()) return "llm";

  // Fallback
  if (secondary === "openclaw" && settings.openclaw.enabled && settings.openclaw.agentUrl.trim()) return "openclaw";
  if (secondary === "llm" && settings.llm.enabled && settings.llm.baseUrl.trim() && settings.llm.apiToken.trim()) return "llm";

  return null;
}
