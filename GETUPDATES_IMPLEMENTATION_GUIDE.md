# 方案 B：統一使用 getUpdates 模式 - 實施指南

**建立日期：** 2026-03-15  
**狀態：** 準備實施  
**優先級：** 高  
**預估工時：** 2-3 小時

## 方案概述

移除所有 webhook 設定，讓所有 bots（OpenClaw、Andrea、Umio）都使用 getUpdates（輪詢）模式。

**優點：**
- ✅ 實施簡單且風險低
- ✅ 成功率最高
- ✅ 不需要公開的 webhook URL
- ✅ 適合當前架構

## 實施步驟

### 步驟 1：刪除所有 Webhook 設定（15 分鐘）

#### 1.1 刪除 OpenClaw Bot Webhook

```powershell
# 從環境變數或 .env 文件讀取 token
$openclawToken = $env:TELEGRAM_OPENCLAW_BOT_TOKEN

# 刪除 webhook
$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$openclawToken/deleteWebhook" -Method Post

Write-Host "OpenClaw Webhook 刪除結果："
$response | ConvertTo-Json
```

#### 1.2 刪除 Andrea Bot Webhook（如果有設定）

```powershell
$andreaToken = $env:TELEGRAM_ANDREA_BOT_TOKEN

$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$andreaToken/deleteWebhook" -Method Post

Write-Host "Andrea Webhook 刪除結果："
$response | ConvertTo-Json
```

#### 1.3 刪除 Umio Bot Webhook（如果有設定）

```powershell
$umioToken = $env:TELEGRAM_UMIO_BOT_TOKEN

$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$umioToken/deleteWebhook" -Method Post

Write-Host "Umio Webhook 刪除結果："
$response | ConvertTo-Json
```

#### 1.4 驗證 Webhook 已刪除

```powershell
# 檢查 OpenClaw
Invoke-RestMethod -Uri "https://api.telegram.org/bot$openclawToken/getWebhookInfo"

# 預期結果：url 欄位應該是空的
```

### 步驟 2：停用 Webhook Bridge 服務（10 分鐘）

#### 2.1 在 Zeabur Dashboard 停用服務

1. 登入 Zeabur Dashboard
2. 找到 `webhook-bridge` 服務
3. 點擊「暫停」或「停止」按鈕

#### 2.2 或者：保留服務但移除路由

如果想保留服務以備將來使用：
- 移除域名綁定
- 或在 nginx 配置中註解掉相關路由

### 步驟 3：確認所有 Agents 使用 getUpdates（30 分鐘）

#### 3.1 檢查 OpenClaw Agent

確認 OpenClaw 服務使用 `bot.startPolling()` 或類似的輪詢方法。

**檢查清單：**
- [ ] 代碼中有 `startPolling()` 或 `getUpdates` 調用
- [ ] 沒有 webhook 相關的代碼
- [ ] 輪詢間隔設定合理（建議 1-3 秒）

#### 3.2 檢查 Andrea Agent

確認 Andrea 服務正常運行並使用輪詢模式。

#### 3.3 檢查 Umio Agent

確認 Umio 服務正常運行並使用輪詢模式。

### 步驟 4：測試與驗證（30 分鐘）

#### 4.1 測試 OpenClaw Bot

```
1. 在 Telegram 向 OpenClaw bot 發送：/start
2. 發送：你好
3. 確認收到回覆
```

#### 4.2 測試 Andrea Bot

```
1. 在 Telegram 向 Andrea bot 發送：/start
2. 發送測試訊息
3. 確認收到回覆
```

#### 4.3 測試 Umio Bot

```
1. 在 Telegram 向 Umio bot 發送：/start
2. 發送測試訊息
3. 確認收到回覆
```

#### 4.4 測試多 Bot 互動

```
1. 在群組中同時有多個 bots
2. 發送訊息測試互動
3. 確認所有 bots 都能正常接收和回覆
```

---

## 快速執行腳本

建立一個 PowerShell 腳本來自動執行所有步驟：

**檔案：`switch-to-getupdates.ps1`**

