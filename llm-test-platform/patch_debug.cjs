const fs = require('fs');
const glob = require("child_process").execSync("find /root/.benchlocal/benchpacks/ -name llm-client.js -path \"*/dist/lib/llm-client.js\" 2>/dev/null").toString().trim().split("\n").filter(Boolean);
for (const file of glob) {
  let code = fs.readFileSync(file, "utf8");
  code = code.replace(
    /try \{\s*response = await fetch\(/g,
    `try { console.log("FETCHING:", \`\${baseUrl}/chat/completions\`); response = await fetch(`
  );
  code = code.replace(
    /throw error;/g,
    `console.error("FETCH CAUGHT ERROR:", error.message, error.cause); throw error;`
  );
  fs.writeFileSync(file, code);
}
