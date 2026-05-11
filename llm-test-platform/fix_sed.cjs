const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');

code = code.replace(
  /echo "🔧 增强 benchpack-host 的网络错误处理..."[\s\S]*?\|\| true/,
  `echo "🔧 增强 benchpack-host 的网络错误处理..."
node -e '
const fs = require("fs");
const glob = require("child_process").execSync("find node_modules/@benchlocal -name index.js -path \\"*/benchpack-host/dist/index.js\\" 2>/dev/null").toString().trim().split("\\n").filter(Boolean);
for (const file of glob) {
  let code = fs.readFileSync(file, "utf8");
  if (!code.includes("try {")) {
    code = code.replace(
      /const upstreamResponse = await fetch\\(upstreamUrl, \\{\\s*method: request\\.method \\?\\? "GET",\\s*headers: createUpstreamHeaders\\(request, route\\),\\s*body: outboundBody\\.length > 0 \\? outboundBody\\.toString\\("utf8"\\) : undefined\\s*\\}\\);/g,
      \`let upstreamResponse;
            try {
                upstreamResponse = await fetch(upstreamUrl, {
                    method: request.method ?? "GET",
                    headers: createUpstreamHeaders(request, route),
                    body: outboundBody.length > 0 ? outboundBody.toString("utf8") : undefined
                });
            } catch (err) {
                response.writeHead(502, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ error: { message: "模型API连接失败: " + err.message, type: "server_error" }}));
                return;
            }\`
    );
    fs.writeFileSync(file, code);
  }
}
' || true`
);

fs.writeFileSync('BenchLocal/run_benchlocal.sh', code);
