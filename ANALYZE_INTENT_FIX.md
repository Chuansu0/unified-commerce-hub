# Analyze Intent 節點超時問題修復

**日期：** 2026-03-15  
**問題：** Code 節點持續超時（60秒）

## 🔍 根本原因

**亂碼字元導致 JavaScript 解析失敗**

原始代碼中包含亂碼的中文註解：
```javascript
// ?†æ?è¨Šæ�¯?�å??Œé?è¦�ç? agents
// æª¢æŸ¥?¯å�¦?€è¦?Linus
// æª¢æŸ¥?¯å�¦?€è¦?Andrea
```

這些亂碼字元導致 n8n 的 JavaScript 引擎無法正確解析代碼，造成執行超時。

## ✅ 修復內容

1. **移除所有亂碼註解**
2. **保留核心邏輯不變**
3. **確保代碼完全是英文**

修復後的代碼：
```javascript
const message = $input.item.json.message || '';
const conversationId = $input.item.json.conversation_id;

const keywords = {
  linus: ['infrastructure', 'deploy', 'server', 'database', 'technical', 'devops', 'docker', 'kubernetes'],
  andrea: ['executive', 'decision', 'approve', 'strategy', 'business', 'management', 'plan']
};

let agents = [];
let workflowType = 'single';

const messageLower = message.toLowerCase();

const needsLinus = keywords.linus.some(k => messageLower.includes(k));
if (needsLinus) {
  agents.push('linus');
}

const needsAndrea = keywords.andrea.some(k => messageLower.includes(k));
if (needsAndrea) {
  agents.push('andrea');
}

if (agents.length === 2) {
  workflowType = 'sequential';
} else if (agents.length === 0) {
  agents = ['main'];
  workflowType = 'single';
}

return {
  json: {
    message,
    conversation_id: conversationId,
    agents,
    workflowType,
    timestamp: new Date().toISOString()
  }
};
```

## 📝 重新匯入步驟

1. **登入 n8n**
   ```
   https://n8n.neovega.cc
   ```

2. **刪除舊的 Message Router workflow**

3. **匯入修正後的 workflow**
   - 選擇 `n8n/message-router-workflow.json`

4. **發布 workflow**

## 🧪 重新測試

```powershell
.\test-stage2-fixed.ps1
```

## 📊 預期結果

所有測試應該通過：
- ✅ Test 1: Linus agent 路由
- ✅ Test 2: Andrea agent 路由
- ✅ Test 3: Sequential workflow (Linus → Andrea)
- ✅ Test 4: Parallel workflow
