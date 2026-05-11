const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');

code = code.replace(
  /if \(!code\.includes\("try \{"\)\) \{/,
  'if (!code.includes("模型API连接失败")) {'
);

fs.writeFileSync('BenchLocal/run_benchlocal.sh', code);
