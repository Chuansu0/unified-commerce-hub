# Andrea Mention 格式修正

## 問題

Andrea 沒有回覆群組訊息，可能原因：

### 1. Username 格式錯誤

測試訊息顯示：`@neovegaandreabot`
正確格式應該是：`@neovegaandrea_bot` (有底線)

### 2. 檢查步驟

1. 在 Telegram 群組中手動測試：
   ```
   @neovegaandrea_bot 你好
   ```
   確認 Andrea 是否回應

2. 檢查 OpenClaw 日誌，看是否收到訊息

3. 確認 Andrea 的群組設定：
   - `requireMention: true` - 需要被 mention 才回應
   - `groupPolicy: "open"` - 允許在群組中運作

### 3. 可能的解決方案

####方案 A：修正 Mention 格式

確保 workflow 中使用正確的 username。

#### 方案 B：使用 Reply 機制

不使用 mention，改用 reply_to_message_id：
1. 先發送一則訊息
2. Andrea 回覆該訊息
3. 使用 message ID 來追蹤對話

#### 方案 C：檢查 OpenClaw 配置

確認 `zeabur_openclaw_config_fixed.json` 中：
```json
{
  "channels": {
    "telegram": {
      "accounts": {
        "andrea": {
          "groupPolicy": "open",
          "groups": {
            "*": {
              "requireMention": true
            }
          }
        }
      }
    }
  }
}
```

### 4. 診斷指令

```bash
# 檢查 Andrea bot 資訊
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getMe"

# 檢查群組訊息
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getUpdates"
```

### 5. 測試建議

先在 Telegram 群組中**手動** mention Andrea：
```
@neovegaandrea_bot 測試
```

如果 Andrea 回應→ workflow mention 格式有問題
如果 Andrea 不回應 → OpenClaw 配置或服務有問題