```powershell
# 切換到 getUpdates 模式腳本
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  切換到 getUpdates 模式" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 步驟 1：刪除 Webhooks
Write-Host "步驟 1：刪除所有 Webhook 設定..." -ForegroundColor Yellow

$tokens = @{
    "OpenClaw" = $env:TELEGRAM_OPENCLAW_BOT_TOKEN
    "Andrea" = $env:TELEGRAM_ANDREA_BOT_TOKEN
    "Umio" = $env:TELEGRAM_UMIO_BOT_TOKEN
}

foreach ($bot in $tokens.Keys) {
    $token = $tokens[$bot]
    if ($token) {
        Write-Host "  刪除 $bot webhook..." -ForegroundColor Gray
        try {
            $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/deleteWebhook" -Method Post
            if ($response.ok) {
                Write-Host "  ✅ $bot webhook 已刪除" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $bot webhook 刪除失敗：$($response.description)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ❌ $bot 錯誤：$($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️  $bot token 未設定，跳過" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "步驟 2：驗證 Webhook 狀態..." -ForegroundColor Yellow

foreach ($bot in $tokens.Keys) {
    $token = $tokens[$bot]
    if ($token) {
        try {
            $info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method Get
            if ($info.result.url -eq "") {
                Write-Host "  ✅ $bot: 無 webhook（正確）" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $bot: 仍有 webhook - $($info.result.url)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ❌ $bot 檢查失敗" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 在 Zeabur 停用 webhook-bridge 服務" -ForegroundColor White
Write-Host "2. 確認所有 agents 使用 getUpdates 模式" -ForegroundColor White
Write-Host "3. 在 Telegram 測試所有 bots" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
```

**執行方式：**
```powershell
.\switch-to-getupdates.ps1
```

---

## 故障排除

### 問題 1：Webhook 刪除失敗

**症狀：** `deleteWebhook` 返回錯誤

**解決：**
```powershell
# 強制刪除（添加 drop_pending_updates 參數）
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/deleteWebhook?drop_pending_updates=true" -Method Post
```

### 問題 2：Bot 仍然無法接收訊息

**可能原因：**
1. Agent 代碼沒有使用 getUpdates
2. Agent 服務沒有運行
3. Token 配置錯誤

**解決：**
1. 檢查 Zeabur 服務日誌
2. 確認環境變數正確設定
3. 重啟相關服務

### 問題 3：訊息延遲

**症狀：** 回覆很慢

**解決：**
- 調整輪詢間隔（減少到 1 秒）
- 檢查網路連接
- 確認服務器資源充足

---

## 檢查清單

實施前：
- [ ] 備份當前配置
- [ ] 記錄所有 bot tokens
- [ ] 通知團隊成員

實施中：
- [ ] 刪除所有 webhook 設定
- [ ] 驗證 webhook 已刪除
- [ ] 停用 webhook-bridge 服務
- [ ] 確認 agents 使用 getUpdates

實施後：
- [ ] 測試所有 bots 功能
- [ ] 監控系統穩定性 24 小時
- [ ] 更新文檔

---

## 回滾計劃

如果需要回滾到 webhook 模式：

```powershell
# 重新設定 OpenClaw webhook
$token = $env:TELEGRAM_OPENCLAW_BOT_TOKEN
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" `
    -Method Post `
    -Body (@{
        url = "https://webhook-bridge.neovega.cc/webhook/openclaw"
    } | ConvertTo-Json) `
    -ContentType "application/json"

# 重啟 webhook-bridge 服務
# 在 Zeabur Dashboard 啟動服務
```

---

## 總結

方案 B 是最穩妥的選擇：
- ✅ 實施簡單，風險低
- ✅ 不需要修改大量代碼
- ✅ 成功率最高
- ⚠️ 輪詢會有輕微延遲（1-3 秒）

**預估總時間：2-3 小時**

建議在非高峰時段實施，並準備好回滾方案。

---

**文件版本：** 1.0  
**最後更新：** 2026-03-15  
**狀態：** 準備執行


