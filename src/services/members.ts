/**
 * 會員服務 - 使用 PocketBase SDK
 */
import pb, { escapeFilterValue } from './pocketbase';
import type { ApiOrder } from './orders';
import { fetchOrders } from './orders';

// ── 型別 ────────────────────────────────────────────────────────
export interface Member {
    id: string;
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
        id: string;
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

export async function fetchMembers(
    params: { page?: number; limit?: number; q?: string }
): Promise<MemberListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const filters: string[] = [];
    if (params.q?.trim()) {
        const safe = escapeFilterValue(params.q.trim());
        filters.push(`(username ~ "${safe}" || email ~ "${safe}")`);
    }

    const result = await pb.collection('users').getList(page, limit, {
        filter: filters.join(' && '),
        sort: '-created',
    });

    const data: Member[] = result.items.map(user => ({
        id: user.id,
        username: (user as Record<string, unknown>).username as string || '',
        email: (user as Record<string, unknown>).email as string || '',
        role: ((user as Record<string, unknown>).role as string) || 'user',
        is_active: ((user as Record<string, unknown>).is_active as boolean) ?? true,
        created_at: user.created,
        order_count: 0,
        total_spent: 0,
        pending_orders: 0,
    }));

    return {
        success: true,
        data,
        pagination: {
            total: result.totalItems,
            page: result.page,
            limit: result.perPage,
            total_pages: result.totalPages,
        },
    };
}

export async function fetchMemberDetail(
    id: string
): Promise<MemberDetail> {
    const user = await pb.collection('users').getOne(id);
    const ordersResponse = await fetchOrders({ user_id: id });

    return {
        user: {
            id: user.id,
            username: (user as Record<string, unknown>).username as string || '',
            email: (user as Record<string, unknown>).email as string || '',
            role: ((user as Record<string, unknown>).role as string) || 'user',
            is_active: ((user as Record<string, unknown>).is_active as boolean) ?? true,
            created_at: user.created,
            updated_at: user.updated,
        },
        orders: ordersResponse.data,
    };
}

export async function searchOrders(
    q: string
): Promise<ApiOrder[]> {
    const safe = escapeFilterValue(q);
    const result = await pb.collection('orders').getList(1, 50, {
        filter: `(order_no ~ "${safe}" || note ~ "${safe}")`,
        sort: '-created',
        expand: 'user',
    });

    return result.items.map(item => {
        const r = item as Record<string, unknown>;
        const userExpand = (r.expand as Record<string, unknown>)?.user as Record<string, unknown> | undefined;
        return {
            id: item.id,
            order_no: r.order_no as string,
            user: r.user as string,
            username: userExpand?.username as string | undefined,
            items: (r.items as ApiOrder['items']) || [],
            total: r.total as number,
            status: r.status as ApiOrder['status'],
            payment_method: r.payment_method as string | undefined,
            shipping_address: r.shipping_address as ApiOrder['shipping_address'],
            note: r.note as string | undefined,
            created: item.created,
            updated: item.updated,
        };
    });
}