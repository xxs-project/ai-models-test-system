const fs = require('fs');
const file = '/home/xxs/models-test-system/llm-test-platform/BenchLocal/packages/benchpack-host/dist/index.js';
let code = fs.readFileSync(file, 'utf8');
if (code.includes('const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);')) {
  console.log("Match found!");
} else {
  console.log("No match");
}
