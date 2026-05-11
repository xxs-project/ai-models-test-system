const fs = require('fs');
const file = '/home/xxs/models-test-system/llm-test-platform/BenchLocal/packages/benchpack-host/dist/index.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /server\.listen\(0, "0\.0\.0\.0", \(\) => resolve\(server\.address\(\)\)\);/g,
  'server.listen(0, "127.0.0.1", () => resolve(server.address()));'
);
fs.writeFileSync(file, code);
