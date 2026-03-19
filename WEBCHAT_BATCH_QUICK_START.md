# Webchat 批次通知 - 10分鐘快速開始

## 步驟 1：更新 PocketBase（2分鐘）

### 1.1 開啟 PocketBase Admin
```
https://www.neovega.cc/pb/_/
```

### 1.2 添加欄位到 messages 集合

1. 登入後，點擊 **Collections** → **messages**
2. 點擊右上角 **編輯圖示** ✏️
3. 滾動到底部，點擊 **+ New field**

**添加欄位 1：**
- Field type: **Bool**
- Name: `sent_to_telegram`
- ✅ 勾選 "Optional"
- Default value: `false`
- 點擊 **Create**

**添加欄位 2：**
- Field type: **Date**
- Name: `sent_at`
- ✅ 勾選 "Optional"
- 點擊 **Create**

4. 點擊右上角 **Save** 儲存集合

✅ **完成！** PocketBase schema 已更新

---

## 步驟 2：匯入 n8n Workflow（3分鐘）

### 2.1 開啟 n8n
```
你的 n8n URL（例如：https://n8n.neovega.cc）
```

### 2.2 匯入 Workflow

1. 點擊右上角 **☰** 選單
2. 選擇 **Import from file**
3. 選擇檔案：`n8n/webchat-batch-notification.json`
4. 點擊 **Import**

### 2.3 配置環境變數

確認 n8n 已設定以下環境變數：

```bash
POCKETBASE_URL=https://www.neovega.cc/pb
TELEGRAM_GROUP_CHAT_ID=-1001234567890  # 你的群組 ID
```

如果沒有，請在 n8n 設定中添加。

### 2.4 配置 Telegram Credentials

1. 點擊 **Send to Telegram** 節點
2. 在 **Credential to connect with** 下拉選單中：
   - 如果已有 Telegram credential，選擇它
   - 如果沒有，點擊 **Create New**，輸入 Bot Token

### 2.5 啟用 Workflow

1. 點擊右上角的 **Inactive** 開關
2. 切換為 **Active** ✅

✅ **完成！** Workflow 已啟用，每 5 分鐘自動執行

---

## 步驟 3：測試（5分鐘）

### 3.1 發送測試訊息

1. 開啟：`https://www.neovega.cc`
2. 點擊右下角聊天圖示
3. 發送：「測試批次通知」

### 3.2 手動執行 Workflow（不等5分鐘）

1. 回到 n8n
2. 開啟 **Webchat Batch Notification** workflow
3. 點擊右上角 **Test workflow** 按鈕
4. 點擊 **Execute workflow**

### 3.3 檢查 Telegram

你的 Telegram 群組應該收到：

```
@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot

📬 新的 Webchat 對話
━━━━━━━━━━━━━━━━

💬 對話 1 (umio-xxx)
👤 測試批次通知
🤖 Message received
```

✅ **成功！** 批次通知已正常運作

---

## 常見問題

### Q: 找不到 TELEGRAM_GROUP_CHAT_ID？

**取得方法：**
1. 將 bot 加入群組
2. 在群組發送訊息
3. 訪問：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 找到 `"chat":{"id":-1001234567890}`

### Q: n8n 執行失敗？

**檢查：**
1. 開啟 **Executions** 查看錯誤訊息
2. 確認 PocketBase URL 正確
3. 確認 Telegram credentials 已配置

### Q: 如何修改時間間隔？

1. 開啟 workflow
2. 點擊 **Every 5 Minutes** 節點
3. 修改 **Minutes Between Triggers**
4. 儲存

---

## 完成！🎉

現在 webchat 訊息會每 5 分鐘批次發送到 Telegram 群組。

**下一步：** 監控幾天，確認運作正常。
