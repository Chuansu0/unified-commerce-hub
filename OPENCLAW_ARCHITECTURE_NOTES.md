# OpenClaw 技術架構筆記

## 1. 系統架構概觀

OpenClaw 採用 **Host-Client 分離架構**：

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT DEVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  macOS App   │  │  Web UI      │  │  Mobile      │      │
│  │  (Swift)     │  │  (React)     │  │  (React)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                    WebSocket (TLS)
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    OPENCLAW HOST                            │
│  ┌────────────────────────┼──────────────────────────────┐  │
│  │                  Gateway (Deno)                        │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  API Server │  │  WS Server   │  │  CLI Server │  │  │
│  │  │  :3000      │  │  :8080       │  │  :3333      │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Channel Bridges                                │  │  │
│  │  │  • WhatsApp (Baileys)  • Telegram (grammY)      │  │  │
│  │  │  • Discord/Slack       • WebChat (WS API)       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Agent Runtime (pi-mono)                        │  │  │
│  │  │  • LLM Inference  • Tool Execution  • Memory    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 2. WebSocket Wire Protocol

### 2.1 基本格式

**Transport**: WebSocket with JSON text frames

**First Frame**: MUST be `connect` handshake

**Request/Response Pattern**:
```javascript
// Request
{type: "req", id: number, method: string, params: object}

// Response
{type: "res", id: number, ok: boolean, payload?: object, error?: object}
```

**Event Pattern**:
```javascript
{type: "event", event: string, payload: object, seq?: number, stateVersion?: number}
```

### 2.2 Connection Lifecycle

```
Client                  Gateway
  |---- req:connect -------->|
  |      {method:"connect",   |
  |       params:{            |
  |         deviceId,         |
  |         deviceToken?,     |
  |         publicKey?        |
  |       }}                  |
  |                          |
  |<------ res (ok) ---------|
  |      {ok:true,           |
  |       payload:{           |
  |         hello:"ok",       |
  |         presence,         |
  |         health            |
  |       }}                  |
  |                          |
  |<-- event:presence --------|
  |<-- event:tick ------------|
  |                          |
  |---- req:agent ---------->|
  |<----- event:agent --------| (streaming deltas)
  |<------ res:agent ---------| (final: runId, status)
```

## 3. Device Pairing & Trust Model

### 3.1 連接類型

| 類型 | 說明 | 授權方式 |
|------|------|----------|
| Local | loopback/same-host Tailnet | auto-approved |
| Non-local | 遠端連接 | sign challenge + explicit approval |

### 3.2 Trust Model

```
┌──────────────────────────────────────────────────────────────┐
│                     DEVICE AUTH FLOW                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  FIRST CONNECT (Non-local)                                   │
│  ═════════════════════════                                   │
│                                                              │
│  1. Client → connect (with deviceId, publicKey)              │
│                                                              │
│  2. Gateway → connect.challenge (nonce)                      │
│                                                              │
│  3. Client → connect.challenge_response (signed nonce)       │
│     [Gateway verifies signature with publicKey]              │
│                                                              │
│  4. Gateway → device.approve (pending approval)              │
│     [User must approve in CLI: `claw device approve <id>`]   │
│                                                              │
│  5. Gateway → device.token (deviceToken issued)              │
│                                                              │
│  SUBSEQUENT CONNECTS                                         │
│  ═════════════════════                                       │
│                                                              │
│  1. Client → connect (with deviceId, deviceToken)            │
│                                                              │
│  2. Gateway validates deviceToken                            │
│                                                              │
│  3. Connection accepted                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Gateway Auth Token

環境變數 `OPENCLAW_GATEWAY_TOKEN` 適用於所有連接，用於初始驗證。

## 4. The Agent Loop

### 4.1 Message Lifecycle

```
Inbound message → Channel Bridge → Session Resolution → Command Queue → Agent Runtime
```

### 4.2 Session Resolution (dmScope)

| dmScope | 說明 | 使用場景 |
|---------|------|----------|
| `main` | 所有 DM 共享單一 session | 跨設備/頻道連續性 |
| `per-peer` | 按 sender ID 隔離 | 單一用戶多對話 |
| `per-channel-peer` | 按 channel + sender 隔離 | 多用戶場景 (推薦) |

### 4.3 Command Queue (Lane-aware FIFO)

```
┌─────────────────────────────────────┐
│         Global Lane (main)          │
│         maxConcurrent: 4            │
│  ┌─────────────────────────────┐    │
│  │   Session Lane (per key)    │    │
│  │   concurrency: 1 (serial)   │    │
│  │  ┌───────────────────────┐  │    │
│  │  │   Sub-agent Lane      │  │    │
│  │  │   concurrency: 8      │  │    │
│  │  └───────────────────────┘  │    │
│  │  ┌───────────────────────┐  │    │
│  │  │   Cron Lane           │  │    │
│  │  │   (parallel with main)│  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 4.4 Queue Modes

