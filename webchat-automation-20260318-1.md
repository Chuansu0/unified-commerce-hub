# Webchat 自動化批次通知計畫

## 日期
2026-03-18

## 需求概述

將 webchat 對話改為批次處理模式：
- 收到對話時只存入資料庫，不立即發送到 Telegram
- 每 5 分鐘檢查一次資料庫中的新對話
- 將新對話打包成一個訊息發送到 Telegram 群組
- 訊息開頭自動 mention 所有 bot：`@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot`
- 如果沒有新訊息則不發送

## 當前架構分析

### 現有流程
```
用戶 → ChatWidget → umioChat.ts → n8n webhook → PocketBase
                                  ↓
                            (立即發送到 Telegram)
```

### 目標流程
```
用戶 → ChatWidget → umioChat.ts → PocketBase (僅儲存)
                                      ↓
                            定時任務 (每5分鐘)
                                      ↓
                            查詢新訊息 → 打包 → Telegram 群組
```

## 技術方案

### 方案 A：n8n Cron Workflow（推薦）

**優點：**
- ✅ 無需額外服務
- ✅ 視覺化配置
- ✅ 易於調整時間間隔
- ✅ 內建錯誤處理

**缺點：**
- ⚠️ 依賴 n8n 服務

**實施複雜度：** ⭐⭐ (簡單)

### 方案 B：獨立 Node.js 定時服務

**優點：**
- ✅ 獨立運行
- ✅ 完全控制

**缺點：**
- ❌ 需要額外部署
- ❌ 需要維護額外服務

**實施複雜度：** ⭐⭐⭐⭐ (複雜)

### 方案 C：Zeabur Cron Job

**優點：**
- ✅ 雲端原生
- ✅ 自動擴展

**缺點：**
- ❌ 需要 Zeabur Pro 方案
- ❌ 配置較複雜

**實施複雜度：** ⭐⭐⭐ (中等)

## 推薦方案：方案 A (n8n Cron Workflow)

### 實施步驟

#### 階段 1：修改現有 Webhook（移除即時發送）

**目標：** 讓 webchat 只儲存到 PocketBase，不發送到 Telegram

**修改檔案：** `n8n/webchat-umio-simple.json`

**變更：**
- 保留：接收 webhook → 回應成功
- 移除：發送到 Telegram 的節點

#### 階段 2：建立定時批次處理 Workflow

**Workflow 名稱：** `Webchat Batch Notification`

**觸發器：** Cron (每 5 分鐘)

**流程：**
```
1. Cron 觸發 (*/5 * * * *)
   ↓
2. 查詢 PocketBase - 取得最近 5 分鐘的新訊息
   ↓
3. 判斷：是否有新訊息？
   ├─ 否 → 結束
   └─ 是 → 繼續
       ↓
4. 格式化訊息
   - 開頭：@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot
   - 內容：對話摘要
   ↓
5. 發送到 Telegram 群組
   ↓
6. 更新 PocketBase - 標記訊息已發送
```

#### 階段 3：資料庫 Schema 調整

**新增欄位到 `messages` 集合：**
- `sent_to_telegram` (boolean, default: false)
- `sent_at` (datetime, optional)

**用途：**
- 追蹤哪些訊息已經發送到 Telegram
- 避免重複發送

### 詳細實施計劃

#### 任務 1：調整 PocketBase Schema

**預估時間：** 10 分鐘

**步驟：**
1. 開啟 PocketBase Admin
2. 編輯 `messages` 集合
3. 新增欄位：
   - `sent_to_telegram` (Bool, default: false)
   - `sent_at` (Date, optional)
4. 儲存變更

#### 任務 2：建立 n8n Cron Workflow

**預估時間：** 30 分鐘

**節點配置：**

1. **Cron Node**
   - Mode: Every 5 Minutes
   - Cron Expression: `*/5 * * * *`

2. **PocketBase Query Node (HTTP Request)**
   - Method: GET
   - URL: `{{$env.POCKETBASE_URL}}/api/collections/messages/records`
   - Query Parameters:
     - `filter`: `sent_to_telegram = false && created >= "{{$now.minus({minutes: 5}).toISO()}}"`
     - `expand`: `conversation`
     - `sort`: `created`

3. **IF Node - Check Messages**
   - Condition: `{{$json.items.length}} > 0`

