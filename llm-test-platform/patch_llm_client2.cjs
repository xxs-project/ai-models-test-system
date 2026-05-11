const fs = require('fs');
const glob = require("child_process").execSync("find /root/.benchlocal/benchpacks/ -name llm-client.js -path \"*/dist/lib/llm-client.js\" 2>/dev/null").toString().trim().split("\n").filter(Boolean);
for (const file of glob) {
  let code = fs.readFileSync(file, "utf8");
  code = code.replace(
    /throw error;/g,
    'throw new Error(error.message + (error.cause ? " Cause: " + (error.cause.message || error.cause) : ""));'
  );
  fs.writeFileSync(file, code);
}
