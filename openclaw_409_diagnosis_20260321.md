# OpenClaw HTTP Bridge 409/Timeout 問題診斷

## 問題描述

Call OpenClaw Bridge 節點出現 timeout 錯誤：
- Error: `ECONNABORTED`
- Message: `timeout of 60000ms exceeded`

## 測試結果

1. ✅ **Health Endpoint 正常**
   - `GET https://openclaw-http-bridge.zeabur.app/health` → 200 OK

2. ❌ **Umio Chat Endpoint Timeout**
   - `POST https://openclaw-http-bridge.zeabur.app/api/umio/chat` → socket hang up / timeout

## 根本原因

**OpenClaw 設定檔中缺少 "umio" agent！**

查看 `zeabur_openclaw_config_fixed.json`：
```json
"agents": {
    "list": [
        { "id": "main", ... },
        { "id": "linus", ... },
        { "id": "andrea", ... }
    ]
}
```

bridge 程式碼發送：
```javascript
params: {
    agentId: 'umio',  // ← 這個 agent 不存在！
    message,
    context: {...}
}
```

當 OpenClaw 收到未知的 agentId 時，可能無法正確處理，導致 WebSocket 連接掛起。

## 解決方案

### 方案 1: 新增 umio agent 到 OpenClaw config（推薦）

在 `zeabur_openclaw_config_fixed.json` 的 agents.list 中加入：

```json
{
    "id": "umio",
    "name": "Umio (Digital Content Clerk)",
    "workspace": "~/.openclaw/workspace-umio",
    "model": "opencode-go/glm-5"
}
```

### 方案 2: 修改 bridge 使用現有 agent

修改 `openclaw-http-bridge/index.js`：

```javascript
// 將 agentId: 'umio' 改為使用 main
params: {
    agentId: 'main',  // 或者 'andrea' 等現有 agent
    message,
    context: {
        sessionId,
        platform: 'webchat',
        agent: 'umio',  // context 中仍保留 umio 標識
        role: 'digital_content_clerk'
    }
}
```

### 方案 3: 修改 bindings 讓 main agent 處理 web 請求

已經有這個 binding：
```json
{
    "agentId": "main",
    "match": {
        "channel": "web"
    }
}
```

但需要確保 OpenClaw Gateway 正確處理來自 bridge 的 WebSocket 請求。

## 建議立即執行

1. 先測試 bridge 使用 `agentId: 'main'` 是否能正常工作
2. 如果可以，先暫時修改 bridge 程式碼
3. 同時準備新增 umio agent 到 config

## 測試命令

```bash
# 測試 bridge（使用 Node.js）
node -e "
const https = require('https');
const data = JSON.stringify({message: 'test', sessionId: 'test-session'});
const req = https.request({
    hostname: 'openclaw-http-bridge.zeabur.app',
    path: '/api/umio/chat',
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Content-Length': data.length},
    timeout: 10000
}, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});
req.on('error', e => console.log('Error:', e.message));
req.write(data);
req.end();
"
```
