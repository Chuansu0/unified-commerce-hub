import { config } from "./config";

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

export async function callOpenClaw(req: OpenClawRequest): Promise<OpenClawResponse> {
  const url = config.openclaw.agentUrl;
  if (!url) throw new Error("OPENCLAW_AGENT_URL not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`OpenClaw error: ${res.status}`);
  return res.json();
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
