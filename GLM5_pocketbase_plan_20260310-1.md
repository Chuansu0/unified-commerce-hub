# GLM5 PocketBase 遷移修復計畫 (2026-03-10)

> **目標**：修復前次遷移的所有殘留問題（P0-P3），使專案可實際連接 PocketBase 運行  
> **前提**：不啟動 PocketBase 實例，僅修復代碼端問題，最後以 `npm run build` 驗證  
> **注意**：後端目前沒有 PocketBase admin token，但後端服務仍需遷移至 PocketBase SDK API（使用環境變數 `POCKETBASE_ADMIN_TOKEN` 預留 token 配置）

---

## 階段 1：統一 Schema 定義 (P0)

`pocketbase/schema.json` 和 `src/services/pocketbase.ts` 中的 TypeScript 型別定義存在嚴重不一致。**以 TypeScript 型別為準**修正 `schema.json`。

### 步驟 1.1：修改 `pocketbase/schema.json`

需要修改的集合：

#### users collection
**現有問題**：role values 為 `admin/manager/customer`，缺少 `is_active`、`telegram_*` 欄位

修改方式：
- `role` 的 `values` 改為 `["superadmin", "user"]`
- 新增以下欄位：
  ```json
  { "name": "is_active", "type": "bool", "required": false },
  { "name": "telegram_user_id", "type": "number", "required": false },
  { "name": "telegram_username", "type": "text", "required": false },
  { "name": "telegram_bound_at", "type": "date", "required": false }
  ```

#### products collection
**現有問題**：用 `status` (select) 而 TS 用 `is_active` (bool)；用 `image` (file) 而 TS 用 `image_url` (string)；缺 `description_en`、`badges`、`features`

修改方式：
- 移除 `status` select 欄位
- 新增 `{ "name": "is_active", "type": "bool", "required": false }`
- 移除 `image` 和 `images` file 欄位
- 新增 `{ "name": "image_url", "type": "url", "required": false }`
- 新增 `{ "name": "description_en", "type": "text", "required": false }`
- 將 `tags` 重命名為 `badges`（或刪除 `tags` 並新增 `badges`）
- 新增 `{ "name": "features", "type": "json", "required": false }`
- 保留 `sku`、`featured`、`attributes` 欄位（它們在 schema 裡有但 TS 沒有，不衝突）
- 更新 indexes：移除 `idx_products_status`，新增 `CREATE INDEX idx_products_is_active ON products (is_active)`

#### orders collection
**現有問題**：`notes` 應為 `note`

修改方式：
- 將 `notes` 欄位重命名為 `note`

#### conversations collection
**無需修改 schema**，但需更新 TS 型別（步驟 1.2）

#### messages collection
**現有問題**：schema 用 `sender`，TS 用 `role`；schema 無 `channel`

修改方式（以 schema 為主，因為 PB 會用 schema 建表）：
- 保留 `sender` 欄位名稱不變
- 新增 `{ "name": "channel", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["web", "telegram"] } }`
- 然後在步驟 1.2 中更新 TS 的 `MessageRecord` 使 `role` 改為 `sender`

#### 新增 telegram_bind_codes collection
**現有問題**：TS 有 `TelegramBindCodeRecord` 型別但 schema.json 缺少對應 collection

新增：
```json
{
    "name": "telegram_bind_codes",
    "type": "base",
    "schema": [
        {
            "name": "user",
            "type": "relation",
            "required": true,
            "options": {
                "collectionId": "users",
                "cascadeDelete": true,
                "minSelect": null,
                "maxSelect": 1
            }
        },
        { "name": "bind_code", "type": "text", "required": true },
        { "name": "expires_at", "type": "date", "required": true },
        { "name": "used", "type": "bool", "required": false },
        { "name": "created", "type": "autodate", "required": false },
        { "name": "updated", "type": "autodate", "required": false }
    ],
    "indexes": [
        "CREATE UNIQUE INDEX idx_bind_code ON telegram_bind_codes (bind_code)"
    ],
    "options": {}
}
```

### 步驟 1.2：修改 `src/services/pocketbase.ts`

更新 TypeScript interfaces 與修正後的 schema 對齊：

