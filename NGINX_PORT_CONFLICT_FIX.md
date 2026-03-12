# nginx 端口衝突修復指南

**問題**: nginx 無法啟動，端口 8080 被佔用
```
bind() to 0.0.0.0:8080 failed (98: Address in use)
```

---

## 原因

端口 8080 已經被其他進程佔用，可能是：
1. 之前的 nginx 進程還在運行
2. 其他服務佔用了 8080 端口

---

## 解決方案

### 方案 1: 在 Zeabur 中重新部署（推薦）

1. 提交最新的 nginx.conf
2. 在 Zeabur Dashboard 中重新部署服務
3. Zeabur 會自動處理端口衝突

```bash
git add nginx.conf
git commit -m "fix: 更新 nginx 配置"
git push origin main
```

### 方案 2: 在容器中手動修復

如果您在容器的 Terminal 中：

```bash
# 1. 查找佔用 8080 端口的進程
netstat -tulpn | grep 8080
# 或
lsof -i :8080

# 2. 停止該進程
kill <PID>

# 3. 重新啟動 nginx
nginx -s reload
# 或
nginx
```

---

## 重要提示

**不要在容器 Terminal 中手動啟動 nginx**

Zeabur 會自動管理服務啟動。如果您在 Terminal 中手動執行 `nginx`，會導致端口衝突。

---

## 下一步

1. **提交代碼並重新部署**（推薦）
2. 等待 Zeabur 完成部署
3. 測試服務：
```bash
curl https://www.neovega.cc/health
curl https://www.neovega.cc/pb/api/collections
```
