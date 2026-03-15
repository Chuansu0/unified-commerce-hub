# Webhook Bridge 服務診斷指南

## 問題：無法解析網域

**錯誤訊息：** `無法解析遠端名稱: 'webhook-bridge.neovega.cc'`

## 可能原因

1. ❌ 自訂網域尚未配置
2. ❌ DNS 記錄尚未設定
3. ✅ 服務使用 Zeabur 預設網域

## 解決方案

### 方案 1：使用 Zeabur 預設網域（推薦，快速測試）

1. **查找 Zeabur 預設網域**
   - 登入 Zeabur Dashboard
   - 進入 webhook-bridge 服務
   - 點擊 "Networking" 標籤
   - 複製預設網域（格式：`xxx.zeabur.app`）

2. **更新測試腳本**
   ```powershell
   # 使用實際的 Zeabur 網域
   $WEBHOOK_BRIDGE_URL = "https://your-service.zeabur.app"
   
   # 測試健康檢查
   Invoke-WebRequest -Uri "$WEBHOOK_BRIDGE_URL/health"
   ```

### 方案 2：配置自訂網域（生產環境）

#### 步驟 1：在 Zeabur 添加自訂網域

1. 進入 webhook-bridge 服務
2. 點擊 "Networking" → "Add Domain"
3. 輸入：`webhook-bridge.neovega.cc`
4. Zeabur 會提供 CNAME 記錄

#### 步驟 2：設定 DNS 記錄

在您的 DNS 提供商（如 Cloudflare）添加：

```
類型: CNAME
名稱: webhook-bridge
目標: [Zeabur 提供的 CNAME]
```

#### 步驟 3：等待 DNS 傳播

```powershell
# 檢查 DNS 是否生效
nslookup webhook-bridge.neovega.cc
```

## 快速診斷腳本

```powershell
# 檢查服務狀態
Write-Host "=== Webhook Bridge 診斷 ===" -ForegroundColor Cyan

# 1. 檢查 DNS
Write-Host "`n1. DNS 解析檢查..." -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName webhook-bridge.neovega.cc -ErrorAction Stop
    Write-Host "✓ DNS 解析成功: $($dns.IPAddress)" -ForegroundColor Green
} catch {
    Write-Host "✗ DNS 解析失敗" -ForegroundColor Red
    Write-Host "→ 請使用 Zeabur 預設網域進行測試" -ForegroundColor Gray
}

# 2. 提示輸入實際 URL
Write-Host "`n2. 請輸入 Zeabur 預設網域:" -ForegroundColor Yellow
$url = Read-Host "URL (例如: https://xxx.zeabur.app)"

if ($url) {
    try {
        $health = Invoke-RestMethod -Uri "$url/health"
        Write-Host "✓ 服務運行正常: $($health.status)" -ForegroundColor Green
    } catch {
        Write-Host "✗ 服務無法訪問" -ForegroundColor Red
        Write-Host "→ 請檢查 Zeabur 服務是否正在運行" -ForegroundColor Gray
    }
}
```

## 檢查清單

- [ ] 確認 webhook-bridge 服務在 Zeabur 上運行
- [ ] 取得 Zeabur 預設網域
- [ ] 使用預設網域測試健康檢查
- [ ] （可選）配置自訂網域
- [ ] （可選）設定 DNS 記錄
- [ ] 更新所有配置文件中的 URL

## 下一步

1. **立即行動：** 使用 Zeabur 預設網域進行測試
2. **生產部署：** 配置自訂網域 webhook-bridge.neovega.cc