#### `ConversationRecord`
新增 schema.json 中有但 TS 缺少的欄位：
```typescript
export interface ConversationRecord {
    id: string;
    user: string;
    telegram_chat_id?: string;
    platform: 'telegram' | 'web' | 'line';
    status?: 'active' | 'resolved' | 'pending';
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
}
```

#### `MessageRecord`
將 `role` 改為 `sender`，新增 `intent` 和 `metadata`：
```typescript
export interface MessageRecord {
    id: string;
    conversation: string;
    channel?: 'web' | 'telegram';
    sender: 'user' | 'assistant' | 'system';
    content: string;
    intent?: string;
    metadata?: Record<string, unknown>;
    created: string;
    updated?: string;
}
```

#### `OrderRecord`
新增 `payment_status`：
```typescript
export interface OrderRecord {
    id: string;
    order_no: string;
    user: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_method?: string;
    payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
    shipping_address?: ShippingAddress;
    note?: string;
    created: string;
    updated: string;
}
```

#### 移除 `pocketbase.ts` 中的 `onChange` 監聽器（第 14-27 行）
因為 `authStore.ts:114` 已經有 `pb.authStore.onChange` 監聽器在做同樣的事。刪除 `pocketbase.ts` 中的這段：
```typescript
// 刪除這整段（第 13-27 行）
pb.authStore.onChange((token, model) => {
    // ...
});
```

#### 移除 `getAuthOptions()` 函式（第 153-160 行）
PocketBase SDK 自動處理 auth header，此函式不再需要。

---

## 階段 2：修復 Filter Injection (P0)

### 步驟 2.1：修改 `src/services/products.ts`

將第 82-94 行的 filter 建構邏輯從字串插值改為安全的方式。

**原始碼（不安全）**：
```typescript
if (params.category) {
    filters.push(`category = "${params.category}"`);
}
if (params.search) {
    filters.push(`(name ~ "${params.search}" || name_en ~ "${params.search}")`);
}
```

**改為**（使用 `encodeURIComponent` 跳脫或 PocketBase SDK filter helper）：

PocketBase JS SDK v0.26+ 不提供內建的 filter parameterization helper。因此需要自己跳脫雙引號：

```typescript
/** 跳脫 PocketBase filter 值中的特殊字元 */
function escapeFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
```

然後改用：
```typescript
if (params.category) {
    filters.push(`category = "${escapeFilterValue(params.category)}"`);
}
if (params.search) {
    const safe = escapeFilterValue(params.search);
    filters.push(`(name ~ "${safe}" || name_en ~ "${safe}")`);
}
```

將 `escapeFilterValue` 定義在 `src/services/pocketbase.ts` 最底部並 export，讓其他 service 可以共用。

### 步驟 2.2：修改 `src/services/orders.ts`

同樣修復第 122-137 行的 filter 建構：

```typescript
// 改用 escapeFilterValue
import pb, { OrderRecord, OrderItem, escapeFilterValue } from './pocketbase';
// ...
filters.push(`user = "${escapeFilterValue(currentUser.id)}"`);
// ...
filters.push(`status = "${escapeFilterValue(params.status)}"`);
```

---

## 階段 3：清理後端遺留檔案 (P1)

### 步驟 3.1：刪除以下檔案

以下檔案已不再被 `server.js` require，可安全刪除：

```
backend/db/index.js
backend/db/migrate.js
backend/db/migrate-telegram.js
backend/routes/auth.js
backend/routes/products.js
backend/routes/orders.js
backend/routes/users.js
```

刪除後也可移除空的 `backend/db/` 目錄。

### 步驟 3.2：改寫 `backend/middleware/auth.js`

此檔案目前使用 `jsonwebtoken` 驗證 JWT，但被 `chat.js` 和 `telegramBind.js` require。需改為使用 PocketBase SDK 驗證 token。

