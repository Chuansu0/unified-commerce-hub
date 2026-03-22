# Webhook-Tailscale-Bridge 整合實作計劃

## 1. 目標

建立從 Zeabur Webhook Bridge 到本地 OpenClaw Gateway 的穩定連接，解決 Non-local Connection 的 device approval 問題。

## 2. 系統架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                    整合架構總覽                                      │
└─────────────────────────────────────────────────────────────────────┘

  [Zeabur Cloud]                    [Internet]              [Local Mac]
  ═══════════════                   ═══════════             ═══════════

  ┌──────────────┐                 ┌──────────────┐       ┌──────────────┐
  │  Webhook     │                 │  Tailscale   │       │  OpenClaw    │
  │  Bridge      │◄───────────────►│  Funnel      │◄─────►│  Gateway     │
  │  (Node.js)   │   WebSocket     │  (TLS)       │       │  (Deno)      │
  └──────────────┘                 └──────────────┘       └──────────────┘
        │
        │ HTTP
        │
  ┌──────────────┐
  │  Frontend    │
  │  (ChatWidget)│
  └──────────────┘
```

## 3. 實作步驟

### Phase 1: 本地 Gateway 設置

#### 1.1 啟動 Tailscale Funnel

在本地 Mac 終端機執行：

```bash
# 確認 Tailscale 已登入
tailscale status

# 啟動 Funnel 轉發 Gateway WebSocket 端口 (8080)
tailscale funnel --bg 8080

# 確認 Funnel 狀態
tailscale funnel status

# 取得 Funnel URL (格式: https://<machine-name>.<tailnet-name>.ts.net)
# 例如: https://macbook-pro.chuan-su0.ts.net
```

**環境變數設定**：
```bash
# 將 Funnel URL 設定為環境變數
export OPENCLAW_GATEWAY_URL="wss://macbook-pro.chuan-su0.ts.net:443"
export OPENCLAW_GATEWAY_TOKEN="your-gateway-token"
export DEVICE_ID="webchat-bridge-001"
```

#### 1.2 確認 Gateway 運行狀態

```bash
# 檢查 Gateway 是否在端口 8080 運行
lsof -i :8080

# 測試本地連接
curl http://localhost:8080/health

# 測試通過 Funnel 連接
curl https://macbook-pro.chuan-su0.ts.net/health
```

### Phase 2: Bridge 代碼更新

#### 2.1 添加 ECDSA 簽名支援

修改 `openclaw-http-bridge/index.js`：

```javascript
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Device 密鑰管理
class DeviceKeyManager {
  constructor(deviceId, keysDir = './keys') {
    this.deviceId = deviceId;
    this.keysDir = keysDir;
    this.keyPair = null;
    this.deviceToken = null;
    this.ensureKeysDir();
  }

  ensureKeysDir() {
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }
  }

  getKeyPath() {
    return path.join(this.keysDir, `${this.deviceId}.json`);
  }

  // 生成或載入密鑰對
  async initialize() {
    const keyPath = this.getKeyPath();
    
    if (fs.existsSync(keyPath)) {
      // 載入現有密鑰
      const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      this.keyPair = {
        publicKey: data.publicKey,
        privateKey: data.privateKey
      };
      this.deviceToken = data.deviceToken || null;
      console.log(`[DeviceKeyManager] 已載入 device keys: ${this.deviceId}`);
    } else {
      // 生成新密鑰對
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      this.keyPair = { publicKey, privateKey };
      await this.saveKeys();
      console.log(`[DeviceKeyManager] 已生成新 device keys: ${this.deviceId}`);
    }
  }

  // 保存密鑰
  async saveKeys() {
    const data = {
      deviceId: this.deviceId,
      publicKey: this.keyPair.publicKey,
      privateKey: this.keyPair.privateKey,
      deviceToken: this.deviceToken,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(this.getKeyPath(), JSON.stringify(data, null, 2));
  }

  // 更新 device token
  async setDeviceToken(token) {
    this.deviceToken = token;
    await this.saveKeys();
    console.log(`[DeviceKeyManager] Device token 已保存`);
  }

  // 簽名 challenge
  signChallenge(nonce) {
    const signer = crypto.createSign('SHA256');
    signer.update(nonce);
    return signer.sign(this.keyPair.privateKey, 'base64');
  }

  // 取得 base64 編碼的公鑰
  getPublicKeyBase64() {
    // 移除 PEM 頭尾標記，只保留 base64 內容
    return this.keyPair.publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
  }

  hasDeviceToken() {
    return !!this.deviceToken;
  }
}
```

#### 2.2 更新 WebSocket 連接邏輯

```javascript
class OpenClawBridge {
  constructor(config) {
    this.config = config;
    this.deviceManager = new DeviceKeyManager(config.deviceId);
    this.ws = null;
    this.pendingApprovals = new Map();
  }

  async initialize() {
    await this.deviceManager.initialize();
  }