| Mode | 說明 |
|------|------|
| `collect` (default) | 合併佇列訊息為單一 followup turn |
| `steer` | 注入當前 run，取消 pending tool calls |
| `followup` | 等待當前 run 結束，開始新 turn |
| `steer-backlog` | 立即 steer 並保留 for followup |

## 5. HTTP Bridge 整合方案

### 5.1 架構設計

```
┌──────────────────────────────────────────────────────────────────┐
│                        HTTP BRIDGE                               │
│                    (Deployed on Zeabur)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  HTTP Endpoints                                            │ │
│  │  • POST /api/umio/chat → WebSocket → OpenClaw Gateway      │ │
│  │  • POST /api/chat      → WebSocket → OpenClaw Gateway      │ │
│  │  • GET  /health        → Health check                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Client Connection                               │ │
│  │  (Persistent to OpenClaw Gateway)                          │ │
│  │                                                            │ │
│  │  • Device Identity: {deviceId, deviceToken}               │ │
│  │  • Challenge/Response Handling                             │ │
│  │  • Event Streaming (agent deltas)                          │ │
│  │  • Message Routing                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Connection Pool                                           │ │
│  │  (One WebSocket per HTTP request, or persistent?)         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Tailscale (via ngrok/Cloudflare Tunnel)
                              │
                    ┌─────────┴─────────┐
                    │  OpenClaw Gateway │
                    │  (Local Mac)      │
                    └───────────────────┘
```

### 5.2 關鍵問題與解決方案

#### 問題 1：Non-local Connection Approval

**問題**：Bridge 在 Zeabur（雲端），Gateway 在本地 Mac，屬於 Non-local connect，需要 explicit approval。

**解決方案**：
1. 在 Bridge 中處理 `device.approve` 事件
2. 記錄 approval URL 或自動化 approval 流程
3. 或者使用 Tailscale 讓 Zeabur 通過 Tailnet 連接（視為 Local）

#### 問題 2：WebSocket 連接持久化

**問題**：HTTP request 是短連接，但 WebSocket 需要保持連接以接收 streaming response。

**解決方案**：
1. **方案 A**：每個 HTTP request 新建 WebSocket，完成後關閉（簡單但效率低）
2. **方案 B**：維持持久 WebSocket 連接池，HTTP request 複用（複雜但效率高）

#### 問題 3：Gateway 可達性

**問題**：本地 Mac 沒有 public IP，Zeabur 無法直接連接。

**解決方案**：
1. **ngrok**：`ngrok tcp 8080` 轉發 Gateway port
2. **Cloudflare Tunnel**：`cloudflared tunnel --url localhost:8080`
3. **Tailscale Funnel**：`tailscale funnel 8080`

### 5.3 推薦方案

```
┌──────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Zeabur]                    [Tailscale Funnel]        [Mac]    │
│  HTTP Bridge  ←─────────────→  Tailscale  ←──────────→ Gateway  │
│  (Node.js)       WebSocket      (tunnel)      WebSocket         │
│                                                                  │
│  配置：                                                          │
│  • OPENCLAW_GATEWAY_URL=ws://mac-host.tailnet-name.ts.net:8080  │
│  • DEVICE_ID=webchat-bridge-001                                 │
│  • DEVICE_TOKEN=<從第一次配對獲取>                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 6. 實作檢查清單

### 6.1 Gateway 端（本地 Mac）

- [ ] 啟動 OpenClaw Gateway
- [ ] 啟用 Tailscale Funnel：`tailscale funnel 8080`
- [ ] 確認 Gateway URL：`ws://<host>.<tailnet>.ts.net:8080`

### 6.2 Bridge 端（Zeabur）

- [ ] 部署 HTTP Bridge
- [ ] 設定環境變數：
  - `OPENCLAW_GATEWAY_URL`
  - `OPENCLAW_GATEWAY_TOKEN`
  - `DEVICE_ID`
  - `DEVICE_TOKEN`（配對後獲取）
- [ ] 實作 WebSocket 連接邏輯：
  - [ ] Connect handshake
  - [ ] Challenge/Response handling
  - [ ] Device approval handling
  - [ ] Event streaming
- [ ] 實作 HTTP endpoints

### 6.3 配對流程

1. 首次部署 Bridge，不帶 `DEVICE_TOKEN`
2. Bridge 連接 Gateway，觸發 `device.approve`
3. 在本地 Mac 執行：`claw device approve <device-id>`
4. Bridge 接收 `device.token`，保存 `DEVICE_TOKEN`
5. 後續連接使用 `DEVICE_TOKEN` 自動驗證

## 7. 參考資料

- OpenClaw 官方文檔：https://openclaw.io/docs
- Tailscale Funnel：https://tailscale.com/kb/1223/funnel
- WebSocket Protocol：https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