**改寫為**：
```javascript
/**
 * PocketBase Token 驗證中介層
 */
const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

/**
 * 驗證 PocketBase auth token
 * 從 Authorization: Bearer <token> 標頭解析
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "未提供認證 Token" });
    }

    const token = authHeader.slice(7);

    try {
        // 使用一個臨時的 PocketBase 實例來驗證 token
        const pb = new PocketBase(POCKETBASE_URL);
        pb.authStore.save(token, null);
        
        // 嘗試取得用戶資訊來驗證 token 有效性
        const user = await pb.collection('users').authRefresh();
        req.user = {
            id: user.record.id,
            username: user.record.username || '',
            role: user.record.role || 'user',
        };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "無效或已過期的 Token" });
    }
}

module.exports = { authenticate: authenticateToken, authenticateToken };
```

> **注意**：需在 `backend/package.json` 加入 `pocketbase` 依賴（步驟 5.2 處理）

### 步驟 3.3：改寫 `backend/services/conversationService.js`

從 PostgreSQL `pool.query()` 改為 PocketBase SDK：

```javascript
/**
 * 對話管理服務 — PocketBase 版
 */
const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN || '';

function getAdminPb() {
    const pb = new PocketBase(POCKETBASE_URL);
    if (ADMIN_TOKEN) {
        pb.authStore.save(ADMIN_TOKEN, null);
    }
    return pb;
}

async function getOrCreateConversation(userId) {
    const pb = getAdminPb();
    try {
        const result = await pb.collection('conversations').getFirstListItem(
            `user = "${userId}"`,
            { sort: '-created' }
        );
        return result.id;
    } catch (err) {
        // 不存在則建立
        const record = await pb.collection('conversations').create({
            user: userId,
            platform: 'web',
            status: 'active',
        });
        return record.id;
    }
}

async function saveMessage(conversationId, channel, sender, content) {
    const pb = getAdminPb();
    const record = await pb.collection('messages').create({
        conversation: conversationId,
        channel,
        sender,
        content,
    });

    // 更新 conversation 的 last_message_at
    await pb.collection('conversations').update(conversationId, {
        last_message_at: new Date().toISOString(),
        last_message: content.substring(0, 200),
    });

    return { id: record.id, created_at: record.created };
}

async function getConversationHistory(conversationId, limit = 50) {
    const pb = getAdminPb();
    const result = await pb.collection('messages').getList(1, limit, {
        filter: `conversation = "${conversationId}"`,
        sort: '-created',
    });
    // 反轉為時間正序
    return result.items.reverse().map(item => ({
        channel: item.channel,
        role: item.sender,
        content: item.content,
        created_at: item.created,
    }));
}

module.exports = {
    getOrCreateConversation,
    saveMessage,
    getConversationHistory,
};
```

### 步驟 3.4：改寫 `backend/services/telegramBindService.js`

從 PostgreSQL 改為 PocketBase SDK：

```javascript
/**
 * Telegram 帳號綁定服務 — PocketBase 版
 */
const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN || '';

function getAdminPb() {
    const pb = new PocketBase(POCKETBASE_URL);
    if (ADMIN_TOKEN) {
        pb.authStore.save(ADMIN_TOKEN, null);
    }
    return pb;
}

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BIND-";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function generateBindCode(userId) {
    const pb = getAdminPb();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pb.collection('telegram_bind_codes').create({
        user: userId,
        bind_code: code,
        expires_at: expiresAt,
        used: false,
    });

    return { code, expiresAt };
}

async function verifyAndBind(bindCode, telegramUserId, telegramUsername) {
    const pb = getAdminPb();
    try {
        const codeRecord = await pb.collection('telegram_bind_codes').getFirstListItem(
            `bind_code = "${bindCode}"`
        );

        if (codeRecord.used) {
            return { success: false, error: "綁定碼已使用" };
        }
        if (new Date() > new Date(codeRecord.expires_at)) {
            return { success: false, error: "綁定碼已過期" };
        }

        // 更新用戶 Telegram 資訊
        await pb.collection('users').update(codeRecord.user, {
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            telegram_bound_at: new Date().toISOString(),
        });

        // 標記綁定碼為已使用
        await pb.collection('telegram_bind_codes').update(codeRecord.id, {
            used: true,
        });

        return { success: true, userId: codeRecord.user };
    } catch (err) {
        if (err.status === 404) {
            return { success: false, error: "綁定碼不存在" };
        }
        console.error("[TelegramBind] 綁定失敗:", err);
        throw err;
    }
}

async function checkBindStatus(userId) {
    const pb = getAdminPb();
    try {
        const user = await pb.collection('users').getOne(userId);
        return {
            bound: !!user.telegram_user_id,
            telegramUsername: user.telegram_username,
            boundAt: user.telegram_bound_at,
        };
    } catch (err) {
        return { bound: false };
    }
}

async function findUserByTelegramId(telegramUserId) {
    const pb = getAdminPb();
    try {
        const user = await pb.collection('users').getFirstListItem(
            `telegram_user_id = ${telegramUserId}`
        );
        return { id: user.id, email: user.email, telegram_username: user.telegram_username };
    } catch (err) {
        return null;
    }
}

module.exports = {
    generateBindCode,
    verifyAndBind,
    checkBindStatus,
    findUserByTelegramId,
};
```

