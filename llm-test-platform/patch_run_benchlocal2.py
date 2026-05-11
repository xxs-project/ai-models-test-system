with open("BenchLocal/run_benchlocal.sh", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "let needsInstall = true;" in line:
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if "results[pack].error = err.message;" in lines[i]:
            end_idx = i + 2  # to include continue; and }
            break

if start_idx != -1 and end_idx != -1:
    old_lines = lines[:start_idx]
    after_lines = lines[end_idx:]
    
    new_code = r"""    let needsInstall = true;
    
    // 版本一致性校验
    try {
        const res = await fetch("https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json");
        const registry = await res.json();
        const entry = registry.packs.find(e => e.id === pack);
        if (entry) {
            const latestVersion = entry.version;
            const packDir = path.join(process.env.HOME || '/root', '.benchlocal/benchpacks', pack, 'versions');
            try {
                const dirs = await fs.readdir(packDir);
                let localVersion = null;
                for (const d of dirs) {
                    if (d.startsWith(latestVersion + '-')) {
                        localVersion = d;
                        break;
                    }
                }
                
                if (localVersion) {
                    console.log(\`[+] 发现本地已有最新版本 \${localVersion}，跳过下载...\`);
                    needsInstall = false;
                    
                    if (!config.benchpacks) config.benchpacks = {};
                    const manifestStr = await fs.readFile(path.join(packDir, localVersion, 'manifest.json'), 'utf8');
                    const manifest = JSON.parse(manifestStr);
                    config.benchpacks[pack] = {
                        version: manifest.version,
                        path: path.join(packDir, localVersion),
                        enabled: true
                    };
                }
            } catch(e) {
                // directory does not exist or other error
            }
        }
    } catch(e) {
        console.log(\`⚠️ 获取注册表失败，将使用默认逻辑\`);
    }

    if (needsInstall) {
      console.log(\`[+] 正在从注册表安装或更新 \${pack}...\`);
      try {
        config = await installBenchPackFromRegistry(
          config,
          pack,
          (progress) => console.log(\`  └─ [安装] \${progress.phase}: \${progress.message}\`),
          runtime
        );
        try {
            execSync('find ~/.benchlocal/benchpacks/' + pack + ' -name llm-client.js -exec sed -i \'s/throw error;/throw new Error(error.message + " | URL: " + baseUrl + " | Cause: " + (error.cause ? (error.cause.message || error.cause) : "None"));/g\' {} + || true');
        } catch(e) { console.log(e); }
      } catch (err) {
        console.error(\`❌ 安装失败: \${err.message}\`);
        results[pack].status = 'INSTALL_FAILED';
        results[pack].error = err.message;
        continue;
      }
    }
"""
    lines = old_lines + [new_code] + after_lines
    with open("BenchLocal/run_benchlocal.sh", "w") as f:
        f.writelines(lines)
    print("Successfully patched run_benchlocal.sh")
else:
    print("Could not find start or end index")
