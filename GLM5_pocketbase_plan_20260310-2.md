# GLM5 PocketBase 遷移修復計畫 — 第二輪 (2026-03-10)

> **前提**：上一輪已完成 schema 統一、filter injection 修復、前端 orders/products 遷移、insforge storage key 修正、整個 backend/ 刪除。  
> **本輪目標**：修復因刪除 backend/ 和遺漏造成的所有殘留問題，使 `npm run build` 和 `npx vitest run` 都通過。

---

## 問題總覽

| # | 嚴重度 | 檔案 | 問題 |
|---|--------|------|------|
| 1 | 🔴 | `src/services/members.ts` | 完全未遷移，仍用 `fetch()` 呼叫已刪除的 Express `/api/users` |
| 2 | 🔴 | `src/services/telegram.ts` | 仍用 `fetch()` 呼叫已刪除的 `/api/telegram-bind/*` |
| 3 | 🔴 | `src/services/chat.ts` | 仍用 `fetch()` 呼叫已刪除的 `/api/chat/*` |
| 4 | 🔴 | `src/pages/MembersPage.tsx` | 呼叫 `fetchMembers(params, getAuthHeader())` 但遷移後應不帶 authHeader |
| 5 | 🟡 | `src/pages/SettingsPage.tsx:424` | 仍顯示 `INSFORGE_BASE_URL` |
| 6 | 🟡 | `src/pages/OrdersPage.tsx:40` | 解構了未使用的 `getAuthHeader` |
| 7 | 🟡 | `src/pages/DashboardPage.tsx:14,33` | 解構了未使用的 `getAuthHeader`，useEffect deps 包含它 |
| 8 | 🟡 | `src/pages/ConversationsPage.tsx:74` | 解構了未使用的 `getAuthHeader` |
| 9 | 🟡 | `package.json:7` | `"start": "node backend/server.js"` 指向已刪除的目錄 |
| 10 | 🟡 | `src/services/auth.ts:52` | superadmin token `superadmin-${Date.now()}` 未改為 `superadmin::` |
| 11 | 🟢 | `src/services/config.ts` | `auth.apiUrl` 仍讀 `VITE_AUTH_API_URL`（可保留向後相容，但建議清理） |
| 12 | 🟢 | `src/test/vite-react-common-bugs.test.ts` | TC04/TC05 仍測試舊的 `VITE_AUTH_API_URL` mock login 邏輯 |
| 13 | 🟢 | `src/pages/MembersPage.tsx:240,492,581` | 使用 `order.created_at` 但 `ApiOrder` 型別為 `created` |

---

## 階段 1：遷移 `members.ts` 至 PocketBase SDK

### 修改 `src/services/members.ts`

**完整替換**為使用 PocketBase SDK 的版本：

```typescript
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
```

**注意**：
- `fetchMembers` 不再要求 `authHeader` 參數
- `fetchMemberDetail` 的 `id` 型別從 `number` 改為 `string`（PocketBase ID 為字串）
- `searchOrders` 不再要求 `authHeader` 參數

---

## 階段 2：遷移 `telegram.ts` 至 PocketBase SDK

### 修改 `src/services/telegram.ts`

```typescript
/**
 * Telegram 綁定服務 - 使用 PocketBase SDK
 */
import pb from './pocketbase';

export interface BindCodeResponse {
    code: string;
    expiresAt: string;
}

export interface BindStatusResponse {
    bound: boolean;
    telegramUsername?: string;
    boundAt?: string;
}

export async function generateBindCode(_token: string): Promise<BindCodeResponse> {
    const user = pb.authStore.model;
    if (!user) throw new Error('請先登入');

    // 產生隨機綁定碼
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BIND-';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pb.collection('telegram_bind_codes').create({
        user: user.id,
        bind_code: code,
        expires_at: expiresAt,
        used: false,
    });

    return { code, expiresAt };
}

export async function checkBindStatus(_token: string): Promise<BindStatusResponse> {
    const user = pb.authStore.model;
    if (!user) return { bound: false };

    try {
        const record = await pb.collection('users').getOne(user.id);
        const r = record as Record<string, unknown>;
        return {
            bound: !!r.telegram_user_id,
            telegramUsername: r.telegram_username as string | undefined,
            boundAt: r.telegram_bound_at as string | undefined,
        };
    } catch {
        return { bound: false };
    }
}
```

