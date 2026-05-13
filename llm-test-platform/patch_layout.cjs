const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Add LayoutDashboard to imports
code = code.replace(/Home,/g, 'Home, LayoutDashboard,');

// Insert new navigation item
const targetLine = `{ name: '仪表板', href: '/', icon: Home },`;
const newLine = `{ name: '看板', href: '/board', icon: LayoutDashboard },`;
code = code.replace(targetLine, `${targetLine}\n  ${newLine}`);

fs.writeFileSync('src/components/Layout.tsx', code);
