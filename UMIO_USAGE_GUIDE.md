# Umio HTTP Endpoint 使用指南

## 概述
Umio (Digital Content Clerk) 現在可以直接透過 HTTP endpoint 與 Webchat 連接，不經過 n8n。

## 架構
```
Webchat Frontend → HTTP Bridge → OpenClaw WebSocket → Umio Agent
       ↑                                    ↓
       └──────────── HTTP Response ─────────┘
```

## API 端點

### POST `/api/umio/chat`
**Host**: `https://openclaw-http-bridge.zeabur.app`

#### Request Body
```json
{
  "message": "你好，Umio！",
  "sessionId": "user-123"
}
```

#### Response
```json
{
  "success": true,
  "response": "你好！我是 Umio，有什麼可以幫你的嗎？",
  "sessionId": "user-123",
  "agent": "umio",
  "timestamp": "2026-03-13T10:00:00.000Z"
}
```

## 前端使用方式

### 1. 直接使用 `umioChat.ts`
```typescript
import { sendToUmio, checkUmioHealth } from "@/services/umioChat";

// 發送訊息給 Umio
const response = await sendToUmio("你好，Umio！", "user-123");
console.log(response); // "你好！我是 Umio..."

// 檢查健康狀態
const health = await checkUmioHealth();
console.log(health.ok); // true/false
```

### 2. 在 Chat Service 中整合
可以修改 `src/services/chat.ts` 來支援 Umio：
```typescript
import { sendToUmio } from "./umioChat";

export async function sendChatMessage(
  message: string,
  sessionId: string,
  agent: "default" | "umio" = "default"
) {
  if (agent === "umio") {
    return await sendToUmio(message, sessionId);
  }
  // ... 其他 agent 處理
}
```

## 環境變數
```bash
# 前端
VITE_UMIO_HTTP_BRIDGE_URL=https://openclaw-http-bridge.zeabur.app/api/umio/chat

# HTTP Bridge (Zeabur 設定)
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<your_token>
```

## 錯誤處理
- **400**: message 或 sessionId 未提供
- **504**: Umio 回應逾時 (30 秒)
- **500**: WebSocket 連線失敗或內部錯誤

## 測試
```bash
# 測試健康檢查
curl https://openclaw-http-bridge.zeabur.app/health

# 測試 Umio 對話
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "sessionId": "test-123"}'
```

## 部署注意事項
1. HTTP Bridge 需要正確設定 `OPENCLAW_WS_URL` 和 `OPENCLAW_GATEWAY_TOKEN`
2. Umio agent 必須已在 OpenClaw 中定義 (agentId: 'umio')
3. WebSocket 連線會自動處理，前端只需使用 HTTP
