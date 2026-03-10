/**
 * 訂單服務 - 使用 PocketBase SDK
 */
import pb, { OrderRecord, OrderItem } from './pocketbase';
import { getCurrentUser } from './pocketbase';

// ── 型別定義 ────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface ApiOrderItem {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
}

export interface ApiOrder {
    id: string;
    order_no: string;
    user: string;
    username?: string;
    items: ApiOrderItem[];
    total: number;
    status: OrderStatus;
    payment_method?: string;
    shipping_address?: {
        recipient_name: string;
        phone: string;
        address: string;
        city?: string;
        postal_code?: string;
    };
    note?: string;
    created: string;
    updated: string;
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
    items: ApiOrderItem[];
    payment_method?: string;
    shipping_address?: {
        recipient_name: string;
        phone: string;
        address: string;
        city?: string;
        postal_code?: string;
    };
    note?: string;
}

export interface OrdersQueryParams {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    user_id?: string;
}

// ── 輔助函式 ────────────────────────────────────────────────────

function recordToApiOrder(record: Record<string, unknown>): ApiOrder {
    const r = record as unknown as OrderRecord;
    // 將 OrderItem 轉換為 ApiOrderItem
    const items: ApiOrderItem[] = (r.items || []).map((item) => ({
        product_id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
    }));
    return {
        id: r.id,
        order_no: r.order_no,
        user: r.user,
        items,
        total: r.total,
        status: r.status as OrderStatus,
        payment_method: r.payment_method,
        shipping_address: r.shipping_address as ApiOrder['shipping_address'],
        note: r.note,
        created: r.created,
        updated: r.updated,
    };
}

/**
 * 產生訂單編號
 */
function generateOrderNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NV${dateStr}${random}`;
}

// ── API 函式 ────────────────────────────────────────────────────

/**
 * 取得訂單列表（需登入）
 * - superadmin：可查所有訂單
 * - 一般用戶：只能查自己的訂單
 */
export async function fetchOrders(
    params: OrdersQueryParams = {},
    _authHeader?: Record<string, string>
): Promise<OrderListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    // 建立過濾條件
    const filters: string[] = [];

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.role !== 'superadmin') {
        // 一般用戶只能查自己的訂單
        filters.push(`user = "${currentUser.id}"`);
    } else if (params.user_id) {
        // superadmin 可以篩選特定用戶
        filters.push(`user = "${params.user_id}"`);
    }

    if (params.status) {
        filters.push(`status = "${params.status}"`);
    }

    const filter = filters.join(' && ');

    try {
        const result = await pb.collection('orders').getList(page, limit, {
            filter,
            sort: '-created',
            expand: 'user',
        });

        return {
            success: true,
            data: result.items.map((item) => {
                const order = recordToApiOrder(item);
                // 從 expand 取得 username
                const expanded = item as Record<string, unknown>;
                if (expanded.expand && (expanded.expand as Record<string, unknown>).user) {
                    const userExpand = (expanded.expand as Record<string, unknown>).user as Record<string, unknown>;
                    order.username = userExpand.username as string;
                }
                return order;
            }),
            pagination: {
                total: result.totalItems,
                page: result.page,
                limit: result.perPage,
                total_pages: result.totalPages,
            },
        };
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '取得訂單失敗');
    }
}

/**
 * 取得單一訂單詳情（需登入）
 */
export async function fetchOrder(
    id: string,
    _authHeader?: Record<string, string>
): Promise<ApiOrder> {
    try {
        const record = await pb.collection('orders').getOne(id, {
            expand: 'user',
        });
        const order = recordToApiOrder(record);

        // 從 expand 取得 username
        const expanded = record as Record<string, unknown>;
        if (expanded.expand && (expanded.expand as Record<string, unknown>).user) {
            const userExpand = (expanded.expand as Record<string, unknown>).user as Record<string, unknown>;
            order.username = userExpand.username as string;
        }

        return order;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '訂單不存在');
    }
}

/**
 * 建立新訂單（需登入）
 */
export async function createOrder(
    payload: CreateOrderPayload,
    _authHeader?: Record<string, string>
): Promise<ApiOrder> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('請先登入');
    }

    // 計算總金額
    const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
        const record = await pb.collection('orders').create({
            order_no: generateOrderNo(),
            user: currentUser.id,
            items: payload.items.map(item => ({
                product_id: item.product_id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
            })) as OrderItem[],
            total,
            status: 'pending',
            payment_method: payload.payment_method || 'cash',
            shipping_address: payload.shipping_address,
            note: payload.note,
        });
        return recordToApiOrder(record);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '建立訂單失敗');
    }
}

/**
 * 更新訂單狀態（需 superadmin 權限）
 */
export async function updateOrderStatus(
    id: string,
    status: OrderStatus,
    _authHeader?: Record<string, string>
): Promise<ApiOrder> {
    try {
        const record = await pb.collection('orders').update(id, { status });
        return recordToApiOrder(record);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : '更新訂單狀態失敗');
    }
}