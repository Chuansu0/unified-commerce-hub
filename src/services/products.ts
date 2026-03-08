import { config } from "./config";

// ── 型別定義 ────────────────────────────────────────────────────
export interface ApiProduct {
    id: number;
    name: string;
    name_en?: string;
    description?: string;
    description_en?: string;
    price: number;
    original_price?: number;
    category: string;
    image_url?: string;
    stock: number;
    badges?: string[];
    features?: string[];
    is_active: boolean;
    created_at: string;
}

export interface ProductListResponse {
    success: boolean;
    data: ApiProduct[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

export interface ProductsQueryParams {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    active_only?: boolean;
}

export type CreateProductPayload = Omit<ApiProduct, "id" | "created_at" | "is_active"> & {
    is_active?: boolean;
};

function getBaseUrl(): string | undefined {
    return config.auth?.apiUrl;
}

/**
 * 取得商品列表（公開 API）
 */
export async function fetchProducts(
    params: ProductsQueryParams = {},
    authHeader?: Record<string, string>
): Promise<ProductListResponse> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.active_only === false) query.set("active_only", "false");

    const res = await fetch(`${baseUrl}/api/products?${query}`, {
        headers: { ...authHeader },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "取得商品失敗");
    return data;
}

/**
 * 取得單一商品詳情（公開 API）
 */
export async function fetchProduct(id: number | string): Promise<ApiProduct> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/products/${id}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "商品不存在");
    return data.data;
}

/**
 * 新增商品（需 superadmin）
 */
export async function createProduct(
    payload: CreateProductPayload,
    authHeader: Record<string, string>
): Promise<ApiProduct> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "新增商品失敗");
    return data.data;
}

/**
 * 更新商品（需 superadmin）
 */
export async function updateProduct(
    id: number | string,
    payload: Partial<CreateProductPayload>,
    authHeader: Record<string, string>
): Promise<ApiProduct> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "更新商品失敗");
    return data.data;
}

/**
 * 下架商品（需 superadmin，軟刪除）
 */
export async function deleteProduct(
    id: number | string,
    authHeader: Record<string, string>
): Promise<void> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("VITE_AUTH_API_URL 未設定");

    const res = await fetch(`${baseUrl}/api/products/${id}`, {
        method: "DELETE",
        headers: { ...authHeader },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "刪除商品失敗");
}
