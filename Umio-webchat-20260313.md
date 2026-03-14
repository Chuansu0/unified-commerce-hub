# Umio Webchat HTTP Endpoint 實作計畫

## 目標
建立 Umio (Digital Content Clerk) 與 Webchat 的直接 HTTP 連接，不經過 n8n，讓 Umio 能夠帶著技能知識和記憶回覆線上聊天。

## 背景
- Umio 已經在 OpenClaw 配置中定義 (agentId: 'umio')
- `openclaw-http-bridge` 已經提供 WebSocket 代理功能
- 群組回覆已經放棄，僅支援直接 HTTP 請求/回應

## 實作項目

### 1. HTTP Bridge 新增 Umio 專用端點 ✅
**檔案**: `openclaw-http-bridge/index.js`
- [x] 新增 `/api/umio/chat` endpoint
- [x] 固定使用 `agentId: 'umio'`
- [x] 移除 n8n 回呼邏輯，直接 HTTP 回應
- [x] 加入錯誤處理與逾時機制

### 2. 前端服務層 ✅
**檔案**: `src/services/umioChat.ts`
- [x] 建立 `sendToUmio(message, sessionId)` 函式
- [x] 呼叫 HTTP Bridge 的 `/api/umio/chat`
- [x] 處理錯誤與回應
- [x] 建立 `checkUmioHealth()` 健康檢查函式

**檔案**: `src/services/config.ts`
- [x] 新增 `VITE_UMIO_HTTP_BRIDGE_URL` 環境變數配置

**檔案**: `.env.example`
- [x] 新增環境變數範例

### 3. AI Settings 整合（可選）
**檔案**: `src/services/aiSettings.ts`
- [ ] 新增「Umio」作為 AI 來源選項
- [ ] 讓 Webchat 可以切換到 Umio 進行對話

### 4. Chat Service 整合（可選）
**檔案**: `src/services/chat.ts`
- [ ] 在 `sendChatMessage` 中加入 Umio 支援
- [ ] 根據 AI Settings 選擇使用 Umio 或其他 Agent

## 完成標準
- [x] HTTP Bridge `/api/umio/chat` endpoint 可用
- [x] 前端 `umioChat.ts` 服務層完成
- [x] 環境變數配置完成
- [x] 使用文件 (`UMIO_USAGE_GUIDE.md`) 完成

## 後續可選項目
- 在 AI Settings 中加入 Umio 選項
- 在 Chat Service 中整合 Umio 支援
- 在前端 UI 中提供 Agent 切換功能

## 技術架構

```
Webchat Frontend → HTTP Bridge → OpenClaw WebSocket → Umio Agent
       ↑                                    ↓
       └──────────── HTTP Response ─────────┘
```

## 環境變數
```bash
# 前端
VITE_UMIO_HTTP_BRIDGE_URL=https://openclaw-http-bridge.zeabur.app/api/umio/chat

# HTTP Bridge
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<token>
```

## 完成標準
- [ ] Webchat 可以透過 HTTP 與 Umio 對話
- [ ] Umio 回覆帶有技能知識和記憶
- [ ] 錯誤處理完善（逾時、連線失敗等）
- [ ] 文件完整

## 備註
- 不經過 n8n，直接連接 OpenClaw
- 使用現有 HTTP Bridge 架構，最小化修改
