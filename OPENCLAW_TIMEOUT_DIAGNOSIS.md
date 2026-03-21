# OpenClaw Bridge Timeout 診斷

## 測試結果

```
POST https://openclaw-http-bridge.zeabur.app/api/umio/chat
Body: {"message": "good evening", "sessionId": "umio-1774098194026-tm4qeoq"}
結果: 60秒 Timeout
```

## 問題分析

### Bridge 運作正常
- Bridge 收到 HTTP 請求 ✓
- Bridge 嘗試連接 WebSocket: `ws://openclaw.zeabur.internal:18789` ✓
- Bridge 30秒後 timeout（預期行為）

### OpenClaw 問題
- Bridge 連接 WebSocket 失敗
- 表示 OpenClaw 的 gateway **還是 `local` 模式**
- Port 18789 **沒有監聽**

## 根本原因

你的 `openclaw-backup-20260321.json` 顯示：

```json
"gateway": {
    "mode": "local",  // ← 還是 local！
    "controlUi": { ... },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12"]
}
```

但 `openclaw-with-gateway-server-20260321.json` 已經改為：

```json
"gateway": {
    "mode": "server",
    "host": "0.0.0.0",
    "port": 18789,
    ...
}
```

**設定檔還沒部署到 Zeabur！**

## 解決步驟

### 1. 在 Zeabur 控制台更新設定

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 進入 OpenClaw 服務
3. 找到「Config」或「Environment」設定
4. 將設定檔內容替換為 `openclaw-with-gateway-server-20260321.json`

### 2. 確認 Port 暴露

在 Zeabur 網路設定中：
- 確認 port `18789` 已添加到暴露端口列表
- 服務名稱應該是 `openclaw`

### 3. 重新部署

1. 重新部署 OpenClaw 服務
2. 等待服務啟動（約 30-60 秒）
3. 重新部署 bridge 服務（讓它重新連接）

### 4. 驗證

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test-123"}'
```

應該在 5-10 秒內返回回應，而不是 timeout。

## 如果還是失敗

檢查 OpenClaw 日誌：
```
zeabur service logs openclaw
```

確認：
1. Gateway 啟動訊息："Gateway server listening on 0.0.0.0:18789"
2. 沒有錯誤訊息
3. WebSocket 連接受理

## 回滾

如果出問題，使用備份恢復：
```
openclaw-backup-20260321.json
```
