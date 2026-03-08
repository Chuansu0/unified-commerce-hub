import { config } from "./config";

// ─── Mock Data ────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: "ord-a1b2c3d4", customer_name: "Alice Chen", customer_email: "alice@example.com", status: "delivered", total: 1250, currency: "TWD", created_at: "2026-03-05T10:30:00Z", items_count: 3 },
  { id: "ord-e5f6g7h8", customer_name: "Bob Wang", customer_email: "bob@example.com", status: "processing", total: 890, currency: "TWD", created_at: "2026-03-06T14:20:00Z", items_count: 2 },
  { id: "ord-i9j0k1l2", customer_name: "Carol Lin", customer_email: "carol@example.com", status: "pending", total: 2340, currency: "TWD", created_at: "2026-03-07T09:15:00Z", items_count: 5 },
  { id: "ord-m3n4o5p6", customer_name: "David Huang", customer_email: "david@example.com", status: "shipped", total: 560, currency: "TWD", created_at: "2026-03-04T16:45:00Z", items_count: 1 },
  { id: "ord-q7r8s9t0", customer_name: "Eva Wu", customer_email: "eva@example.com", status: "cancelled", total: 3100, currency: "TWD", created_at: "2026-03-03T11:00:00Z", items_count: 4 },
  { id: "ord-u1v2w3x4", customer_name: "Frank Liu", customer_email: "frank@example.com", status: "delivered", total: 780, currency: "TWD", created_at: "2026-03-02T08:30:00Z", items_count: 2 },
  { id: "ord-y5z6a7b8", customer_name: "Grace Tsai", customer_email: "grace@example.com", status: "processing", total: 4500, currency: "TWD", created_at: "2026-03-07T17:00:00Z", items_count: 6 },
  { id: "ord-c9d0e1f2", customer_name: "Henry Chang", customer_email: "henry@example.com", status: "pending", total: 1680, currency: "TWD", created_at: "2026-03-08T07:45:00Z", items_count: 3 },
];

const MOCK_DATA: Record<string, unknown> = {
  "/orders": MOCK_ORDERS,
  "/users": [],
  "/products": [],
  "/conversations": [],
};

function getMockData<T>(path: string): T {
  const key = Object.keys(MOCK_DATA).find((k) => path.startsWith(k));
  if (key) return MOCK_DATA[key] as T;
  return [] as T;
}

// Generic InsForge HTTP client for the main database.

async function insforgeRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = config.insforge.baseUrl;
  const apiKey = config.insforge.apiKey;
  if (!baseUrl) {
    console.warn("INSFORGE_BASE_URL not configured – using mock data");
    return getMockData<T>(path);
  }

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
