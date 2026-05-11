const fs = require('fs');
let code = fs.readFileSync('src/pages/EvalResults.tsx', 'utf8');

code = code.replace(/\`\$\{pct\}%\`/g, "pct + '%'");

fs.writeFileSync('src/pages/EvalResults.tsx', code);
