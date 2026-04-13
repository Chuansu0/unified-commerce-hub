# SSL Handshake Failed (Error 525) 修復指南

## 問題原因

Cloudflare (hermes.neovega.cc) 無法與 Zeabur 後端建立 SSL 連線，通常因為：

1. **服務沒有正確運行**
2. **服務崩潰或無回應**
3. **端口沒有正確綁定到 0.0.0.0**

---

## 修復步驟

### 1. 檢查 Zeabur 日誌

在 Zeabur 控制台：
1. 進入 hermes-agent 服務
2. 點擊 "Logs"
3. 查看是否有錯誤訊息

### 2. 確認服務綁定設定

確保 Web Server 綁定到 `0.0.0.0` 而不是 `127.0.0.1`：

```python
# hermes_agent/__main__.py 中的正確設定
site = web.TCPSite(runner, '0.0.0.0', WEB_PORT)  # ✅ 正確
# site = web.TCPSite(runner, '127.0.0.1', WEB_PORT)  # ❌ 錯誤
```

### 3. 確認 Dockerfile 暴露端口

```dockerfile
EXPOSE 8080
ENV PORT=8080
```

### 4. 確認 Zeabur 端口設定

在 Zeabur：
- Networking → 端口 8080 → Type: HTTP
- 確保公開 URL 指向正確服務

---

## 快速測試

### 測試 1: 直接使用 Zeabur 域名

不要使用 hermes.neovega.cc，改用 Zeabur 提供的預設域名：
```
https://hermes-agent-xxxx.zeabur.app
```

### 測試 2: 檢查健康檢查端點

```bash
curl https://hermes-agent-xxxx.zeabur.app/health
```

應該回傳：`OK`

### 測試 3: 檢查服務狀態

```bash
curl https://hermes-agent-xxxx.zeabur.app/api/status
```

---

## 常見錯誤與解決

### 錯誤 1: "Address already in use"

**解決**: 更改端口為 3000 或 8000

### 錯誤 2: "Module not found"

**解決**: 確認 requirements.txt 包含所有依賴

### 錯誤 3: Telegram Bot Token 錯誤

**解決**: 檢查環境變數是否正確設定

---

## 重建服務

如果以上都無效，請重建服務：

1. 在 Zeabur 刪除 hermes-agent 服務
2. 重新上傳 `hermes-zeabur-v2.zip`
3. 重新設定環境變數
4. 重新設定端口 8080
5. 等待部署完成

---

## 聯絡 Zeabur 支援

如果問題持續，請在 Zeabur Discord 詢問：
https://discord.gg/zeabur
