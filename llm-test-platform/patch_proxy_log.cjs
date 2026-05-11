const fs = require('fs');
const file = '/home/xxs/models-test-system/llm-test-platform/BenchLocal/packages/benchpack-host/dist/index.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const requestUrl = new URL\(request\.url \?\? "\/", `http:\/\/\$\{request\.headers\.host\}`\);/g,
  `const requestUrl = new URL(request.url ?? "/", \`http://\${request.headers.host}\`);
   console.log("PROXY RECEIVED REQUEST:", requestUrl.toString());`
);

fs.writeFileSync(file, code);
