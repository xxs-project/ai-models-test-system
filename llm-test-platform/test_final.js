const fs = require('fs');
const content = fs.readFileSync("BenchLocal/run_benchlocal.sh", "utf8");
if (content.includes("saveConfigFile(config, core.getConfigPath())")) {
    console.log("Looks good!");
}