### 步驟 3.5：修改 `backend/routes/chat.js`

**第 6 行**：`const { authenticate } = require("../middleware/auth")` 但第 14 行使用 `authenticateToken`。

修正：
```javascript
const { authenticateToken } = require("../middleware/auth");
```

同時修正 `saveMessage` 的呼叫參數（原本第三個參數為 `"user"` / `"assistant"`，改用 `sender` 名稱對齊新 schema）。

> **注意**：`saveMessage(conversationId, "web", "user", message)` 的第三個參數 `"user"` 現在對應 messages collection 的 `sender` 欄位，邏輯相同只是底層欄位名改了，`conversationService.js` 改寫後的 `saveMessage` 函式已處理此映射，所以 chat.js 呼叫端不需改。

### 步驟 3.6：修改 `src/services/members.ts`

將舊的 `fetch()` + `VITE_AUTH_API_URL` 模式改為 PocketBase SDK：

```typescript
/**
 * 會員服務 - 使用 PocketBase SDK
 */
import pb from './pocketbase';
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
    params: { page?: number; limit?: number; q?: string },
): Promise<MemberListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const filters: string[] = [];
    if (params.q?.trim()) {
        const q = params.q.trim().replace(/"/g, '\\"');
        filters.push(`(username ~ "${q}" || email ~ "${q}")`);
    }

    const result = await pb.collection('users').getList(page, limit, {
        filter: filters.join(' && '),
        sort: '-created',
    });

    // 取得每個用戶的訂單統計（簡化版，如果用戶數量大可改用後端聚合）
    const data: Member[] = result.items.map(user => ({
        id: user.id,
        username: (user as Record<string, unknown>).username as string || '',
        email: (user as Record<string, unknown>).email as string || '',
        role: ((user as Record<string, unknown>).role as string) || 'user',
        is_active: ((user as Record<string, unknown>).is_active as boolean) ?? true,
        created_at: user.created,
        order_count: 0,  // 需後續從 members collection 或 orders 聚合
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
    id: string,
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
    q: string,
): Promise<ApiOrder[]> {
    const safe = q.replace(/"/g, '\\"');
    const result = await pb.collection('orders').getList(1, 50, {
        filter: `(order_no ~ "${safe}" || note ~ "${safe}")`,
        sort: '-created',
        expand: 'user',
    });

    return result.items.map(item => {
        const expanded = item as Record<string, unknown>;
        const userExpand = (expanded.expand as Record<string, unknown>)?.user as Record<string, unknown>;
        return {
            id: item.id,
            order_no: (item as Record<string, unknown>).order_no as string,
            user: (item as Record<string, unknown>).user as string,
            username: userExpand?.username as string,
            items: ((item as Record<string, unknown>).items as unknown[]) as ApiOrder['items'],
            total: (item as Record<string, unknown>).total as number,
            status: (item as Record<string, unknown>).status as ApiOrder['status'],
            payment_method: (item as Record<string, unknown>).payment_method as string,
            shipping_address: (item as Record<string, unknown>).shipping_address as ApiOrder['shipping_address'],
            note: (item as Record<string, unknown>).note as string,
            created: item.created,
            updated: item.updated,
        };
    });
}
```

同時移除 `members.ts` 中的 `authHeader` 參數（PocketBase SDK 自動帶 token）。

