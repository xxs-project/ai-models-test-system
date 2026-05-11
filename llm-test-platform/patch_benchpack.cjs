const fs = require('fs');

const runScript = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');
if (runScript.includes('upstreamResponse = await fetch')) {
   // Wait, it's not in run_benchlocal.sh
}

const fileToPatch = 'BenchLocal/run_benchlocal.sh';
let code = fs.readFileSync(fileToPatch, 'utf8');

const patchCode = `
echo "🔧 增强 benchpack-host 的网络错误处理..."
find node_modules/@benchlocal -name "index.js" -path "*/benchpack-host/dist/index.js" -exec sed -i -e 's/const upstreamResponse = await fetch(upstreamUrl/let upstreamResponse;\\n            try {\\n                upstreamResponse = await fetch(upstreamUrl/g' -e 's/body: outboundBody.length > 0 ? outboundBody.toString("utf8") : undefined\\n            });/body: outboundBody.length > 0 ? outboundBody.toString("utf8") : undefined\\n                });\\n            } catch (err) {\\n                response.writeHead(502, { "Content-Type": "application\\/json" });\\n                response.end(JSON.stringify({ error: { message: "模型API连接失败: " + err.message, type: "server_error" }}));\\n                return;\\n            }/g' {} + || true
`;

if (!code.includes('增强 benchpack-host')) {
  code = code.replace(
    /echo "💻 \[2\/4\] 生成自动化测评调度引擎..."/,
    `${patchCode}\necho "💻 [2/4] 生成自动化测评调度引擎..."`
  );
  fs.writeFileSync(fileToPatch, code);
}
