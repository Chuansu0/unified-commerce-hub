# OpenClaw 設定同步摘要

## 已創建的檔案

### 1. openclaw-backup-20260321.json
**原始設定的備份**（與 Zeabur 線上環境同步）

- 包含 LeLe 和 Mako agent
- `gateway.mode: "local"`（當前設定）
- 使用環境變數 `${OPENCLAW_API_KEY}` 等

### 2. openclaw-with-gateway-server-20260321.json
**修改後的設定**（待部署到 Zeabur）

與備份檔案的差異僅在 `gateway` 部分：

```json
// 備份檔案（原始）
"gateway": {
    "mode": "local",
    "controlUi": { ... },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12"]
}

// 修改後（待部署）
"gateway": {
    "mode": "server",
    "host": "0.0.0.0",
    "port": 18789,
    "controlUi": { ... },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12", "172.70.0.0/16", "104.23.0.0/16", "104.21.0.0/16"],
    "websocket": {
        "allowOrigins": ["*"],
        "allowInsecure": true
    }
}
```

## 修改說明

| 欄位 | 原始值 | 修改後 | 說明 |
|------|--------|--------|------|
| `mode` | `"local"` | `"server"` | 啟用網路存取 |
| `host` | 無 | `"0.0.0.0"` | 監聽所有網路介面 |
| `port` | 無 | `18789` | WebSocket 埠號 |
| `websocket` | 無 | 新增 | 允許 WebSocket 連接 |

## 部署步驟

1. **備份當前 Zeabur 設定**（已完成：openclaw-backup-20260321.json）
2. **在 Zeabur 控制台**：
   - 進入 OpenClaw 服務設定
   - 將設定檔內容替換為 `openclaw-with-gateway-server-20260321.json`
3. **確認 port 18789 已暴露**（在 Zeabur 網路設定）
4. **重新部署 OpenClaw 服務**
5. **重新部署 bridge 服務**
6. **測試連接**：
   ```bash
   curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello Umio!","sessionId":"test-001"}'
   ```

## 如果出問題

隨時可以用 `openclaw-backup-20260321.json` 恢復原始設定！
