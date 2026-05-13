const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

code = code.replace(/NPU数量/g, '加速卡数量');

fs.writeFileSync('src/pages/TaskList.tsx', code);
