import { config } from "./config";
import type { AISettings } from "./aiSettings";

// ─── OpenClaw Agent ───────────────────────────────────────────────
export interface OpenClawRequest {
  userId: string;
  message: string;
  context?: Record<string, unknown>;
  historySummary?: string;
}

export interface OpenClawResponse {
  reply: string;
  intent: string;
  toolsToCall: string[];
  n8nWorkflowsToTrigger: string[];
  productSuggestions: unknown[];
  analyticsEvents: unknown[];
}

export async function callOpenClaw(req: OpenClawRequest, settings?: AISettings): Promise<OpenClawResponse> {
  let url = settings?.openclaw?.agentUrl || config.openclaw.agentUrl;
  if (!url) throw new Error("OpenClaw Agent URL 未設定，請至 Settings 頁面設定");

  // 如果是外部 OpenClaw URL，使用 nginx 代理避免 CORS
  if (url.includes("openclaw.neovega.cc") || url.includes("openclaw.zeabur.internal")) {
    url = "/api/openclaw/hooks/agent";
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = settings?.openclaw?.apiKey;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // OpenClaw webhook API 格式
  const body: Record<string, unknown> = {
    message: req.message,
    sessionKey: req.userId || "web-session", // 使用 userId 作為 sessionKey
    deliver: true, // 讓 Agent 處理並回覆
  };
  if (settings?.openclaw?.systemPrompt) {
    body.systemPrompt = settings.openclaw.systemPrompt;
  }

  const timeout = Number(settings?.openclaw?.timeout) || 30;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenClaw error: ${res.status}`);
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenClaw 連線逾時（${timeout}秒），請檢查 ${url} 是否可訪問`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Generic LLM (OpenAI-compatible) ─────────────────────────────
export interface LLMChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLLM(
  messages: LLMChatMessage[],
  settings: AISettings
): Promise<string> {
  const { baseUrl, apiToken, model, temperature, maxTokens } = settings.llm;
  if (!baseUrl) throw new Error("大模型 Base URL 未設定，請至 Settings 頁面設定");
  if (!apiToken) throw new Error("大模型 API Token 未設定，請至 Settings 頁面設定");

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages,
      temperature: Number(temperature) || 0.7,
      max_tokens: Number(maxTokens) || 2048,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM API error: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── n8n Chat Webhook ─────────────────────────────────────────────
export interface N8nChatRequest {
  userId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface N8nChatResponse {
  reply: string;
  actions: unknown[];
  intent: string;
  metadata: Record<string, unknown>;
}

export async function callN8nChat(req: N8nChatRequest): Promise<N8nChatResponse> {
  const url = config.n8n.chatWebhookUrl;
  if (!url) throw new Error("N8N_CHAT_WEBHOOK_URL not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`n8n chat error: ${res.status}`);
  return res.json();
}

// ─── n8n Order Webhook ────────────────────────────────────────────
export interface N8nOrderRequest {
  userId: string;
  cart: unknown[];
  paymentMethod: string;
  channel: string;
}

export interface N8nOrderResponse {
  orderId: string;
  status: string;
}

export async function callN8nOrder(req: N8nOrderRequest): Promise<N8nOrderResponse> {
  const url = config.n8n.orderWebhookUrl;
  if (!url) throw new Error("N8N_ORDER_WEBHOOK_URL not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`n8n order error: ${res.status}`);
  return res.json();
}