> **注意**：保留 `_token` 參數避免修改呼叫端 (`SettingsPage.tsx`) 的簽名。

---

## 階段 3：遷移 `chat.ts` 至 PocketBase SDK

### 修改 `src/services/chat.ts`

```typescript
/**
 * Chat 服務 - 使用 PocketBase SDK
 */
import pb from './pocketbase';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    channel?: 'web' | 'telegram';
    created_at?: string;
}

export interface SendMessageResponse {
    response: string;
}

export interface ChatHistoryResponse {
    history: ChatMessage[];
}

export async function sendChatMessage(_token: string, message: string): Promise<SendMessageResponse> {
    const user = pb.authStore.model;
    if (!user) throw new Error('請先登入');

    // 取得或建立 conversation
    let conversationId: string;
    try {
        const existing = await pb.collection('conversations').getFirstListItem(
            `user = "${user.id}"`,
            { sort: '-created' }
        );
        conversationId = existing.id;
    } catch {
        const created = await pb.collection('conversations').create({
            user: user.id,
            platform: 'web',
            status: 'active',
        });
        conversationId = created.id;
    }

    // 儲存使用者訊息
    await pb.collection('messages').create({
        conversation: conversationId,
        channel: 'web',
        sender: 'user',
        content: message,
    });

    // 更新 conversation
    await pb.collection('conversations').update(conversationId, {
        last_message_at: new Date().toISOString(),
        last_message: message.substring(0, 200),
    });

    // 注意：AI 回覆需要由外部 AI 服務處理，這裡先回傳 placeholder
    // 實際應用中應透過 api.ts 的 callOpenClaw 或 callLLM 來取得回覆
    return { response: '' };
}

export async function getChatHistory(_token: string): Promise<ChatHistoryResponse> {
    const user = pb.authStore.model;
    if (!user) return { history: [] };

    try {
        const conversation = await pb.collection('conversations').getFirstListItem(
            `user = "${user.id}"`,
            { sort: '-created' }
        );
        const result = await pb.collection('messages').getList(1, 50, {
            filter: `conversation = "${conversation.id}"`,
            sort: '-created',
        });

        const history: ChatMessage[] = result.items.reverse().map(item => {
            const r = item as Record<string, unknown>;
            return {
                role: (r.sender as string) === 'user' ? 'user' : 'assistant',
                content: r.content as string,
                channel: r.channel as 'web' | 'telegram' | undefined,
                created_at: item.created,
            };
        });

        return { history };
    } catch {
        return { history: [] };
    }
}
```

---

## 階段 4：修改 `MembersPage.tsx`

### 4.1：移除 `getAuthHeader` 並更新函式呼叫

以下行需要修改：

**第 23 行**（import）：保留 `useAuthStore` 但不再解構 `getAuthHeader`
```tsx
// 僅確認不使用 getAuthHeader
```

**第 266 行**：
```tsx
// 改前
const { getAuthHeader } = useAuthStore();
// 改後（完全移除此行，或改為不解構任何東西）
// 如果 MembersPage 完全不需要 useAuthStore，可以移除 import
```

**第 294 行**：
```tsx
// 改前
const res = await fetchMembers({ q, page, limit: 20 }, getAuthHeader());
// 改後
const res = await fetchMembers({ q, page, limit: 20 });
```

**第 307 行**：
```tsx
// 改前
[getAuthHeader]
// 改後
[]
```

**第 316 行**：
```tsx
// 改前
const rows = await searchOrders(q, getAuthHeader());
// 改後
const rows = await searchOrders(q);
```

**第 324 行**：
```tsx
// 改前
[getAuthHeader]
// 改後
[]
```

**第 357 行**：
```tsx
// 改前
const detail = await fetchMemberDetail(member.id, getAuthHeader());
// 改後
const detail = await fetchMemberDetail(member.id);
```

### 4.2：修正 `created_at` → `created`

`MembersPage.tsx` 中有多處使用 `order.created_at`，但 `ApiOrder` 的時間欄位名為 `created`：

- **第 240 行**：`{formatDate(order.created_at)}` → `{formatDate(order.created)}`
- **第 492 行**：`{formatDate(m.created_at)}` → `{formatDate(m.created_at)}`（這個是 Member 型別，OK）
- **第 581 行**：`{formatDate(o.created_at)}` → `{formatDate(o.created)}`

