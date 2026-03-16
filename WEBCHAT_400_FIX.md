# Webchat 400 錯誤修正

## 問題

Webchat 建立 conversation 成功，但建立 message 失敗（400 Bad Request）

## 原因

`umioChat.ts` 中的 `channel` 欄位值與 PocketBase schema 不匹配：

- ❌ 代碼使用：`"webchat"` 和 `"openclaw"`
- ✅ Schema 允許：`"web"` 和 `"telegram"`

## 修正

已將兩處 channel 欄位值修正為 `"web"`：

1. **saveUserMessageEnabled** - 用戶訊息
2. **saveAssistantMessage** - AI 回覆

## 測試

重新啟動 Vite 並測試 webchat：

```bash
npm run dev
```

清除瀏覽器快取後測試發送訊息，應該可以成功儲存到 PocketBase。
