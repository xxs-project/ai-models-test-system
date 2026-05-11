const fs = require('fs');
const file = '/home/xxs/models-test-system/llm-test-platform/BenchLocal/packages/benchpack-host/dist/index.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /writeJsonResponse\(response, 502, \{\s*error: \{\s*message: "BenchLocal inference relay failed to reach the upstream provider\.",\s*type: "server_error",\s*details: toErrorMessage\(error\)\s*\}\s*\}\);/g,
  `console.error("PROXY UNHANDLED ERROR:", error);
            writeJsonResponse(response, 502, {
                error: {
                    message: "BenchLocal inference relay failed to reach the upstream provider.",
                    type: "server_error",
                    details: toErrorMessage(error)
                }
            });`
);

fs.writeFileSync(file, code);