  async connect() {
    return new Promise(async (resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl();
      console.log(`[OpenClawBridge] 連接到: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[OpenClawBridge] WebSocket 已連接');
        this.sendConnectRequest();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data), resolve, reject);
      });

      this.ws.on('error', (error) => {
        console.error('[OpenClawBridge] WebSocket 錯誤:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[OpenClawBridge] WebSocket 已關閉');
      });
    });
  }

  buildWebSocketUrl() {
    const baseUrl = this.config.gatewayUrl.replace('https://', 'wss://');
    const params = new URLSearchParams();
    params.append('deviceId', this.config.deviceId);
    
    if (this.deviceManager.hasDeviceToken()) {
      params.append('deviceToken', this.deviceManager.deviceToken);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  sendConnectRequest() {
    // 如果有 device token，不需要發送額外的 connect 請求
    if (this.deviceManager.hasDeviceToken()) {
      console.log('[OpenClawBridge] 使用 device token 連接');
      return;
    }

    // 首次連接：發送 connect 請求帶上公鑰
    const connectReq = {
      type: 'req',
      id: 1,
      method: 'connect',
      params: {
        deviceId: this.config.deviceId,
        publicKey: this.deviceManager.getPublicKeyBase64()
      }
    };

    console.log('[OpenClawBridge] 發送 connect 請求');
    this.ws.send(JSON.stringify(connectReq));
  }

  handleMessage(message, resolve, reject) {
    console.log('[OpenClawBridge] 收到訊息:', message.type);

    switch (message.type) {
      case 'res':
        this.handleResponse(message, resolve, reject);
        break;
      case 'event':
        this.handleEvent(message);
        break;
    }
  }

  handleResponse(message, resolve, reject) {
    if (message.id === 1) { // connect response
      if (message.ok) {
        console.log('[OpenClawBridge] Connect 成功:', message.payload);
        resolve(message.payload);
      } else {
        console.error('[OpenClawBridge] Connect 失敗:', message.error);
        reject(message.error);
      }
    }
  }

  handleEvent(event) {
    switch (event.event) {
      case 'connect.challenge':
        this.handleChallenge(event.payload);
        break;
      case 'device.approve':
        this.handleDeviceApprove(event.payload);
        break;
      case 'device.token':
        this.handleDeviceToken(event.payload);
        break;
    }
  }

  // 處理 challenge nonce
  handleChallenge(payload) {
    console.log('[OpenClawBridge] 收到 challenge');
    const { nonce } = payload;
    const signature = this.deviceManager.signChallenge(nonce);

    const response = {
      type: 'req',
      id: Date.now(),
      method: 'connect.challenge_response',
      params: { signature }
    };

    console.log('[OpenClawBridge] 發送 challenge response');
    this.ws.send(JSON.stringify(response));
  }

  // 處理 device approval 請求
  handleDeviceApprove(payload) {
    const { deviceId, approvalUrl } = payload;
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  DEVICE APPROVAL REQUIRED                          ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Device ID: ${deviceId.padEnd(46)}║`);
    console.log('║                                                        ║');
    console.log('║  請在本地 Mac 執行以下命令:                             ║');
    console.log(`║  $ claw device approve ${deviceId.padEnd(29)}║`);
    console.log('║                                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    this.pendingApprovals.set(deviceId, payload);
  }

  // 處理 device token
  async handleDeviceToken(payload) {
    const { token, deviceId } = payload;
    console.log(`[OpenClawBridge] 收到 device token for: ${deviceId}`);
    await this.deviceManager.setDeviceToken(token);
    console.log('[OpenClawBridge] Device token 已保存，後續連接將自動使用');
  }

  // 發送訊息給 OpenClaw Agent
  async sendMessage(channelId, message, options = {}) {
    const req = {
      type: 'req',
      id: Date.now(),
      method: 'message.send',
      params: {
        channelId,
        message,
        ...options
      }
    };

    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(req));
      
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 30000);

      const handler = (data) => {
        const response = JSON.parse(data);
        if (response.type === 'res' && response.id === req.id) {
          clearTimeout(timeout);
          this.ws.off('message', handler);
          response.ok ? resolve(response.payload) : reject(response.error);
        }
      };

      this.ws.on('message', handler);
    });
  }
}
```

#### 2.3 更新 HTTP Bridge 端點

```javascript
const express = require('express');
const OpenClawBridge = require('./openclaw-bridge');

const app = express();
app.use(express.json());

// 全局 Bridge 實例
let bridge = null;

// 初始化 Bridge
async function initializeBridge() {
  const config = {
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL,
    gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN,
    deviceId: process.env.DEVICE_ID || 'webchat-bridge-001'
  };

  if (!config.gatewayUrl) {
    console.error('❌ 缺少 OPENCLAW_GATEWAY_URL 環境變數');
    return false;
  }

  bridge = new OpenClawBridge(config);
  await bridge.initialize();

  try {
    await bridge.connect();
    console.log('✅ OpenClaw Bridge 連接成功');
    return true;
  } catch (error) {
    console.error('❌ OpenClaw Bridge 連接失敗:', error);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  const status = {
    status: bridge && bridge.ws && bridge.ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    deviceId: process.env.DEVICE_ID
  };
  res.json(status);
});

