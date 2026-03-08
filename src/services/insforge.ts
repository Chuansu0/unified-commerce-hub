import { config } from "./config";

// ─── Mock Data ────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: "ord-a1b2c3d4", customer_name: "Alice Chen", customer_email: "alice@example.com", status: "delivered", total: 1250, currency: "TWD", created_at: "2026-03-05T10:30:00Z", items_count: 3, items: [
    { product_name: "經典白T恤", quantity: 1, unit_price: 590 },
    { product_name: "格紋圍巾", quantity: 1, unit_price: 680 },
  ]},
  { id: "ord-e5f6g7h8", customer_name: "Bob Wang", customer_email: "bob@example.com", status: "processing", total: 890, currency: "TWD", created_at: "2026-03-06T14:20:00Z", items_count: 2, items: [
    { product_name: "棉質休閒短褲", quantity: 1, unit_price: 780 },
    { product_name: "印花帆布包", quantity: 1, unit_price: 450 },
  ]},
  { id: "ord-i9j0k1l2", customer_name: "Carol Lin", customer_email: "carol@example.com", status: "pending", total: 2340, currency: "TWD", created_at: "2026-03-07T09:15:00Z", items_count: 5, items: [
    { product_name: "修身牛仔褲", quantity: 1, unit_price: 1480 },
    { product_name: "經典白T恤", quantity: 1, unit_price: 590 },
  ]},
  { id: "ord-m3n4o5p6", customer_name: "David Huang", customer_email: "david@example.com", status: "shipped", total: 560, currency: "TWD", created_at: "2026-03-04T16:45:00Z", items_count: 1, items: [
    { product_name: "印花帆布包", quantity: 1, unit_price: 450 },
  ]},
  { id: "ord-q7r8s9t0", customer_name: "Eva Wu", customer_email: "eva@example.com", status: "cancelled", total: 3100, currency: "TWD", created_at: "2026-03-03T11:00:00Z", items_count: 4, items: [
    { product_name: "防風機能外套", quantity: 1, unit_price: 2980 },
    { product_name: "格紋圍巾", quantity: 1, unit_price: 680 },
  ]},
  { id: "ord-u1v2w3x4", customer_name: "Frank Liu", customer_email: "frank@example.com", status: "delivered", total: 780, currency: "TWD", created_at: "2026-02-05T13:00:00Z", items_count: 2, items: [
    { product_name: "棉質休閒短褲", quantity: 1, unit_price: 780 },
  ]},
  { id: "ord-y5z6a7b8", customer_name: "Grace Tsai", customer_email: "grace@example.com", status: "processing", total: 4500, currency: "TWD", created_at: "2026-03-07T17:00:00Z", items_count: 6, items: [
    { product_name: "皮革短靴", quantity: 1, unit_price: 3200 },
    { product_name: "羊毛針織衫", quantity: 1, unit_price: 1890 },
  ]},
  { id: "ord-c9d0e1f2", customer_name: "Henry Chang", customer_email: "henry@example.com", status: "pending", total: 1680, currency: "TWD", created_at: "2026-03-08T07:45:00Z", items_count: 3, items: [
    { product_name: "經典白T恤", quantity: 2, unit_price: 590 },
    { product_name: "印花帆布包", quantity: 1, unit_price: 450 },
  ]},
];

// Products are now managed by the shared productStore — this mock is kept for API fallback only
const MOCK_PRODUCTS: unknown[] = [];

const MOCK_CONVERSATIONS = [
  { id: "conv-001", user_id: "user-alice", user_name: "Alice Chen", last_message: "請問這件外套還有貨嗎？", unread: 2, intent: "product_inquiry", updated_at: "2026-03-08T09:30:00Z" },
  { id: "conv-002", user_id: "user-bob", user_name: "Bob Wang", last_message: "我的訂單什麼時候會到？", unread: 0, intent: "order_tracking", updated_at: "2026-03-07T18:20:00Z" },
  { id: "conv-003", user_id: "user-carol", user_name: "Carol Lin", last_message: "可以退換嗎？尺寸不合", unread: 1, intent: "return_exchange", updated_at: "2026-03-08T08:15:00Z" },
  { id: "conv-004", user_id: "user-david", user_name: "David Huang", last_message: "有推薦搭配嗎？", unread: 0, intent: "recommendation", updated_at: "2026-03-06T14:00:00Z" },
  { id: "conv-005", user_id: "user-eva", user_name: "Eva Wu", last_message: "付款失敗怎麼辦", unread: 3, intent: "payment_issue", updated_at: "2026-03-08T10:45:00Z" },
];

const MOCK_DATA: Record<string, unknown> = {
  "/orders": MOCK_ORDERS,
  "/users": [],
  "/products": MOCK_PRODUCTS,
  "/conversations": MOCK_CONVERSATIONS,
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
