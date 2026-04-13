# Telegram Bot Conflict 錯誤修復

## 錯誤原因

```
Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
```

同一個 Telegram Bot Token (`neovegasherlock_bot`) 被**多個實例**同時使用。

---

## 檢查步驟

### 1. 檢查 Zeabur 重複服務

在 Zeabur 控制台：
1. 查看所有服務列表
2. 檢查是否有**多個** hermes-agent 相關服務
3. 常見情況：
   - `hermes-agent` (新的)
   - `hermes-agent-xxx` (舊的)
   - `sherlock` (舊的)

### 2. 刪除重複服務

**保留最新的 hermes-agent，刪除其他所有使用相同 Bot Token 的服務。**

### 3. 確保只有一個實例運行

| 位置 | 應該運行 | 狀態 |
|------|---------|------|
| Zeabur VPS | Sherlock Bot | ✅ 只保留一個 |
| 本地 | Carrie Bot | ✅ 不同 Token |

---

## 修復步驟

### 立即修復

1. **在 Zeabur 刪除所有 hermes 相關服務**（除了確定要保留的）
2. **等待 30 秒**（讓 Telegram 伺服器釋放連接）
3. **重新部署**最新的 hermes-agent

### 驗證

部署完成後，檢查日誌應該顯示：
```
✅ Sherlock Bot 已啟動
🤖 機器人名稱: neovegasherlock_bot
🌐 Web UI 已啟動: http://0.0.0.0:8080
```

不應該再有 `Conflict` 錯誤。

---

## 預防措施

- **永遠不要**在同一個 Bot Token 上運行多個實例
- 如果需要在多個環境測試，請使用不同的 Bot Token
- Zeabur 部署前，先停止本地測試

---

## 常見問題

### Q: 為什麼會有重複服務？
A: 可能是多次部署、重新命名服務、或測試時建立的臨時服務沒有刪除。

### Q: 刪除後多久可以重新部署？
A: 建議等待 30-60 秒，讓 Telegram 伺服器完全釋放連接。

### Q: 如何確認只有一個實例？
A: 在 Telegram 發送訊息給 @neovegasherlock_bot，應該只收到一個回應。
