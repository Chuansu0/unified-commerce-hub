# Hermes Agent - Zeabur 上傳部署指南

> Sherlock 部署在 Zeabur VPS，Carrie 在本地執行

---

## 部署方式

**Zeabur → 建立服務 → 上傳本地文件夾**

---

## 步驟

### 1. 準備部署包

在本地建立部署壓縮檔：

```powershell
cd d:\WSL\unified-commerce-hub
# 複製 hermes-agent 到獨立目錄用於部署
copy-item hermes-agent hermes-zeabur -recurse
# 進入部署目錄
cd hermes-zeabur
# 刪除不需要的檔案
remove-item start-*.ps1
remove-item README.md
remove-item carrie_bot.py
remove-item .git -recurse -force -erroraction silentlycontinue
```

### 2. 壓縮檔案

```powershell
# 壓縮為 zip
Compress-Archive -Path .\* -DestinationPath ..\hermes-zeabur.zip -Force
```

### 3. 上傳到 Zeabur

1. 登入 https://zeabur.com
2. 進入專案
3. 點擊 **「建立服務」**
4. 選擇 **「上傳本地文件夾」**
5. 選擇 `hermes-zeabur.zip` 或解壓後的資料夾
6. 等待建置

### 4. 設定環境變數

在 Zeabur 服務的 Environment Variables 設定：

```
TELEGRAM_BOT_TOKEN=8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg
OPENAI_API_KEY=sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw
OPENAI_API_BASE=https://opencode.ai/zen/go/v1
OPENAI_MODEL=kimi-k2.5
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/sherlock-output
PORT=8080
```

### 5. 設定端口

在 Zeabur 服務設定中：
1. 點擊「Networking」
2. 新增端口：**8080**
3. 類型：**HTTP**
4. 儲存設定

### 6. 啟動服務

點擊「部署」或「重新啟動」

### 7. 驗證 Web UI

部署完成後，Zeabur 會提供一個公開網址：
- `https://hermes-agent-xxxx.zeabur.app` - Web UI 首頁
- `https://hermes-agent-xxxx.zeabur.app/api/status` - API 狀態
- `https://hermes-agent-xxxx.zeabur.app/health` - 健康檢查

可以將此網址設定到 Open Web UI 中進行連接。

---

## 本地 Carrie Bot

在 Home Workstation 啟動 Carrie：

```powershell
cd d:\WSL\unified-commerce-hub\hermes-agent
.\start-carrie.ps1
```

---

## 完整架構

```
用戶 Telegram
    ↓
@neovegasherlock_bot (Zeabur VPS - Sherlock)
    ↓ 分析產出 JSONL
n8n 分流
    ↓
@neovegacarrie_bot (本地 Home Workstation - Carrie)
    ↓ 執行動作
回傳結果
```

---

## 檔案說明

| 檔案 | Zeabur | 本地 |
|------|--------|------|
| `hermes_agent/__main__.py` | ✅ Sherlock | ❌ |
| `carrie_bot.py` | ❌ | ✅ Carrie |
| `Dockerfile` | ✅ | ❌ |
| `requirements.txt` | ✅ | ✅ |
| `start-sherlock.ps1` | ❌ | 啟動用 |
| `start-carrie.ps1` | ❌ | 啟動用 |
