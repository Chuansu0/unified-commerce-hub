# Nginx V11 修復指南

## 問題

WebChat 發送訊息後返回 500 錯誤。

**原因**：`nginx.conf` 中的 `/api/umio/chat` 路由指向 V10 webhook，但 n8n 中使用的是 V11 workflow。

## 修復內容

將 `nginx.conf` 中的：

```nginx
proxy_pass http://$n8n/webhook/umio-chat-v10;
```

改為：

```nginx
proxy_pass http://$n8n/webhook/umio-chat-v11;
```

## 部署步驟

### 1. 確保 n8n V11 Workflow 已啟動

1. 登入 n8n (https://n8n.neovega.cc)
2. 確認 `Webchat Umio Simple V11 (Fixed URL)` workflow 狀態為 **Active**
3. 檢查 webhook 路徑是否為 `umio-chat-v11`

### 2. 部署更新後的 nginx 配置

```bash
# 提交更改
git add nginx.conf
git commit -m "fix: update nginx to use umio-chat-v11 webhook"
git push origin main
```

### 3. Zeabur 重新部署

1. 進入 Zeabur Dashboard
2. 找到 `unified-commerce-hub` 服務
3. 點擊 **Redeploy** 或等待自動部署

### 4. 驗證修復

在 WebChat 中發送訊息給 Umio：

1. ✅ 應該不再出現 500 錯誤
2. ✅ 訊息應該成功發送到 n8n
3. ✅ 幾秒後應該收到 Umio 回覆

## 測試指令

```bash
# 測試 API 端點
curl -X POST https://unified-commerce-hub.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "sessionId": "test-session-123"
  }'
```

## 相關文件

- `UMIO_V11_DEPLOY.md` - V11 Workflow 完整部署指南
- `n8n/webchat-umio-simple-v11.json` - V11 Workflow 檔案
