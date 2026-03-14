# PocketBase 權限設定指南 - WebChat 訪客支援

## 問題說明

WebChat 訪客（未登入用戶）無法寫入 conversations 和 messages collections，導致 403 Forbidden 錯誤。

## 解決方案

需要完成以下設定：

1. **添加 `guest_session_id` 欄位到 conversations**
2. **添加 `umio` 到 platform 選項**
3. **調整 API 規則允許訪客寫入**

---

## 步驟 1: 更新 Conversations Collection

### 1.1 添加 guest_session_id 欄位

在 PocketBase Admin UI 中：

1. 進入 **Collections → conversations**
2. 點擊 **"New Field"**
3. 設定：
   - **Name**: `guest_session_id`
   - **Type**: `Plain text`
   - **Required**: No
   - **Unique**: No

### 1.2 更新 platform 選項

1. 找到 `platform` 欄位，點擊編輯
2. 在 Options 中添加 `umio`：
   ```
   telegram
   web
   line
   umio
   ```

---

## 步驟 2: 設定 API 規則

### 2.1 Conversations Collection API 規則

進入 **Collections → conversations → API Rules**：

| 操作 | 規則 | 說明 |
|------|------|------|
| **List** | `@request.auth.id != ""` | 只有登入用戶可查看列表 |
| **View** | `@request.auth.id != ""` 或 `guest_session_id != ""` | 登入用戶或訪客可看自己的對話 |
| **Create** | 空字串（留空） | **允許任何人建立** |
| **Update** | `user = @request.auth.id` 或 `guest_session_id != ""` | 只有擁有者可更新 |
| **Delete** | `user = @request.auth.id` | 只有登入用戶可刪除 |

**Create 規則設定為空字串**，表示允許未認證的訪客建立對話。

### 2.2 Messages Collection API 規則

進入 **Collections → messages → API Rules**：

| 操作 | 規則 | 說明 |
|------|------|------|
| **List** | `@request.auth.id != ""` | 只有登入用戶可查看列表 |
| **View** | `@request.auth.id != ""` | 只有登入用戶可查看 |
| **Create** | 空字串（留空） | **允許任何人發送訊息** |
| **Update** | `user = @request.auth.id` | 只有擁有者可更新 |
| **Delete** | `user = @request.auth.id` | 只有擁有者可刪除 |

---

## 步驟 3: 建立 Guest User（選項 A - 推薦）

如果希望更好的安全性，可以建立一個專門的 guest user：

### 3.1 建立 Guest 用戶

1. 進入 **Collections → users**
2. 點擊 **"New Record"**
3. 建立一個 guest 用戶：
   - Username: `guest`
   - Email: `guest@neovega.cc`
   - Password: `guest123456`（記下這個密碼）

### 3.2 在前端使用 Guest Token

修改 `src/services/umioChat.ts`：

```typescript
// 在檔案頂部添加
const GUEST_EMAIL = 'guest@neovega.cc';
const GUEST_PASSWORD = 'guest123456';
let guestToken: string | null = null;

// 取得 guest token
async function getGuestToken(): Promise<string | null> {
    if (guestToken) return guestToken;
    
    try {
        const authData = await pb.collection('users').authWithPassword(
            GUEST_EMAIL,
            GUEST_PASSWORD
        );
        guestToken = authData.token;
        return guestToken;
    } catch (error) {
        console.error('[UmioChat] Guest auth failed:', error);
        return null;
    }
}

// 在 sendToUmio 中使用
export async function sendToUmio(...) {
    // 先認證 guest
    await getGuestToken();
    
    // 然後執行原本的操作...
}
```

---

## 步驟 4: 純前端儲存（選項 B - 簡單）

如果不希望修改 PocketBase 權限，可以完全跳過 PocketBase 儲存：

### 4.1 修改 umioChat.ts

```typescript
// 在 saveUserMessage 和 saveAssistantMessage 中直接返回
async function saveUserMessage(...) {
    // 暫時跳過 PocketBase 儲存
    console.log('[UmioChat] Skipping PocketBase save (guest mode)');
    return;
}
```

對話只會存在於前端記憶體中，重新整理頁面後會消失。

---

## 驗證設定

設定完成後，測試 WebChat：

1. 開啟瀏覽器無痕模式（確保未登入）
2. 開啟 WebChat
3. 發送訊息
4. 檢查 Console - 應該沒有 403 錯誤

---

## 安全性考量

| 方案 | 優點 | 缺點 |
|------|------|------|
| **開放 Create 權限** | 簡單，完全支援訪客 | 任何人都可以建立對話 |
| **Guest User** | 有基本認證，可追蹤 | 需要額外設定 |
| **純前端儲存** | 最簡單 | 無持久化，重新整理即消失 |

建議：**先使用選項 A（Guest User）**，如果還是有問題再使用選項 B（純前端）。

---

## 相關文件

- `pocketbase/schema.json` - 完整資料結構
- `src/services/umioChat.ts` - Umio 聊天服務
- `src/hooks/useUmioChat.ts` - React Hook
