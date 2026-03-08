import { config } from "./config";

// Generic InsForge HTTP client for the main database.

async function insforgeRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = config.insforge.baseUrl;
  const apiKey = config.insforge.apiKey;
  if (!baseUrl) throw new Error("INSFORGE_BASE_URL not configured");

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`InsForge ${path}: ${res.status}`);
  return res.json();
}

// ─── Users ────────────────────────────────────────────────────────
export const insforgeUsers = {
  list: () => insforgeRequest<unknown[]>("/users"),
  get: (id: string) => insforgeRequest<unknown>(`/users/${id}`),
};

// ─── Products ─────────────────────────────────────────────────────
export const insforgeProducts = {
  list: () => insforgeRequest<unknown[]>("/products"),
  get: (id: string) => insforgeRequest<unknown>(`/products/${id}`),
};

// ─── Orders ───────────────────────────────────────────────────────
export const insforgeOrders = {
  list: () => insforgeRequest<unknown[]>("/orders"),
  get: (id: string) => insforgeRequest<unknown>(`/orders/${id}`),
  create: (data: unknown) =>
    insforgeRequest<unknown>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Conversations ────────────────────────────────────────────────
export const insforgeConversations = {
  list: () => insforgeRequest<unknown[]>("/conversations"),
  get: (id: string) => insforgeRequest<unknown>(`/conversations/${id}`),
};

// ─── Analytics ────────────────────────────────────────────────────
export const insforgeAnalytics = {
  track: (event: Record<string, unknown>) =>
    insforgeRequest<unknown>("/analytics", {
      method: "POST",
      body: JSON.stringify(event),
    }),
};
