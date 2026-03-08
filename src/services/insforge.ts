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

const MOCK_PRODUCTS = [
  { id: "prod-001", name: "經典白T恤", category: "上衣", price: 590, currency: "TWD", stock: 120, status: "active", image_url: "/placeholder.svg", created_at: "2026-02-10T08:00:00Z" },
  { id: "prod-002", name: "修身牛仔褲", category: "下身", price: 1480, currency: "TWD", stock: 45, status: "active", image_url: "/placeholder.svg", created_at: "2026-02-12T10:00:00Z" },
  { id: "prod-003", name: "防風機能外套", category: "外套", price: 2980, currency: "TWD", stock: 0, status: "out_of_stock", image_url: "/placeholder.svg", created_at: "2026-01-20T14:00:00Z" },
  { id: "prod-004", name: "棉質休閒短褲", category: "下身", price: 780, currency: "TWD", stock: 88, status: "active", image_url: "/placeholder.svg", created_at: "2026-02-28T09:30:00Z" },
  { id: "prod-005", name: "印花帆布包", category: "配件", price: 450, currency: "TWD", stock: 200, status: "active", image_url: "/placeholder.svg", created_at: "2026-03-01T11:00:00Z" },
  { id: "prod-006", name: "羊毛針織衫", category: "上衣", price: 1890, currency: "TWD", stock: 15, status: "low_stock", image_url: "/placeholder.svg", created_at: "2026-01-15T16:00:00Z" },
  { id: "prod-007", name: "皮革短靴", category: "鞋類", price: 3200, currency: "TWD", stock: 30, status: "active", image_url: "/placeholder.svg", created_at: "2026-02-05T13:00:00Z" },
  { id: "prod-008", name: "格紋圍巾", category: "配件", price: 680, currency: "TWD", stock: 0, status: "draft", image_url: "/placeholder.svg", created_at: "2026-03-06T10:00:00Z" },
];

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
