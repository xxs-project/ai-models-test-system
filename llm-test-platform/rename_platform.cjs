const fs = require('fs');

const filesToUpdate = [
  'src/pages/SystemSettings.tsx',
  'src/pages/Dashboard.tsx',
  'src/components/Layout.tsx',
  'index.html'
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/大模型测试平台/g, '超聚变开源模型测评平台');
    fs.writeFileSync(file, content);
  }
});