// 發送訊息端點
app.post('/api/umio/chat', async (req, res) => {
  try {
    const { message, channelId = 'webchat' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    if (!bridge || !bridge.ws || bridge.ws.readyState !== WebSocket.OPEN) {
      return res.status(503).json({ error: 'Bridge not connected' });
    }

    const result = await bridge.sendMessage(channelId, message);
    res.json({ success: true, result });
  } catch (error) {
    console.error('發送訊息失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`🚀 Bridge server running on port ${PORT}`);
  await initializeBridge();
});
```

### Phase 3: 部署流程

#### 3.1 本地準備

```bash
# 1. 確保 Gateway 運行
claw gateway --daemon

# 2. 啟動 Tailscale Funnel
tailscale funnel --bg 8080

# 3. 取得 Funnel URL
TAILSCALE_URL=$(tailscale status --json | jq -r '.Self.DNSName')
echo "Funnel URL: https://${TAILSCALE_URL}"
```

#### 3.2 Zeabur 部署

```bash
# 1. 設定環境變數 (在 Zeabur Dashboard)
OPENCLAW_GATEWAY_URL=wss://your-machine.tailnet-name.ts.net
OPENCLAW_GATEWAY_TOKEN=your-token
DEVICE_ID=webchat-bridge-001
PORT=8080

# 2. 部署
git add .
git commit -m "feat: Add device approval flow with ECDSA signing"
git push origin main
```

#### 3.3 首次配對流程

```
1. Bridge 首次連接到 Gateway
2. Gateway 發送 connect.challenge
3. Bridge 回應 challenge_response (簽名)
4. Gateway 發送 device.approve (pending approval)
5. ⚠️ 在本地 Mac 執行: claw device approve webchat-bridge-001
6. Gateway 發送 device.token
7. Bridge 保存 device token
8. 後續連接自動使用 device token
```

### Phase 4: 測試驗證

#### 4.1 健康檢查

```bash
# 測試 Bridge health
curl https://your-bridge.zeabur.app/health

# 預期輸出
{
  "status": "connected",
  "timestamp": "2026-03-22T12:00:00.000Z",
  "deviceId": "webchat-bridge-001"
}
```

#### 4.2 發送測試訊息

```bash
curl -X POST https://your-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from webhook bridge!",
    "channelId": "test-channel"
  }'
```

## 4. 故障排除

### 4.1 Tailscale Funnel 問題

```bash
# 檢查 Funnel 狀態
tailscale funnel status

# 重新啟動 Funnel
tailscale funnel down
tailscale funnel --bg 8080

# 檢查 Tailscale 連接
tailscale status
tailscale ping <machine-name>
```

### 4.2 Device Approval 問題

```bash
# 查看待批准的 devices
claw device list --pending

# 批准 device
claw device approve <device-id>

# 拒絕 device
claw device reject <device-id>

# 刪除 device
claw device remove <device-id>
```

### 4.3 Bridge 連接問題

```bash
# 檢查 Bridge 日誌
zeabur logs --service webhook-bridge

# 刪除 keys 重新配對
rm -rf openclaw-http-bridge/keys/
git push origin main
```

## 5. 安全考量

1. **密鑰管理**：Device keys 保存在 Bridge 本地文件系統，不會外洩
2. **TLS 加密**：Tailscale Funnel 提供端到端 TLS 加密
3. **Token 自動更新**：Device token 自動保存並用於後續連接
4. **環境變數保護**：敏感資訊通過 Zeabur 環境變數管理

## 6. 檔案結構

```
openclaw-http-bridge/
├── index.js                 # 更新後的 HTTP Bridge
├── openclaw-bridge.js       # OpenClaw Bridge 類別
├── device-key-manager.js    # Device 密鑰管理
├── keys/                    # Device keys 存儲 (gitignore)
├── package.json
└── DEPLOY.md
```

## 7. 時間預估

| Phase | 預估時間 |
|-------|----------|
| Phase 1: Gateway 設置 | 10 分鐘 |
| Phase 2: Bridge 代碼更新 | 30 分鐘 |
| Phase 3: 部署流程 | 10 分鐘 |
| Phase 4: 測試驗證 | 10 分鐘 |
| **總計** | **約 60 分鐘** |

## 8. 下一步行動

1. [ ] 在本地 Mac 啟動 Tailscale Funnel
2. [ ] 更新 Bridge 代碼添加 ECDSA 簽名支援
3. [ ] 部署到 Zeabur
4. [ ] 執行首次配對流程
5. [ ] 測試驗證連接

---

**文檔建立時間**: 2026-03-22  
**最後更新**: 2026-03-22
