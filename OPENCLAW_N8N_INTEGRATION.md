# OpenClaw n8n Integration Setup

## 架構概述

```
WebChat → n8n → OpenClaw (HTTP API) → n8n → WebChat
```

## 配置步驟

### 1. 在 OpenClaw 中啟用 HTTP API

OpenClaw 預設在 `http://0.0.0.0:18789` 提供 WebSocket API，但我們需要 HTTP REST API。

**方案 A：使用 OpenClaw Gateway API**

OpenClaw gateway 提供 WebSocket API，我們需要建立一個 HTTP wrapper。

**方案 B：使用 OpenClaw 的 MCP Server（推薦）**

OpenClaw 支援 MCP (Model Context Protocol)，可以透過 HTTP 呼叫。

### 2. 建立 HTTP API Wrapper

由於 OpenClaw 主要使用 WebSocket，我們需要建立一個簡單的 HTTP → WebSocket 橋接服務。

#### 建立 `openclaw-http-bridge` 服務

```javascript
// openclaw-http-bridge/index.js
import express from 'express';
import WebSocket from 'ws';

const app = express();
app.use(express.json());

const OPENCLAW_WS_URL = process.env.OPENCLAW_WS_URL || 'ws://openclaw.zeabur.internal:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

app.post('/api/chat', async (req, res) => {
  const { message, sessionId, agentId = 'andrea' } = req.body;
  
  try {
    const ws = new WebSocket(`${OPENCLAW_WS_URL}?token=${OPENCLAW_TOKEN}`);
    
    let response = '';
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'chat.message',
        agentId,
        message,
        sessionId,
        platform: 'webchat'
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'chat.response') {
        response = msg.content;
        ws.close();
      }
    });
    
    ws.on('close', () => {
      res.json({ success: true, response, sessionId });
    });ws.on('error', (error) => {
      res.status(500).json({ success: false, error: error.message });
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OpenClaw HTTP Bridge listening on port ${PORT}`);
});
```

### 3. 部署 HTTP Bridge到Zeabur

1. 建立新的 Zeabur 服務：`openclaw-http-bridge`
2. 設定環境變數：
   - `OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789`
   - `OPENCLAW_GATEWAY_TOKEN=<從 OpenClaw 環境變數複製>`
3. 部署服務

### 4. 更新 n8n Workflow

將 `webchat-to-openclaw-workflow.json` 中的 URL 改為：
```
https://openclaw-http-bridge.zeabur.app/api/chat
```

### 5. 更新 WebChat 前端

修改 `src/services/chat.ts` 使用新的 n8n webhook：

```typescript
const N8N_WEBHOOK_URL ='https://n8n.neovega.cc/webhook/chat-to-openclaw';

export async function sendMessage(message: string, sessionId: string) {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, platform: 'webchat' })
  });
  return response.json();
}
```

## 測試流程

1. 在 WebChat 發送訊息
2. n8n 接收並轉發到 OpenClaw HTTP Bridge
3. Bridge 透過 WebSocket 與 OpenClaw 通訊
4. OpenClaw (andrea) 處理訊息並回應
5. 回應透過 Bridge → n8n → WebChat

## 故障排除

### OpenClaw WebSocket 連接失敗
- 檢查 `OPENCLAW_GATEWAY_TOKEN` 是否正確
- 確認 OpenClaw 服務正在運行
- 查看 OpenClaw 日誌

### n8n Workflow 超時
- 增加 HTTP Request 節點的 timeout 設定
- 檢查 OpenClaw 回應時間

### WebChat 沒有收到回應
- 檢查 n8n workflow 執行日誌
- 確認 HTTP Bridge 服務正常運行