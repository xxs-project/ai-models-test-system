const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');

// Replace localhost with 127.0.0.1
code = code.replace(
  /BASE_URL="\$3"/,
  `BASE_URL=$(echo "$3" | sed 's/localhost/127.0.0.1/g')`
);

// Ignore curl ssl errors
code = code.replace(
  /if ! curl -s --max-time 5 "\$\{BASE_URL\}\/models"/,
  `if ! curl -k -s --max-time 5 "\${BASE_URL}/models"`
);

// Add NODE_TLS_REJECT_UNAUTHORIZED to run_evals.mjs
code = code.replace(
  /import path from 'path';/,
  `import path from 'path';\nprocess.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`
);

// Add host.docker.internal to 127.0.0.1 patch to benchpack-host dynamically
const patchBenchpack = `
echo "🔧 修补 benchpack-host 以支持本地网络..."
find node_modules/@benchlocal -name "index.js" -path "*/benchpack-host/dist/index.js" -exec sed -i 's/host.docker.internal/127.0.0.1/g' {} + || true
`;

code = code.replace(
  /echo "💻 \[2\/4\] 生成自动化测评调度引擎..."/,
  `${patchBenchpack}\necho "💻 [2/4] 生成自动化测评调度引擎..."`
);

fs.writeFileSync('BenchLocal/run_benchlocal.sh', code);
