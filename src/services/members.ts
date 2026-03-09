import type { ApiOrder } from "./orders";
import { config } from "./config";

/** 自動補上 https:// 協定（與 auth.ts 同邏輯） */
function getBaseUrl(): string | undefined {
    const raw = config.auth?.apiUrl;
    if (!raw) return undefined;
    if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
    return raw;
}

// ── 型別 ────────────────────────────────────────────────────────
export interface Member {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    order_count: number;
    total_spent: number;
    pending_orders: number;
}

export interface MemberDetail {
    user: {
        id: number;
        username: string;
        email: string;
        role: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
    };
    orders: ApiOrder[];
}

export interface MemberListResponse {
    success: boolean;
    data: Member[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

// ── API 呼叫 ─────────────────────────────────────────────────────

/**
 * 取得會員列表（superadmin 專用）
 * @param params.q  搜尋 username / email
 */
export async function fetchMembers(
    params: { page?: number; limit?: number; q?: string },
    authHeader: Record<string, string>
): Promise<MemberListResponse> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.q?.trim()) query.set("q", params.q.trim());

    const res = await fetch(`${baseUrl}/api/users?${query}`, { headers: authHeader });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "取得會員列表失敗");
    return data;
}

/**
 * 取得單一會員詳情 + 訂單歷史（superadmin 專用）
 */
export async function fetchMemberDetail(
    id: number,
    authHeader: Record<string, string>
): Promise<MemberDetail> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/users/${id}`, { headers: authHeader });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "取得會員資料失敗");
    return data.data as MemberDetail;
}

/**
 * 跨欄位搜尋訂單（superadmin 專用）
 * 可依 order_no、username、email、商品名稱 搜尋
 */
export async function searchOrders(
    q: string,
    authHeader: Record<string, string>
): Promise<ApiOrder[]> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(
        `${baseUrl}/api/users/search/orders?q=${encodeURIComponent(q)}`,
        { headers: authHeader }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "搜尋失敗");
    return data.data as ApiOrder[];
}
