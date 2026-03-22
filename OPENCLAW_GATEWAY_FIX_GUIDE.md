開# OpenClaw Gateway 設定修復指南

## 問題確認

查看設定檔確認：`gateway.mode: "local"` 且 WebSocket 設定存在：

```json
{
  "gateway": {
    "mode": "local",
    "websocket": {
      "allowOrigins": ["https://openclaw.neovega.cc"],
      "allowInsecure": true
    }
  }
}
```

## 修復方案

### 方案：修改 Gateway 設定以啟用網路存取

需要添加 `host` 和 `port` 設定，並將 `mode` 改為 `server`：

```json
{
  "gateway": {
    "mode": "server",
    "host": "0.0.0.0",
    "port": 18789,
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true,
      "insecureSkipVerify": true
    },
    "trustedProxies": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "172.70.0.0/16",
      "104.23.0.0/16",
      "104.21.0.0/16"
    ],
    "websocket": {
      "allowOrigins": [
        "https://openclaw.neovega.cc"
      ],
      "allowInsecure": true
    }
  }
}
```

## 完整修復後的設定檔

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.2",
    "lastTouchedAt": "2026-03-21T10:30:00.000Z"
  },
  "wizard": {
    "lastRunAt": "2026-03-05T00:39:17.138Z",
    "lastRunVersion": "2026.3.2",
    "lastRunCommand": "doctor",
    "lastRunMode": "local"
  },
  "models": {
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.whatai.cc",
        "apiKey": "${ANTHROPIC_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6",
            "api": "anthropic-messages",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "opencode-go": {
        "baseUrl": "https://opencode.ai/zen/go/v1",
        "apiKey": "${ANTHROPIC_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "kimi-k2.5",
            "name": "Kimi K2.5 (OpenCode Go)",
            "api": "openai-completions",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 256000,
            "maxTokens": 8192
          },
          {
            "id": "glm-5",
            "name": "GLM-5 (OpenCode Go)",
            "api": "openai-completions",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 8192
          },
          {
            "id": "minimax-m2.5",
            "name": "MiniMax M2.5 (OpenCode Go)",
            "api": "openai-completions",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 256000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "opencode-go/glm-5"
      },
      "models": {
        "opencode-go/glm-5": {
          "alias": "glm5"
        }
      }
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Main (Default)",
        "model": "opencode-go/glm-5"
      },
      {
        "id": "linus",
        "name": "Linus (Infra Engineer)",
        "workspace": "~/.openclaw/workspace-linus",
        "model": "opencode-go/glm-5"
      },
      {
        "id": "andrea",
        "name": "Andrea (Executive Assistant)",
        "workspace": "~/.openclaw/workspace-andrea",
        "model": "opencode-go/glm-5"
      },
      {
        "id": "umio",
        "name": "Umio (Digital Content Clerk)",
        "workspace": "~/.openclaw/workspace-umio",
        "model": "opencode-go/glm-5"
      }
    ]
  },
  "bindings": [
    {
      "agentId": "linus",
      "match": {
        "channel": "telegram",
        "accountId": "linus"
      }
    },
    {
      "agentId": "andrea",
      "match": {
        "channel": "telegram",
        "accountId": "andrea"
      }
    },
    {
      "agentId": "main",
      "match": {
        "channel": "web"
      }
    }
  ],
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "pairing",
      "groups": {
        "*": {
          "requireMention": true
        }
      },
      "groupPolicy": "allowlist",
      "streaming": "partial",
      "accounts": {
        "linus": {
          "dmPolicy": "open",
          "botToken": "${TELEGRAM_LINUS_BOT_TOKEN}",
          "allowFrom": ["*"],
          "groupAllowFrom": ["*"],
          "groupPolicy": "open",
          "streaming": "partial"
        },
        "andrea": {
          "dmPolicy": "open",
          "botToken": "${TELEGRAM_ANDREA_BOT_TOKEN}",
          "allowFrom": ["*"],
          "groupAllowFrom": ["*"],
          "groupPolicy": "open",
          "streaming": "partial"
        }
      }
    }
  },
  "gateway": {
    "mode": "server",
    "host": "0.0.0.0",
    "port": 18789,
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true,
      "insecureSkipVerify": true
    },
    "trustedProxies": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "172.70.0.0/16",
      "104.23.0.0/16",
      "104.21.0.0/16"
    ],
    "websocket": {
      "allowOrigins": [
        "https://openclaw.neovega.cc"
      ],
      "allowInsecure": true
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      }
    }
  }
}
```

## 修改步驟

### 1. 登入 Zeabur 控制台

前往 [https://dash.zeabur.com](https://dash.zeabur.com)

### 2. 找到 OpenClaw 服務

進入你的 OpenClaw 服務設定頁面

### 3. 修改設定檔

將設定檔內容替換為上方的完整修復版本

### 4. 重新部署

在 Zeabur 控制台重新部署 OpenClaw 服務

### 5. 確認 port 暴露

在 Zeabur 設定中確認：
- Port 18789 已暴露
- 服務間內部網路已啟用

### 6. 更新 Bridge 環境變數

在 `openclaw-http-bridge` 服務設定：

```bash
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<正確的 gateway token>
```

### 7. 重新部署 Bridge

重新部署 bridge 服務

### 8. 測試連接

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Umio!","sessionId":"test-001"}'
```

## 替代方案（如果 server 模式不支援）

如果 OpenClaw 不支援 `server` 模式，可以嘗試：

### 方案 A: 使用 `local` 模式但暴露特定 port

```json
{
  "gateway": {
    "mode": "local",
    "host": "0.0.0.0",
    "port": 18789
  }
}
```

### 方案 B: 合併服務

將 Bridge 和 OpenClaw 合併為單一服務，這樣它們可以共享 localhost。

## 注意事項

1. **備份設定**：修改前請備份原有設定檔
2. **測試模式**：如果不確定，可以先在本地測試修改
3. **檢查日誌**：部署後檢查 OpenClaw 日誌確認 WebSocket 伺服器啟動
4. **安全性**：`allowInsecure: true` 僅用於開發/測試環境
