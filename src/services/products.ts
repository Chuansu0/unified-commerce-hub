/**
 * 商品服務 - 使用 PocketBase SDK
 */
import pb, { ProductRecord, escapeFilterValue } from './pocketbase';

// ── 型別定義 ────────────────────────────────────────────────────
export interface ApiProduct {
    id: string;
    name: string;
    name_en?: string;
    description?: string;
    description_en?: string;
    price: number;
    original_price?: number;
    category: string;
    image_url?: string;
    stock: number;
    sku?: string;
    featured?: boolean;
    badges?: string[];
    features?: string[];
    attributes?: Record<string, unknown>;
    is_active: boolean;
    created: string;
    updated: string;
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

export type CreateProductPayload = Omit<ApiProduct, 'id' | 'created' | 'updated' | 'is_active'> & {
    is_active?: boolean;
};

// ── 輔助函式 ────────────────────────────────────────────────────

function recordToApiProduct(record: Record<string, unknown>): ApiProduct {
    const r = record as unknown as ProductRecord;
    return {
        id: r.id,
        name: r.name,
        name_en: r.name_en,
        description: r.description,
        description_en: r.description_en,
        price: r.price,
        original_price: r.original_price,
        category: r.category || '',
        image_url: r.image_url,
        stock: r.stock,
        sku: r.sku,
        featured: r.featured,
        badges: r.badges,
        features: r.features,
        attributes: r.attributes,
        is_active: r.is_active,
        created: r.created,
        updated: r.updated,
    };
}

// ── API 函式 ────────────────────────────────────────────────────

/**
 * 取得商品列表（公開 API）
 */
export async function fetchProducts(
    params: ProductsQueryParams = {}
): Promise<ProductListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    // 建立過濾條件（使用 escapeFilterValue 防止 injection）
    const filters: string[] = [];
    if (params.active_only !== false) {
        filters.push('is_active = true');
    }
    if (params.category) {
        filters.push(`category = "${escapeFilterValue(params.category)}"`);
    }
    if (params.search) {
        const safe = escapeFilterValue(params.search);
        filters.push(`(name ~ "${safe}" || name_en ~ "${safe}")`);
    }

    const filter = filters.join(' && ');

    try {
        const result = await pb.collection('products').getList(page, limit, {
            filter,
            sort: '-created',
        });

        return {
            success: true,
            data: result.items.map(recordToApiProduct),
            pagination: {
                total: result.totalItems,
                page: result.page,
                limit: result.perPage,
                total_pages: result.totalPages,
            },
        };
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '取得商品失敗');
    }
}

/**
 * 取得單一商品詳情（公開 API）
 */
export async function fetchProduct(id: string): Promise<ApiProduct> {
    try {
        const record = await pb.collection('products').getOne(id);
        return recordToApiProduct(record);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '商品不存在');
    }
}

/**
 * 新增商品（需 superadmin）
 */
export async function createProduct(
    payload: CreateProductPayload
): Promise<ApiProduct> {
    try {
        const record = await pb.collection('products').create({
            ...payload,
            is_active: payload.is_active ?? true,
        });
        return recordToApiProduct(record);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '新增商品失敗');
    }
}

/**
 * 更新商品（需 superadmin）
 */
export async function updateProduct(
    id: string,
    payload: Partial<CreateProductPayload>
): Promise<ApiProduct> {
    try {
        const record = await pb.collection('products').update(id, payload);
        return recordToApiProduct(record);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '更新商品失敗');
    }
}

/**
 * 下架商品（需 superadmin，軟刪除）
 */
export async function deleteProduct(
    id: string
): Promise<void> {
    try {
        // 軟刪除：設定 is_active = false
        await pb.collection('products').update(id, { is_active: false });
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '刪除商品失敗');
    }
}