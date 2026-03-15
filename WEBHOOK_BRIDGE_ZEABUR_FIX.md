# Webhook Bridge Zeabur 部署修正

## 問題分析

從日誌分析：
- ✅ Dockerfile 配置正確
- ✅ 環境變數已設定
- ✅ Caddy 反向代理在運行（port 8080）
- ❌ 所有請求返回 404
- ❌ 沒有看到 Node.js 應用啟動日誌

## 根本原因

**Zeabur 可能沒有正確啟動 Node.js 應用**

可能的原因：
1. Zeabur 檢測到 Dockerfile 但沒有正確執行 CMD
2. Node.js 應用啟動失敗但錯誤被隱藏
3. 端口配置問題

## 解決方案

### 方案 1：修改 Dockerfile 添加調試輸出

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 檢查編譯結果
RUN ls -la dist/

EXPOSE 3003

# 添加調試輸出
CMD echo "Starting Webhook Bridge..." && npm start
```

### 方案 2：使用 node 直接啟動

修改 Dockerfile 的 CMD：

```dockerfile
CMD ["node", "dist/index.js"]
```

而不是：
```dockerfile
CMD ["npm", "start"]
```

### 方案 3：添加健康檢查

在 Dockerfile 中添加：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```


