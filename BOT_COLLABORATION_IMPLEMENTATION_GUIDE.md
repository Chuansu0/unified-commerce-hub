# Bot Collaboration 實作指南

**版本**: 1.0  
**日期**: 2026-03-18  
**狀態**: 實作階段

## 1. 系統架構

### 1.1 核心組件

```
用戶訊息 (Telegram)
    ↓
Umio Bot 接收
    ↓
儲存到 PocketBase (messages)
    ↓
Message Router (n8n)
    ├─ 分析 intent
    └─ 建立 agent_workflows
        ↓
Agent Orchestrator (n8n)
    ├─ 執行 Umio Bot
    ├─ 執行 Andrea Bot
    └─ 執行 Linus Bot
        ↓
Telegram Sender (n8n)
    └─ 發送回覆到 Telegram
```

### 1.2 資料流程

1. **訊息接收**: Telegram → Umio Bot → PocketBase
2. **路由決策**: PocketBase → Message Router → agent_workflows
3. **Bot 執行**: agent_workflows → Orchestrator → OpenClaw API
4. **回覆發送**: PocketBase → Telegram Sender → Telegram

## 2. 前置準備

### 2.1 PocketBase Schema

已完成 ✅：
- `messages` collection 已有 `sent_to_telegram` 和 `sent_at` 欄位

需要建立：
- `agent_workflows` collection

### 2.2 建立 agent_workflows Collection

使用 PocketBase Admin UI 或 API 建立：

```javascript
{
  name: "agent_workflows",
  type: "base",
  schema: [
    {
      name: "messageId",
      type: "text",
      required: true
    },
    {
      name: "conversationId",
      type: "text",
      required: true
    },
    {
      name: "agents",
      type: "json",
      required: true
    },
    {
      name: "currentAgent",
      type: "text",
      required: true
    },
    {
      name: "status",
      type: "select",
      required: true,
      options: {
        values: ["pending", "processing", "completed", "failed"]
      }
    },
    {
      name: "results",
      type: "json",
      required: false
    }
  ]
}
```

## 3. n8n Workflows 部署

### 3.1 匯入 Workflows

