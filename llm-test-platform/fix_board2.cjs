const fs = require('fs');
let code = fs.readFileSync('src/pages/Board.tsx', 'utf8');
code = code.replace(/\\\`/g, '`');
fs.writeFileSync('src/pages/Board.tsx', code);
