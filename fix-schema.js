const fs = require('fs');

// 讀取 schema.json
const schema = fs.readFileSync('pocketbase/schema.json', 'utf8');

// 替換所有 autodate 為 date
const fixed = schema.replace(/"autodate"/g, '"date"');

// 寫入新檔案
fs.writeFileSync('pocketbase/schema_date_fixed.json', fixed, 'utf8');

console.log('✅ 已將所有 autodate 替換成 date');
console.log('✅ 輸出檔案: pocketbase/schema_date_fixed.json');