4. **Function Node - Format Message**
   - 輸入：PocketBase 查詢結果
   - 輸出：格式化的 Telegram 訊息

5. **Telegram Node - Send Message**
   - Chat ID: 群組 ID
   - Message: 格式化的訊息

6. **PocketBase Update Node (HTTP Request)**
   - Method: PATCH
   - 批次更新已發送的訊息

#### 任務 3：訊息格式化範例

**Function Node 代碼：**

```javascript
// 取得所有新訊息
const messages = $input.all()[0].json.items;

if (messages.length === 0) {
  return [];
}

// 按對話分組
const conversations = {};
messages.forEach(msg => {
  const convId = msg.expand?.conversation?.id || msg.conversation;
  if (!conversations[convId]) {
    conversations[convId] = {
      session: msg.expand?.conversation?.guest_session_id || 'unknown',
      messages: []
    };
  }
  conversations[convId].messages.push({
    sender: msg.sender,
    content: msg.content,
    time: msg.created
  });
});

// 格式化訊息
let text = '@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot\n\n';
text += '📬 新的 Webchat 對話\n';
text += '━━━━━━━━━━━━━━━━\n\n';

Object.values(conversations).forEach((conv, index) => {
  text += `💬 對話 ${index + 1} (${conv.session})\n`;
  conv.messages.forEach(msg => {
    const icon = msg.sender === 'user' ? '👤' : '🤖';
    text += `${icon} ${msg.content}\n`;
  });
  text += '\n';
});

return [{
  json: {
    text: text,
    messageIds: messages.map(m => m.id)
  }
}];
```

### 訊息格式範例

```
@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot

📬 新的 Webchat 對話
━━━━━━━━━━━━━━━━

💬 對話 1 (umio-1773671759232-s0jth0m)
👤 good afternoon
🤖 Message received

💬 對話 2 (umio-1773671823456-abc123)
👤 我想找道德經
🤖 Message received
```

### 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| PocketBase 查詢失敗 | 高 | 低 | 添加錯誤處理和重試機制 |
| Telegram 發送失敗 | 中 | 中 | 保留 sent_to_telegram=false，下次重試 |
| 訊息過長超過 Telegram 限制 | 中 | 低 | 限制每次最多 10 條對話 |
| Cron 任務重疊執行 | 低 | 低 | n8n 自動處理 |

### 測試計劃

#### 單元測試

1. **測試 PocketBase 查詢**
   - 驗證 filter 條件正確
   - 驗證時間範圍計算

2. **測試訊息格式化**
   - 單一對話
   - 多個對話
   - 空結果

3. **測試 Telegram 發送**
   - 驗證 mention 格式
   - 驗證訊息長度

#### 整合測試

1. 發送測試 webchat 訊息
2. 等待 5 分鐘
3. 檢查 Telegram 群組是否收到通知
4. 驗證 PocketBase 中 sent_to_telegram 已更新

### 時程規劃

| 階段 | 任務 | 預估時間 | 負責人 |
|------|------|----------|--------|
| 1 | 調整 PocketBase Schema | 10 分鐘 | 開發者 |
| 2 | 建立 n8n Cron Workflow | 30 分鐘 | 開發者 |
| 3 | 測試和調整 | 20 分鐘 | 開發者 |
| **總計** | | **60 分鐘** | |

### 部署檢查清單

- [ ] PocketBase Schema 已更新
- [ ] n8n Cron Workflow 已建立並啟用
- [ ] Telegram Bot Token 已配置
- [ ] Telegram 群組 Chat ID 已設定
- [ ] 測試訊息發送成功
- [ ] 監控 5 分鐘後是否收到通知
- [ ] 驗證 sent_to_telegram 欄位更新

### 後續優化建議

1. **可調整的時間間隔**
   - 允許動態調整 Cron 間隔（例如：高峰時段 3 分鐘，低峰 10 分鐘）

2. **智能分組**
   - 相同用戶的多次對話合併顯示

3. **優先級處理**
   - 緊急關鍵字的對話立即發送，不等待批次

4. **統計報表**
   - 每日對話數量統計
   - Bot 回應率分析

## 結論

採用 n8n Cron Workflow 方案可以：
- ✅ 快速實施（約 1 小時）
- ✅ 易於維護和調整
- ✅ 減少 Telegram 訊息數量
- ✅ 提供更好的對話概覽

建議立即開始實施階段 1 和階段 2。



