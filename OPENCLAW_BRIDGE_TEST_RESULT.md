# OpenClaw Bridge 測試結果

## 測試時間
2025-03-21 18:27

## 測試結果

### ❌ 測試失敗：Request Timeout

```
Request timeout!
Error: socket hang up
```

## 問題分析

Bridge 成功接收 HTTP 請求，但在嘗試連接 OpenClaw WebSocket 時 timeout。這表示：

1. ✅ Bridge HTTP 服務正常運行
2. ❌ Bridge 無法連接到 OpenClaw WebSocket
3. ❌ OpenClaw WebSocket 可能無法存取或設定錯誤

## 可能原因

### 1. WebSocket URL 錯誤
Bridge 使用：`ws://openclaw.zeabur.internal:18789`

**問題**：這是 Zeabur 內部網路位址，可能無法從 bridge 服務存取。

### 2. OpenClaw Gateway Token 無效
如果 token 錯誤，OpenClaw 會拒絕 WebSocket 連接。

### 3. OpenClaw 服務未正確啟動
OpenClaw 的 WebSocket 伺服器可能沒有在 port 18789 監聽。

## 建議修復步驟

### 步驟 1: 檢查 bridge 環境變數

在 Zeabur 控制台檢查 `openclaw-http-bridge` 服務的環境變數：

```bash
# 應該要設定這些：
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<正確的 token>
```

### 步驟 2: 確認 OpenClaw WebSocket URL

檢查 OpenClaw 服務實際的 WebSocket 位址：

1. 登入 Zeabur 控制台
2. 進入 OpenClaw 服務
3. 查看服務的內部網路設定
4. 確認 WebSocket port 是否為 18789

### 步驟 3: 測試 WebSocket 連接

在 bridge 服務中執行：

```bash
# 使用 wscat 測試
npx wscat -c "ws://openclaw.zeabur.internal:18789?token=YOUR_TOKEN"
```

或建立測試腳本：

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://openclaw.zeabur.internal:18789?token=TOKEN');

ws.on('open', () => console.log('Connected!'));
ws.on('error', (e) => console.log('Error:', e.message));
ws.on('close', () => console.log('Closed'));
```

### 步驟 4: 檢查 OpenClaw 日誌

在 Zeabur 控制台查看 OpenClaw 服務的日誌，確認：
- WebSocket 伺服器是否啟動
- 是否有連接錯誤
- 是否有認證錯誤

## 臨時解決方案

如果無法立即修復 WebSocket 連接，可以考慮：

1. **使用 HTTP API 而非 WebSocket**（如果 OpenClaw 支援）
2. **增加超時時間**並提供更好的錯誤訊息
3. **實作重試機制**

## 結論

問題**不是 umio agent 設定**，而是 **bridge 無法連接到 OpenClaw WebSocket**。需要檢查：
1. OpenClaw 的 WebSocket 位址和 port
2. Gateway Token 是否正確
3. Zeabur 內部網路連接
