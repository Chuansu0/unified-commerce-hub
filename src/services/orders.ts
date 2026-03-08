import { config } from "./config";

// ── 型別定義 ────────────────────────────────────────────────────
export interface OrderItem {
    product_id: string | number;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface ApiOrder {
    id: number;
    order_no: string;
    user_id: number | null;
    username?: string;
    items: OrderItem[];
    total: number;
    status: OrderStatus;
    payment_method: string;
    shipping_address?: {
        name: string;
        phone: string;
        address: string;
        city?: string;
        zip?: string;
    } | null;
    note?: string | null;
    created_at: string;
}

export interface OrderListResponse {
    success: boolean;
    data: ApiOrder[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

export interface CreateOrderPayload {
    items: OrderItem[];
    payment_method?: string;
    shipping_address?: {
        name: string;
        phone: string;
        address: string;
        city?: string;
        zip?: string;
    };
    note?: string;
}

export interface OrdersQueryParams {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    user_id?: string | number;
}

function getBaseUrl(): string | undefined {
    return config.auth?.apiUrl;
}

/**
 * 取得訂單列表（需登入）
 * - superadmin：可查所有訂單
 * - 一般用戶：只能查自己的訂單
 */
export async function fetchOrders(
    params: OrdersQueryParams = {},
    authHeader: Record<string, string>
): Promise<OrderListResponse> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.status) query.set("status", params.status);
    if (params.user_id) query.set("user_id", String(params.user_id));

    const res = await fetch(`${baseUrl}/api/orders?${query}`, {
        headers: { ...authHeader },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "取得訂單失敗");
    return data;
}

/**
 * 取得單一訂單詳情（需登入）
 */
export async function fetchOrder(
    id: number | string,
    authHeader: Record<string, string>
): Promise<ApiOrder> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/orders/${id}`, {
        headers: { ...authHeader },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "訂單不存在");
    return data.data;
}

/**
 * 建立新訂單（需登入）
 */
export async function createOrder(
    payload: CreateOrderPayload,
    authHeader: Record<string, string>
): Promise<ApiOrder> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "建立訂單失敗");
    return data.data;
}

/**
 * 更新訂單狀態（需 superadmin 權限）
 */
export async function updateOrderStatus(
    id: number | string,
    status: OrderStatus,
    authHeader: Record<string, string>
): Promise<ApiOrder> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "更新訂單狀態失敗");
    return data.data;
}
