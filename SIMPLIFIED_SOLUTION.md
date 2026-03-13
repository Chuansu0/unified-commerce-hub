#簡化方案：使用 Telegram 作為橋接

## 問題分析

OpenClaw 的 WebSocket API 是為控制 UI 設計的，不適合直接用於聊天整合。

## 新方案：Telegram Reply機制

### 架構

```
WebChat → n8n → Telegram (umio 發送特殊格式訊息)
                    ↓
                Andrea監聽特定關鍵字並回覆
                    ↓
                n8n 監聽 Andrea 的回覆 → WebChat
```

### 實作步驟

#### 1. 修改 WebChat Inbound Workflow

讓 umio 發送包含特殊標記的訊息：

```json
{
  "text": "WEBCHAT_MSG|session-123|使用者訊息內容"
}
```

#### 2. 配置 Andrea 監聽模式

在 OpenClaw 配置中，讓 andrea 監聽群組所有訊息（不只 mention）：

```json
{
  "channels": {
    "telegram": {
      "accounts": {
        "andrea": {
          "groups": {
            "*": {
              "requireMention": false
            }
          }
        }
      }
    }
  }
}
```

#### 3. 建立 Andrea Skill 過濾 WebChat 訊息

建立一個 skill讓 andrea 只回應WEBCHAT_MSG 開頭的訊息。

#### 4. 建立 n8n Workflow 監聽 Andrea 回覆

使用 Telegram Bot API 的 getUpdates 或 webhook 監聽 andrea 的回覆。

## 更簡單的方案：直接使用 n8n Telegram Integration

### 步驟

1. **n8n 接收 WebChat 訊息**
2. **n8n 使用 Telegram 節點發送訊息給 Andrea（私訊）**
3. **n8n 監聽 Andrea 的回覆**
4. **n8n 將回覆發送回 WebChat**

這樣完全繞過群組，直接與 andrea 私訊互動。

### n8n Workflow 設計

```
[WebChat Webhook] ↓
[Telegram: Send Message to Andrea DM]
    ↓
[Wait for Reply] (使用 Telegram Trigger)
    ↓
[Send to WebChat]
```

## 推薦方案

使用 **n8n 的 Telegram 節點直接與 Andrea 私訊**，這是最簡單且可靠的方案。

### 優點

- 不需要 HTTP Bridge
- 不需要修改 OpenClaw 配置
- 使用 n8n 內建功能
- Andrea 已經能正常回應 Telegram 訊息

### 缺點

- 需要 Andrea 的 Telegram user ID 或 username
- 每個 webchat session 需要追蹤對話狀態