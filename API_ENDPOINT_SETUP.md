# WebChat Reply API 端點設定

## 需要實作的端點

`POST /api/chat/reply`

接收 Andrea 的回覆並儲存，供 WebChat 前端輪詢。

## 實作方式

### 選項A：使用現有的 Express 後端

如果你的 unified-commerce-hub 有Express server，新增路由：

```typescript
// 在你的 Express app 中
import { handleAndreaReply } from './src/api/andrea-reply';

app.post('/api/chat/reply', async (req, res) => {const response = await handleAndreaReply(req);
    const data = await response.json();
    res.status(response.status).json(data);
});
```

### 選項 B：使用 Vite API 路由

如果使用 Vite，在 `vite.config.ts` 中新增：

```typescript
export default defineConfig({
    server: {
        proxy: {
            '/api/chat/reply': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    }
});
```

然後建立獨立的 API server。

### 選項 C：最簡單 - 直接使用 n8n Webhook

**不需要實作後端 API**，直接讓 Andrea Reply workflow呼叫另一個 n8n webhook：

1. 建立新的 n8n workflow: "Store Andrea Reply"
2. Webhook path: `andrea-reply-store`
3. 儲存到資料庫或記憶體
4. WebChat 前端輪詢這個 webhook

## 推薦方案：選項 C (n8n Webhook)

最簡單且不需要修改後端程式碼。

### 步驟

1. 在 n8n 建立 "Store Andrea Reply" workflow
2. 更新 `andrea-group-reply-workflow.json` 的 URL 為：
   ```
   https://n8n.neovega.cc/webhook/andrea-reply-store
   ```
3. WebChat 前端呼叫：
   ```
   https://n8n.neovega.cc/webhook/get-reply?sessionId=xxx
   ```

這樣完全不需要修改 unified-commerce-hub 的程式碼。