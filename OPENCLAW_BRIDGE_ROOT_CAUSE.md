# OpenClaw Bridge 根本問題分析

## 關鍵發現

你提到 OpenClaw 的 `gateway.mode: 'local'` - **這就是問題所在！**

## 問題解釋

### OpenClaw Gateway 模式

```json
{
  "gateway": {
    "mode": "local",  // ← 問題在這裡！
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
```

### Bridge 嘗試連接

```javascript
const OPENCLAW_WS = 'ws://openclaw.zeabur.internal:18789';
// 嘗試連接到內部網路位址
```

## 問題所在

當 `gateway.mode: 'local'` 時：
- OpenClaw WebSocket 伺服器**只在 localhost 監聽**
- **不會**在內部網路 (zeabur.internal) 暴露
- Bridge 無法從另一個服務連接到它

## 解決方案

### 方案 1: 將 OpenClaw 改為網路模式（推薦）

修改 OpenClaw 設定，將 `gateway.mode` 改為支援網路存取：

```json
{
  "gateway": {
    "mode": "network",  // 或 "server"
    "host": "0.0.0.0",
    "port": 18789
  }
}
```

**注意**：需要確認 OpenClaw 支援哪些模式。根據設定檔，目前的 `local` 模式顯然不允許外部連接。

### 方案 2: 合併服務

將 OpenClaw 和 Bridge 合併為單一服務，這樣它們可以共享 localhost。

### 方案 3: 使用 Zeabur 內部連接方式

檢查 Zeabur 的文件，確認如何在服務間正確連接：

```javascript
// 可能需要使用不同的 URL 格式
const OPENCLAW_WS = 'ws://openclaw:18789';  // 去掉 .zeabur.internal
// 或
const OPENCLAW_WS = 'ws://openclaw-service:18789';
```

### 方案 4: 修改 OpenClaw 設定暴露 WebSocket

在 OpenClaw 設定中添加網路綁定：

```json
{
  "gateway": {
    "mode": "local",
    "bind": "0.0.0.0:18789"  // 明確綁定到所有介面
  }
}
```

## 立即測試

### 測試 1: 檢查 OpenClaw port 監聽

在 Zeabur 的 OpenClaw 服務中執行：

```bash
# 查看監聽的 port
netstat -tlnp | grep 18789
# 或
ss -tlnp | grep 18789
```

如果只看到 `127.0.0.1:18789`，那就是問題所在。

### 測試 2: 從 bridge 測試連接

在 bridge 服務中執行：

```bash
# 測試是否可以連接到 openclaw
nc -zv openclaw.zeabur.internal 18789
# 或
telnet openclaw.zeabur.internal 18789
```

### 測試 3: 使用 Zeabur Console

在 Zeabur 控制台中，通常可以查看：
1. 服務的網路設定
2. 內部 DNS 名稱
3. 暴露的 ports

## 正確修復步驟

1. **確認 OpenClaw WebSocket 監聽位址**：
   ```bash
   # 在 OpenClaw 容器中
   netstat -an | grep 18789
   ```

2. **如果是 127.0.0.1:18789**：
   - 需要修改 OpenClaw 設定，改為 `0.0.0.0:18789`
   - 或修改 `gateway.mode` 為支援網路的模式

3. **重新部署 OpenClaw**：
   - 在 Zeabur 控制台重新部署

4. **測試連接**：
   ```bash
   # 從 bridge 服務測試
   nc -zv openclaw.zeabur.internal 18789
   ```

## 結論

**根本原因**：OpenClaw 的 `gateway.mode: 'local'` 導致 WebSocket 只在 localhost 監聽，其他服務無法連接。

**解決方法**：需要修改 OpenClaw 設定，讓 WebSocket 監聽在所有網路介面（0.0.0.0）或改用支援網路連接的模式。