> **注意**：任何使用 `fetchMembers` / `fetchMemberDetail` / `searchOrders` 的前端頁面也需要移除傳入 `authHeader` 參數的地方。全域搜尋 `fetchMembers\(` / `fetchMemberDetail\(` / `searchOrders\(` 來找到呼叫端並更新。

---

## 階段 4：清理 insforge 殘留引用 (P2)

### 步驟 4.1：修改 `src/services/aiSettings.ts`

第 4 行：
```typescript
// 改前
const STORAGE_KEY = "insforge-ai-settings";
// 改後
const STORAGE_KEY = "neovega-ai-settings";
```

### 步驟 4.2：修改 `src/pages/SettingsPage.tsx`

第 423-427 行，「整合狀態」區塊中的服務列表：

```typescript
// 改前
{ name: "NeoVega", env: "INSFORGE_BASE_URL", desc: "主資料庫" },
// 改後
{ name: "PocketBase", env: "POCKETBASE_URL", desc: "主資料庫" },
```

---

## 階段 5：清理後端依賴 (P2)

### 步驟 5.1：修改 `backend/package.json`

**移除不再使用的依賴**：
- `pg`
- `bcryptjs`
- `jsonwebtoken`
- `joi`

**新增 PocketBase SDK**：
- `pocketbase` (^0.26.0)

**移除 scripts**：
- `"db:init": "node db/migrate.js"` → 刪除此行

修改後的 `dependencies`：
```json
{
    "axios": "^1.7.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.1",
    "pocketbase": "^0.26.8"
}
```

修改後的 `scripts`：
```json
{
    "start": "node server.js",
    "build": "cd .. && bun install && bun run build",
    "dev": "node --watch server.js"
}
```

### 步驟 5.2：執行 `npm install`

```bash
cd d:\WSL\unified-commerce-hub\backend && npm install
```

### 步驟 5.3：更新 `backend/.env.example`

加入 PocketBase 環境變數：
```env
# PocketBase
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_TOKEN=          # PocketBase admin API token（後端服務存取用）

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# OpenClaw
OPENCLAW_API_URL=
```

移除舊的 PostgreSQL / JWT 相關變數（`DATABASE_URL`、`JWT_SECRET`）。

---

## 階段 6：代碼品質改善 (P3)

### 步驟 6.1：清理 `src/services/auth.ts` 的 type casts

使用 PocketBase Record 型別取代 `Record<string, unknown>` 強制轉型。
可在各 service 中使用 `pocketbase.ts` 已定義的 interface 來取得有型別的 record。

具體做法：第 60-66 行、第 106-111 行改為：
```typescript
const authData = await pb.collection('users').authWithPassword(username, password);
const record = authData.record as unknown as UserRecord;
const user: AuthUser = {
    id: record.id,
    username: record.username || username,
    email: record.email || '',
    role: record.role || 'user',
};
```

其中 `UserRecord` 從 `./pocketbase` import。

### 步驟 6.2：清理 `src/store/authStore.ts` 的 type casts

第 88-92 行的 `syncFromPocketBase` 中同樣改用 `UserRecord`：
```typescript
import pb from "../services/pocketbase";
import type { UserRecord } from "../services/pocketbase";
// ...
const record = model as unknown as UserRecord;
const user: AuthUser = {
    id: record.id,
    username: record.username || '',
    email: record.email || '',
    role: record.role || 'user',
};
```

### 步驟 6.3：移除無用的 `_authHeader` 參數

以下函式簽名中有 `_authHeader?: Record<string, string>` 參數，因 PocketBase SDK 自動帶 token 已不需要：

| 檔案 | 函式 |
|------|------|
| `src/services/products.ts` | `createProduct()`, `updateProduct()`, `deleteProduct()` |
| `src/services/orders.ts` | `fetchOrders()`, `fetchOrder()`, `createOrder()`, `updateOrderStatus()` |

移除這些參數後，全域搜尋這些函式呼叫，確認沒有傳入 `authHeader` 的地方需要一起更新。

搜尋指令：
```bash
grep -rn "_authHeader\|authHeader" src/ --include="*.ts" --include="*.tsx"
```