1. 開啟 n8n (https://www.neovega.cc/n8n)
2. 點擊 "Import from File"
3. 依序匯入：
   - `n8n/bot-collaboration-router.json`
   - `n8n/bot-collaboration-orchestrator.json`
   - `n8n/bot-collaboration-sender.json`

### 3.2 配置 Credentials

#### PocketBase Credential
- URL: `https://www.neovega.cc/pb`
- Email: `alex0715@ms87.url.com.tw`
- Password: `527@Chuansu0`

#### Telegram Bot API
設定環境變數：
```bash
TELEGRAM_BOT_API=https://api.telegram.org/bot<YOUR_BOT_TOKEN>
```

### 3.3 啟用 Workflows

1. Message Router: 設定為 "Active"
2. Agent Orchestrator: 設定為 "Active" (使用 Schedule Trigger，每 30 秒執行一次)
3. Telegram Sender: 設定為 "Active" (使用 Schedule Trigger，每 10 秒執行一次)

## 4. Intent 分析邏輯

### 4.1 當前規則

Message Router 會根據以下規則決定使用哪些 bots：

| 條件 | Agents |
|------|--------|
| intent 包含 "technical" 或內容包含 "bug", "error" | `["umio", "linus"]` |
| intent 包含 "analysis" 或內容包含 "analyze", "report" | `["umio", "andrea"]` |
| intent 包含 "complex" 或內容包含 "help" | `["umio", "andrea", "linus"]` |
| 其他 | `["umio"]` |

### 4.2 自訂規則

修改 `bot-collaboration-router.json` 中的 "Analyze Intent" 節點：

```javascript
const content = $input.item.json.content.toLowerCase();
const intent = $input.item.json.intent || '';

let agents = ['umio'];

// 自訂規則
if (content.includes('訂單')) {
  agents = ['umio', 'order-bot'];
} else if (content.includes('產品')) {
  agents = ['umio', 'product-bot'];
}

return {
  messageId: $input.item.json.id,
  conversationId: $input.item.json.conversation,
  agents: agents,
  currentAgent: agents[0],
  status: 'pending'
};
```

## 5. 測試流程

### 5.1 單一 Bot 測試

1. 在 Telegram 發送簡單訊息：「你好」
2. 預期結果：
   - Umio Bot 回覆
   - `agent_workflows` 建立記錄，agents = ["umio"]
   - 訊息標記為 `sent_to_telegram = true`

### 5.2 多 Bot 協作測試

1. 在 Telegram 發送：「幫我分析這個錯誤」
2. 預期結果：
   - `agent_workflows` 建立記錄，agents = ["umio", "andrea"]
   - Umio Bot 先回覆
   - Andrea Bot 接著回覆
   - 兩個回覆都發送到 Telegram

### 5.3 驗證步驟

檢查 PocketBase：
```sql
-- 檢查 messages
SELECT * FROM messages WHERE sent_to_telegram = true ORDER BY created DESC LIMIT 10;

-- 檢查 agent_workflows
SELECT * FROM agent_workflows WHERE status = 'completed' ORDER BY created DESC LIMIT 10;
```

## 6. 監控與除錯

### 6.1 n8n 執行日誌

1. 開啟 n8n
2. 點擊 "Executions"
3. 查看每個 workflow 的執行狀態

### 6.2 PocketBase 日誌

檢查 PocketBase Admin UI 中的：
- Collections → messages → Records
- Collections → agent_workflows → Records

### 6.3 常見問題

#### 問題 1: Message Router 沒有觸發
**原因**: PocketBase Trigger 未正確配置  
**解決**: 檢查 PocketBase credential 是否正確

#### 問題 2: Agent Orchestrator 沒有執行 bots
**原因**: OpenClaw API 未配置  
**解決**: 確認 OpenClaw API endpoint 和 credentials

#### 問題 3: Telegram Sender 沒有發送訊息
**原因**: Telegram Bot API token 錯誤  
**解決**: 檢查環境變數 `TELEGRAM_BOT_API`

## 7. 效能優化

### 7.1 調整輪詢頻率

根據負載調整 Schedule Trigger：
- 低負載: 每 60 秒
- 中負載: 每 30 秒
- 高負載: 每 10 秒

### 7.2 批次處理

修改 Telegram Sender 以批次發送：
```javascript
// 一次處理最多 10 條訊息
filter: "sent_to_telegram=false && sender!='user'",
limit: 10
```

## 8. 擴展功能

### 8.1 添加新 Bot

1. 在 Intent 分析邏輯中添加新規則
2. 在 Agent Orchestrator 中添加新 bot 的 API 呼叫
3. 測試新 bot 的執行

### 8.2 條件執行

根據前一個 bot 的回覆決定是否執行下一個 bot：

```javascript
// 在 Orchestrator 中
const previousResult = $json.results[$json.currentAgent];
if (previousResult.confidence < 0.5) {
  // 執行下一個 bot
} else {
  // 跳過
}
```

### 8.3 並行執行

修改 Orchestrator 以並行執行多個 bots：
```javascript
// 同時執行所有 bots
const promises = agents.map(agent => callBotAPI(agent));
const results = await Promise.all(promises);
```

## 9. 安全性考量

### 9.1 API 認證

確保所有 API 呼叫都使用正確的認證：
- PocketBase: Admin token
- OpenClaw: API key
- Telegram: Bot token

### 9.2 資料驗證

在 Message Router 中驗證輸入：
```javascript
if (!$json.content || $json.content.length > 4000) {
  throw new Error('Invalid message content');
}
```

### 9.3 錯誤處理

在每個 workflow 中添加錯誤處理節點：
- 記錄錯誤到 PocketBase
- 發送通知給管理員
- 標記 workflow 為 "failed"

## 10. 下一步

### 10.1 立即行動
- [ ] 建立 `agent_workflows` collection
- [ ] 匯入三個 workflows 到 n8n
- [ ] 配置 credentials
- [ ] 執行單一 bot 測試

### 10.2 短期目標
- [ ] 完成多 bot 協作測試
- [ ] 優化 intent 分析邏輯
- [ ] 添加錯誤處理機制

### 10.3 長期目標
- [ ] 實作並行執行
- [ ] 添加 A/B 測試功能
- [ ] 整合機器學習模型

---

**文件版本**: 1.0  
**最後更新**: 2026-03-18