> **注意**：`Member` 介面中的 `created_at` 是沒問題的（我們自己定義的）。但 `ApiOrder` 用的是 `created`，所以在引用 `ApiOrder` 的地方要用 `created` 而非 `created_at`。根據 MembersPage 的 `OrderCard` 元件（第 240 行 `order.created_at`），應改為 `order.created`。

但因為 `ApiOrder` 介面中使用的是 `created` 不是 `created_at`，而 `OrderCard` 收到的 `order` 型別為 `ApiOrder`。如果 TypeScript 編譯通過了，可能是因為 `ApiOrder` 也有 `created_at`? 需要確認。如果有 TS 報錯就修正，如果順利通過就可以跳過。

---

## 階段 5：清理頁面中未使用的 `getAuthHeader`

### 5.1：`src/pages/OrdersPage.tsx`

**第 40 行**：移除 `const { getAuthHeader } = useAuthStore();`
- 如果此頁面其他地方也不再使用 `useAuthStore`，同時移除 import

### 5.2：`src/pages/DashboardPage.tsx`

**第 14 行**：移除 `const { getAuthHeader } = useAuthStore();`
**第 33 行**：`}, [getAuthHeader]);` → `}, []);`

### 5.3：`src/pages/ConversationsPage.tsx`

**第 74 行**：移除 `const { getAuthHeader } = useAuthStore();`

---

## 階段 6：修改 `SettingsPage.tsx`

### 第 424 行

```tsx
// 改前
{ name: "NeoVega", env: "INSFORGE_BASE_URL", desc: "主資料庫" },
// 改後
{ name: "PocketBase", env: "POCKETBASE_URL", desc: "主資料庫" },
```

---

## 階段 7：修改 `package.json`

### 第 7 行

```json
// 改前
"start": "node backend/server.js",
// 改後
"start": "vite preview",
```

> `vite preview` 會啟動生產版本的靜態檔案伺服器，取代舊的 Express server。

---

## 階段 8：修改 `auth.ts`

### 第 52 行

```typescript
// 改前
token: `superadmin-${Date.now()}`,
// 改後
token: `superadmin::${Date.now()}`,
```

---

## 階段 9：更新測試

### 修改 `src/test/vite-react-common-bugs.test.ts`

需要根據實際測試檔案內容調整，可能涉及：
- TC04/TC05 測試 `VITE_AUTH_API_URL` 的行為需要改為測試 PocketBase 連線
- TC15/TC16 測試 `getAuthHeader()` 的行為可以保留（`authStore` 仍有此方法）

> **原則**：先跑 `npx vitest run`，如果這些測試失敗，再根據錯誤訊息修正。如果通過就不動。

---

## 驗證 Checklist

```bash
# 1. TypeScript 編譯
cd d:\WSL\unified-commerce-hub && npm run build

# 2. 測試
cd d:\WSL\unified-commerce-hub && npx vitest run

# 3. 殘留引用檢查
cd d:\WSL\unified-commerce-hub && grep -rn "INSFORGE\|insforge" src/ --include="*.ts" --include="*.tsx"
cd d:\WSL\unified-commerce-hub && grep -rn "VITE_AUTH_API_URL" src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v config.ts
cd d:\WSL\unified-commerce-hub && grep -rn "backend/" package.json
```

✅ 預期：全部無結果或只有 `config.ts` 的合理保留

---

## 修改摘要表

| 檔案 | 動作 |
|------|------|
| `src/services/members.ts` | **改寫**（PocketBase SDK） |
| `src/services/telegram.ts` | **改寫**（PocketBase SDK） |
| `src/services/chat.ts` | **改寫**（PocketBase SDK） |
| `src/pages/MembersPage.tsx` | 修改（移除 authHeader 參數 + created_at） |
| `src/pages/OrdersPage.tsx` | 修改（移除未用 getAuthHeader） |
| `src/pages/DashboardPage.tsx` | 修改（移除未用 getAuthHeader） |
| `src/pages/ConversationsPage.tsx` | 修改（移除未用 getAuthHeader） |
| `src/pages/SettingsPage.tsx` | 修改（INSFORGE → PocketBase） |
| `package.json` | 修改（start script） |
| `src/services/auth.ts` | 修改（superadmin token 前綴） |
| `src/test/*.test.ts` | 視 vitest 結果修改 |