### 步驟 6.4：修復 Superadmin 假 token 問題

`src/services/auth.ts` 第 52 行：
```typescript
token: `superadmin-${Date.now()}`,
```

此 token 不是有效的 PocketBase token，使用 superadmin 登入後呼叫 PocketBase API 時會失敗。改為在 localStorage 儲存特殊標記，並確保 authStore 知道這是 superadmin 模式，不嘗試用此 token 呼叫 PocketBase API：

```typescript
token: `superadmin::${Date.now()}`,  // 加入 :: 前綴以便區分
```

同時在 `pocketbase.ts` 的 `isAuthenticated()` 或需要呼叫 PocketBase API 的地方，新增檢查：

```typescript
export function isSuperadminMode(): boolean {
    const token = pb.authStore.token || localStorage.getItem('neovega_token') || '';
    return token.startsWith('superadmin::');
}
```

> **注意**：這是一個權宜做法。長期建議是讓 superadmin 也透過 PocketBase 認證。

---

## 階段 7：更新文件

### 步驟 7.1：更新 `pocketbase/README.md`

與修正後的 `schema.json` 同步更新欄位表格：
- users：更新 role values、加入 telegram 欄位
- products：`status` → `is_active`、`image` → `image_url`
- orders：`notes` → `note`
- 新增 `telegram_bind_codes` collection 說明
- 更新 API 規則建議

---

## 驗證 Checklist

完成所有修改後，執行以下驗證：

### 1. TypeScript 編譯
```bash
cd d:\WSL\unified-commerce-hub && npm run build
```
✅ 預期：無編譯錯誤

### 2. 既有測試
```bash
cd d:\WSL\unified-commerce-hub && npx vitest run
```
✅ 預期：所有測試通過

### 3. 後端 require 驗證
```bash
cd d:\WSL\unified-commerce-hub\backend && node -e "require('./server.js')" 2>&1 | head -5
```
✅ 預期：不出現 `MODULE_NOT_FOUND` 錯誤（可能會有網路相關警告但不應有 require 失敗）

### 4. 殘留引用檢查
```bash
cd d:\WSL\unified-commerce-hub && grep -rn "insforge" src/ --include="*.ts" --include="*.tsx"
cd d:\WSL\unified-commerce-hub && grep -rn "require.*db" backend/ --include="*.js" | grep -v node_modules
```
✅ 預期：無結果

---

## 修改摘要表

| 階段 | 優先級 | 涉及檔案 | 動作 |
|------|--------|---------|------|
| 1 | P0 | `pocketbase/schema.json` | 修改 |
| 1 | P0 | `src/services/pocketbase.ts` | 修改 |
| 2 | P0 | `src/services/products.ts` | 修改 |
| 2 | P0 | `src/services/orders.ts` | 修改 |
| 3 | P1 | `backend/db/*` (3 files) | **刪除** |
| 3 | P1 | `backend/routes/auth.js` | **刪除** |
| 3 | P1 | `backend/routes/products.js` | **刪除** |
| 3 | P1 | `backend/routes/orders.js` | **刪除** |
| 3 | P1 | `backend/routes/users.js` | **刪除** |
| 3 | P1 | `backend/middleware/auth.js` | 改寫 |
| 3 | P1 | `backend/services/conversationService.js` | 改寫 |
| 3 | P1 | `backend/services/telegramBindService.js` | 改寫 |
| 3 | P1 | `backend/routes/chat.js` | 修改 |
| 3 | P1 | `src/services/members.ts` | 改寫 |
| 4 | P2 | `src/services/aiSettings.ts` | 修改 |
| 4 | P2 | `src/pages/SettingsPage.tsx` | 修改 |
| 5 | P2 | `backend/package.json` | 修改 |
| 5 | P2 | `backend/.env.example` | 修改 |
| 6 | P3 | `src/services/auth.ts` | 修改 |
| 6 | P3 | `src/store/authStore.ts` | 修改 |
| 6 | P3 | `src/services/products.ts` | 修改 |
| 6 | P3 | `src/services/orders.ts` | 修改 |
| 7 | P3 | `pocketbase/README.md` | 修改 |
