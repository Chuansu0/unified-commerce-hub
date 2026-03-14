# OpenClaw HTTP Bridge 部署指南

## 概述

OpenClaw HTTP Bridge 提供 HTTP API 讓前端直接與 OpenClaw AI Bot 通訊。

**API 端點**:
- `POST /api/umio/chat` - 與 Umio Bot 對話
- `POST /api/chat` - 與 Andrea Bot 對話
- `GET /health` - 健康檢查

## 部署到 Zeabur

### 1. 重新部署服務

由於已更新 CORS 設定，需要重新部署：

```bash
# 進入專案目錄
cd d:\WSL\unified-commerce-hub

# 提交變更
git add openclaw-http-bridge/index.js
git commit -m "Fix CORS for Umio HTTP endpoint"
git push
```

### 2. 在 Zeabur 重新部署

1. 進入 Zeabur Dashboard
2. 找到 `openclaw-http-bridge` 服務
3. 點擊 "Redeploy" 或等待自動重新部署

### 3. 驗證 CORS 設定

```bash
# 測試 CORS preflight
curl -X OPTIONS https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Origin: https://www.neovega.cc" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# 測試 Umio 端點
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.neovega.cc" \
  -d '{
    "message": "你好",
    "sessionId": "test-123"
  }'
```

### 4. 環境變數

確保以下環境變數已設定：

```
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<從 OpenClaw 服務複製>
N8N_REPLY_WEBHOOK=https://n8n.neovega.cc/webhook/openclaw-reply
PORT=3000
```

## 前端整合

### 環境變數

在 `.env` 中設定：

```bash
VITE_OPENCLAW_BRIDGE_URL=https://openclaw-http-bridge.zeabur.app
```

### 使用範例

```typescript
import { chatWithUmio } from "@/services/umioChat";

const response = await chatWithUmio("你好", "session-123");
console.log(response); // "你好！我是 Umio..."
```

## 故障排除

### CORS 錯誤

**錯誤訊息**：
```
Access to fetch at '...' has been blocked by CORS policy
```

**解決方法**：
1. 確認已重新部署 openclaw-http-bridge
2. 檢查瀏覽器 Network Tab 中的 Response Headers
3. 應該看到 `Access-Control-Allow-Origin: *`

### PocketBase 403 Forbidden

這是預期行為！WebChat 訪客沒有權限寫入 PocketBase。

**解決方法**：
- 對話功能不受影響，只是訊息不會被儲存
- 如需儲存對話，需要實作後端代理或調整 PocketBase 權限

### 連接 OpenClaw 失敗

- 檢查 `OPENCLAW_GATEWAY_TOKEN` 是否正確
- 確認 OpenClaw 服務正常運行
- 查看 bridge 服務日誌

### 超時錯誤

- OpenClaw 可能正在處理，增加 timeout
- 檢查 OpenClaw 日誌確認是否收到請求

## 變更記錄

### 2025-03-14
- ✅ 添加 CORS 支援，允許跨域請求
- ✅ 新增 `/api/umio/chat` 端點，支援同步 HTTP 回覆
- ✅ 優化錯誤處理

## 相關文件

- `UMIO_HTTP_INTEGRATION.md` - 完整整合指南
- `src/services/umioChat.ts` - 前端服務
- `src/hooks/useUmioChat.ts` - React Hook
