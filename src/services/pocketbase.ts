/**
 * PocketBase SDK 初始化模組
 * 作為統一的資料庫 + 認證 + API 後端
 */
import PocketBase from 'pocketbase';

// 從環境變數取得 PocketBase URL，預設為 '/pb'（相對路徑，用於反向代理）
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || '/pb';

// 建立 PocketBase 實例
const pb = new PocketBase(POCKETBASE_URL);

// 自動更新 authStore 狀態到 localStorage（與 Zustand 同步）
pb.authStore.onChange((token, model) => {
    if (token && model) {
        localStorage.setItem('neovega_token', token);
        localStorage.setItem('neovega_user', JSON.stringify({
            id: model.id,
            username: (model as Record<string, unknown>).username || (model as Record<string, unknown>).email || '',
            email: (model as Record<string, unknown>).email || '',
            role: (model as Record<string, unknown>).role || 'user',
        }));
    } else {
        localStorage.removeItem('neovega_token');
        localStorage.removeItem('neovega_user');
    }
});

export default pb;

// ─── 型別定義 ────────────────────────────────────────────────────

export interface UserRecord {
    id: string;
    username: string;
    email: string;
    role: 'superadmin' | 'user';
    is_active: boolean;
    telegram_user_id?: number;
    telegram_username?: string;
    telegram_bound_at?: string;
    created: string;
    updated: string;
}

export interface ProductRecord {
    id: string;
    name: string;
    name_en?: string;
    description?: string;
    description_en?: string;
    price: number;
    original_price?: number;
    category?: string;
    image_url?: string;
    stock: number;
    badges?: string[];
    features?: string[];
    is_active: boolean;
    created: string;
    updated: string;
}

export interface OrderRecord {
    id: string;
    order_no: string;
    user: string;  // Relation to users
    items: OrderItem[];
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_method?: string;
    shipping_address?: ShippingAddress;
    note?: string;
    created: string;
    updated: string;
}

export interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
}

export interface ShippingAddress {
    recipient_name: string;
    phone: string;
    address: string;
    city?: string;
    postal_code?: string;
}

export interface ConversationRecord {
    id: string;
    user: string;  // Relation to users
    last_message_at: string;
    created: string;
    updated: string;
}

export interface MessageRecord {
    id: string;
    conversation: string;  // Relation to conversations
    channel: 'web' | 'telegram';
    role: 'user' | 'assistant';
    content: string;
    created: string;
    updated: string;
}

export interface TelegramBindCodeRecord {
    id: string;
    user: string;  // Relation to users
    bind_code: string;
    expires_at: string;
    used: boolean;
    created: string;
    updated: string;
}

// ─── API 輔助函式 ────────────────────────────────────────────────

/**
 * 檢查是否已認證
 */
export function isAuthenticated(): boolean {
    return pb.authStore.isValid;
}

/**
 * 取得當前用戶
 */
export function getCurrentUser(): UserRecord | null {
    return pb.authStore.model as unknown as UserRecord | null;
}

/**
 * 取得 Auth Token
 */
export function getAuthToken(): string | null {
    return pb.authStore.token;
}

/**
 * 登出
 */
export function logout(): void {
    pb.authStore.clear();
}

/**
 * 取得帶認證的請求選項
 */
export function getAuthOptions(): Record<string, unknown> {
    return {
        headers: {
            Authorization: pb.authStore.token || '',
        },
    };
}