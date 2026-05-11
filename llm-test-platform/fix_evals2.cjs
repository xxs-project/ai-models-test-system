const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');

code = code.replace(
  /import path from 'path';/,
  `import path from 'path';\nimport { execSync } from 'child_process';`
);

code = code.replace(
  /        try \{\n            require\('child_process'\)\.execSync\([\s\S]*?\} catch\(e\) \{\}/,
  `        try {
            execSync('find ~/.benchlocal/benchpacks/' + pack + ' -name llm-client.js -exec sed -i \\'s/throw error;/throw new Error(error.message + " | URL: " + baseUrl + " | Cause: " + (error.cause ? (error.cause.message || error.cause) : "None"));/g\\' {} + || true');
        } catch(e) { console.log(e); }`
);

fs.writeFileSync('BenchLocal/run_benchlocal.sh', code);
