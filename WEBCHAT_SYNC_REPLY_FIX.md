# WebChat 同步回覆問題修復

## 問題現象
- WebChat 發送訊息後，收到 `{success: false, message: 'No message content'}` 錯誤
- n8n workflows 正常執行（訊息有轉發到 Telegram）
- 但 WebChat 沒有收到 Umio 的實際回覆內容

## 根本原因
**架構不匹配**：

### 當前流程（非同步）
1. WebChat 發送訊息 → n8n Webhook
2. n8n 立即回應：`{success: true, message: 'Message forwarded to Umio'}`
3. n8n 轉發訊息到 Telegram 群組
4. Umio 在 Telegram 中看到訊息並回覆
5. Umio 回覆透過另一個 workflow 存入 PocketBase

### 前端期望（同步）
- WebChat 發送訊息後，**立即收到 Umio 的回覆內容**
- 目前 n8n 回傳的是固定訊息 `'Message forwarded to Umio'`，不是真正的回覆

## 解決方案

### 方案 1：修改 n8n Workflow 等待回覆（推薦）
修改 **WebChat Umio Simple V3** workflow，讓它：
1. 發送訊息到 Telegram
2. **等待一段時間**（如 3-5 秒）
3. **查詢 PocketBase** 是否有 Umio 的回覆
4. 回傳實際的回覆內容給 WebChat

**優點**：
- WebChat 立即收到回覆
- 使用者體驗好

**缺點**：
- 需要等待時間，可能不穩定
- 如果 Umio 回覆較慢，會超時

---

### 方案 2：前端改用非同步訂閱（更可靠）
修改前端 `useUmioChat`，發送訊息後：
1. 不等待 n8n 回傳回覆
2. 改為 **訂閱 PocketBase Realtime**
3. 當 Umio 回覆存入 PocketBase 時，自動顯示在對話框

**優點**：
- 更可靠，不怕超時
- 符合現有架構

**缺點**：
- 需要修改前端邏輯
- 使用者會看到「訊息已發送」，然後等待回覆出現

---

### 方案 3：建立同步 API 中介層
建立一個新的服務（如 webhook-bridge），：
1. 接收 WebChat 訊息
2. 發送到 Telegram
3. **等待** Umio 回覆 webhook
4. 回傳完整對話給 WebChat

**優點**：
- 真正的同步體驗

**缺點**：
- 需要額外開發
- 複雜度較高

## 建議

**推薦方案 2（前端非同步訂閱）**，因為：
1. 符合現有架構設計
2. 最穩定可靠
3. 不需要等待 Umio 的回覆時間

但如果希望簡單快速解決，可以先嘗試 **方案 1** 的簡化版。

---

## 方案 1 快速實作

修改 n8n workflow，加入延遲和查詢：

### 新增節點

**1. Wait 節點**（在 Send to Telegram 之後）
- 等待 5 秒

**2. Query Reply 節點**（等待之後）
- 查詢 PocketBase messages collection
- Filter: `conversation = "{{ $json.body.sessionId }}" && sender = "assistant"`
- Sort: `-created`（最新的排在前面）
- PerPage: 1

**3. Check Reply 節點**（條件判斷）
- 檢查是否有回覆

**4. Respond with Reply 節點**
- 回傳實際的回覆內容

### 替代簡化方案
如果 n8n 查詢 PocketBase 有問題，可以：
1. 延遲 5 秒
2. 回傳固定訊息：「訊息已發送，請稍候回覆」
3. 前端改為輪詢或訂閱方式取得回覆

---

## 方案 2 前端修改

修改 `src/services/umioChat.ts` 中的 `sendToUmio` 函數：

```typescript
// 修改回應處理邏輯
if (!data.success) {
    // 如果 n8n 回傳成功但沒有回覆內容，視為已發送
    if (response.ok) {
        return {
            success: true,
            message: "訊息已發送，等待 Umio 回覆..."
        };
    }
    throw new Error(data.error || "Unknown error");
}
```

然後在 ChatWidget 中使用 `subscribeToUmioReplies` 來接收回覆。
