# OpenClaw Bridge Timeout 問題診斷 v2

## 發現

Zeabur 上的 OpenClaw 設定**已經有 umio agent**，但與本地 `zeabur_openclaw_config_fixed.json` 不同：

**Zeabur 上的設定 (實際運行)**：
```json
{
    "id": "umio",
    "name": "Umio (Kimi Assistant)",
    "model": "opencode-go/kimi-k2.5"
}
```

**本地設定檔**：
```json
{
    "id": "umio",
    "name": "Umio (Digital Content Clerk)",
    "workspace": "~/.openclaw/workspace-umio",
    "model": "opencode-go/glm-5"
}
```

## 關鍵差異

Zeabur 上的 umio agent **缺少 `workspace` 欄位**！

這可能是問題所在 - OpenClaw 可能需要 workspace 來正確初始化 agent。

## 其他可能問題

1. **Environment Variables**：
   - `OPENCLAW_WS_URL` 是否正確？
   - `OPENCLAW_GATEWAY_TOKEN` 是否有效？

2. **WebSocket 連接**：
   - Bridge 使用 `ws://openclaw.zeabur.internal:18789`
   - 這個內部位址是否正確？

3. **OpenClaw Gateway 模式**：
   - Zeabur 設定中 `gateway.mode: 'local'`
   - 但 bridge 嘗試連接到內部 WebSocket

## 建議修復

### 方案 1: 為 umio agent 添加 workspace（推薦）

在 Zeabur 的 OpenClaw 設定中，為 umio agent 添加 workspace：

```json
{
    "id": "umio",
    "name": "Umio (Kimi Assistant)",
    "workspace": "~/.openclaw/workspace-umio",
    "model": "opencode-go/kimi-k2.5"
}
```

### 方案 2: 檢查環境變數

確認 `openclaw-http-bridge` 服務的環境變數：

```bash
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<從 OpenClaw 服務複製正確的 token>
```

### 方案 3: 測試 WebSocket 連接

直接測試 OpenClaw WebSocket：

```bash
# 使用 wscat 或類似工具
wscat -c "ws://openclaw.zeabur.internal:18789?token=YOUR_TOKEN"
```

## 立即測試

在 n8n 中執行 workflow 前，先直接測試 bridge：

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test",
    "sessionId": "debug-session"
  }' \
  -v
```

查看 bridge 服務的日誌，確認：
1. 是否收到請求
2. WebSocket 是否成功連接
3. 是否有錯誤訊息

## 下一步

1. 登入 Zeabur 控制台
2. 查看 `openclaw-http-bridge` 服務的日誌
3. 確認環境變數設定
4. 為 umio agent 添加 workspace 欄位
5. 重新部署並測試
