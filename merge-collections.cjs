const fs = require('fs');

// 讀取兩個 JSON 檔案
const conversationsAndMessages = JSON.parse(
    fs.readFileSync('pocketbase/conversations_and_messages.json', 'utf8')
);

const remainingCollections = JSON.parse(
    fs.readFileSync('pocketbase/remaining_collections.json', 'utf8')
);

// 合併：按照相依性順序排列
// 1. users (auth) - 其他集合依賴它
// 2. conversations - messages 依賴它
// 3. messages - 依賴 conversations
// 4. products - 獨立
// 5. orders - 依賴 users
// 6. members - 依賴 users

const users = remainingCollections.find(c => c.name === 'users');
const conversations = conversationsAndMessages.find(c => c.name === 'conversations');
const messages = conversationsAndMessages.find(c => c.name === 'messages');
const products = remainingCollections.find(c => c.name === 'products');
const orders = remainingCollections.find(c => c.name === 'orders');
const members = remainingCollections.find(c => c.name === 'members');

const merged = [users, conversations, messages, products, orders, members].filter(Boolean);

// 寫入合併後的檔案
fs.writeFileSync(
    'pocketbase/all_collections.json',
    JSON.stringify(merged, null, 4),
    'utf8'
);

console.log('✅ 已成功合併兩個 JSON 檔案');
console.log('✅ 輸出檔案: pocketbase/all_collections.json');
console.log(`✅ 總共 ${merged.length} 個集合：`);
merged.forEach(c => console.log(`   - ${c.name} (${c.type})`));
