# Webhook Bridge 啟動問題診斷

## 問題分析

從日誌可以看出：
- ✅ Caddy 反向代理正在運行（port 8080）
- ✅ 環境變數已正確設定
- ❌ 所有請求返回 404
- ❌ **Node.js 應用沒有啟動**

## 根本原因

Caddy 正在運行，但後端 Node.js 服務沒有啟動。可能原因：

1. TypeScript 編譯失敗
2. Node.js 啟動時出錯
3. 依賴安裝問題
4. PORT 配置不匹配

## 診斷步驟

### 步驟 1：查看完整建置日誌

在 Zeabur Dashboard：
1. 進入 webhook-bridge 服務
2. 點擊 "Logs" 標籤
3. **向上滾動查看建置階段日誌**
4. 尋找以下關鍵訊息：

**成功的建置應該顯示：**
```
> npm run build
> tsc

Build completed successfully
```

**失敗的建置可能顯示：**
```
error TS2xxx: ...
npm ERR! code ELIFECYCLE
```

### 步驟 2：查看啟動日誌

尋找 Node.js 應用的啟動訊息：

**成功啟動應該顯示：**
```
> npm start
> node dist/index.js

Webhook Bridge listening on port 3003
```

**如果沒有看到這些訊息，表示應用沒有啟動。**

### 步驟 3：檢查常見問題

#### 問題 A：PORT 配置

Node.js 應該監聽 port 3003，但可能：
- 環境變數 PORT 未設定
- 或設定錯誤

**解決：** 在 Zeabur 環境變數中確認：
```
PORT=3003
```

#### 問題 B：啟動命令錯誤

檢查 package.json 的 start script：
```json
"start": "node dist/index.js"
```

#### 問題 C：TypeScript 編譯失敗

如果 `dist/index.js` 不存在，Node.js 無法啟動。

## 快速修復方案

### 方案 1：添加啟動日誌

修改 `webhook-bridge/src/index.ts`，在啟動時輸出日誌：

```typescript
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`✅ Webhook Bridge listening on port ${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
```

### 方案 2：檢查 Zeabur 配置

確認 `webhook-bridge/zbpack.json`：

```json
{
  "build_command": "npm run build",
  "start_command": "npm start",
  "install_command": "npm install"
}
```

### 方案 3：本地測試

在本地驗證服務可以正常啟動：

```powershell
cd webhook-bridge
npm install
npm run build
npm start
```

如果本地可以啟動，問題在 Zeabur 配置。

## 臨時解決方案

如果 Zeabur 部署持續失敗，可以：

1. **使用 Dockerfile 部署**（更可控）
2. **檢查 Zeabur 服務日誌**找出具體錯誤
3. **聯繫 Zeabur 支援**

## 下一步

1. 查看完整建置日誌
2. 找出具體錯誤訊息
3. 根據錯誤訊息修正
4. 重新部署並驗證

---
建立時間：2026-03-15
狀態：診斷中

