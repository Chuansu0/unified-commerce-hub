# OpenClaw Bridge 連接檢查清單

## 問題確認

Bridge 收到 HTTP 請求，但連接 OpenClaw WebSocket timeout（60秒）。

## 檢查項目

### 1. ✅ Bridge 設定檢查（已確認）

**index.js** 中的設定：
```javascript
const OPENCLAW_WS = process.env.OPENCLAW_WS_URL || 'ws://openclaw.zeabur.internal:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
```

**Umio endpoint**（已確認正確）：
```javascript
app.post('/api/umio/chat', async (req, res) => {
    // ...
    params: {
        agentId: 'umio',  // ← 指向 umio agent ✓
        message,
        context: { ... }
    }
    // ...
});
```

### 2. ⚠️ 需要確認：OpenClaw 服務設定

請在 Zeabur 控制台確認：

#### 2.1 OpenClaw 設定檔
```bash
# 進入 OpenClaw 服務的 Console/Terminal
# 檢查設定檔內容
cat ~/.openclaw/config.json | jq '.gateway'
```

**應該看到**：
```json
{
    "mode": "server",
    "host": "0.0.0.0",
    "port": 18789,
    ...
}
```

**如果看到**：
```json
{
    "mode": "local",  // ← 錯誤！需要改成 server
    ...
}
```

#### 2.2 Port 暴露
在 Zeabur Dashboard：
1. 進入 OpenClaw 服務
2. 點擊 "Network" 或 "Ports"
3. 確認 `18789` 已添加到暴露端口
4. 確認服務名稱是 `openclaw`

#### 2.3 環境變數
在 Zeabur Dashboard → openclaw-http-bridge 服務：

| 變數名 | 值 | 狀態 |
|--------|-----|------|
| `OPENCLAW_WS_URL` | `ws://openclaw.zeabur.internal:18789` | 需確認 |
| `OPENCLAW_GATEWAY_TOKEN` | (從 OpenClaw 複製) | 需確認 |
| `PORT` | `3000` | 需確認 |

### 3. 測試步驟

#### 3.1 測試 OpenClaw WebSocket（在 Zeabur Console 中）

```bash
# 在 OpenClaw 服務的 terminal 中
curl -I http://localhost:18789
# 應該返回 HTTP/1.1 400 Bad Request（表示服務在跑）
```

或測試 WebSocket：
```bash
# 安裝 wscat
npm install -g wscat

# 測試連接
wscat -c "ws://localhost:18789?token=YOUR_TOKEN"
```

#### 3.2 測試 DNS 解析（在 Bridge 服務中）

```bash
# 在 openclaw-http-bridge 服務的 terminal 中
nslookup openclaw.zeabur.internal
# 應該返回 IP 地址

# 測試連接 OpenClaw
curl http://openclaw.zeabur.internal:18789
```

### 4. 常見問題

#### Q: 如何找到 OPENCLAW_GATEWAY_TOKEN？
在 OpenClaw 服務設定中，設定檔的 `gateway.controlUi` 或 `gateway.token` 欄位。

#### Q: 如何修改 OpenClaw 設定檔？
1. 在 Zeabur Dashboard 進入 OpenClaw 服務
2. 找到 Config/Settings 區域
3. 編輯設定檔
4. 重新部署服務

#### Q: 服務名稱不對怎麼辦？
如果 Zeabur 中的服務名稱不是 `openclaw`，需要修改 Bridge 的環境變數：
```
OPENCLAW_WS_URL=ws://正確的服務名稱.zeabur.internal:18789
```

## 快速修復步驟

### 步驟 1：更新 OpenClaw 設定

1. 登入 Zeabur Dashboard
2. 進入 OpenClaw 服務
3. 將 `openclaw-with-gateway-server-20260321.json` 內容貼到設定檔
4. 保存並重新部署

### 步驟 2：確認 Port 暴露

在 Zeabur Network 設定中：
- 添加 port `18789`
- 確認協議是 TCP

### 步驟 3：更新 Bridge 環境變數

```
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<從 OpenClaw 設定中複製>
```

### 步驟 4：重新部署 Bridge

在 Zeabur Dashboard 中重新部署 `openclaw-http-bridge` 服務。

### 步驟 5：測試

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test-123"}'
```

## 如果還是失敗

請提供以下資訊：
1. OpenClaw 服務的 gateway 設定截圖
2. Zeabur Network 設定的 ports 列表
3. Bridge 服務的環境變數（隱藏 token）
4. OpenClaw 服務的日誌（最後 50 行）
