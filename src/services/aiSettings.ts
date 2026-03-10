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
    agentUrl: import.meta.env.VITE_OPENCLAW_AGENT_URL || "https://openclaw.neovega.cc:18789",
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

export function loadAISettings(): AISettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 智慧合併：如果 localStorage 的 agentUrl 為空，使用環境變數
      return {
        ...defaultAISettings,
        ...parsed,
        openclaw: {
          ...defaultAISettings.openclaw,
          ...parsed.openclaw,
          // 如果 localStorage 沒有 agentUrl 或為空，使用環境變數
          agentUrl: parsed.openclaw?.agentUrl?.trim() || defaultAISettings.openclaw.agentUrl,
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
