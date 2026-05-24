import { installBenchPackFromRegistry } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath, saveConfigFile } from '@benchlocal/core';
import fs from 'fs/promises';
import path from 'path';

const PACKS_STR = process.env.PACKS || "";
const PACK_ARRAY = PACKS_STR ? PACKS_STR.split(',') : [];
const packs = PACK_ARRAY.length > 0 ? PACK_ARRAY : ['dataextract-15', 'instructfollow-15', 'reasonmath-15', 'toolcall-15', 'bugfind-15', 'structoutput-15', 'hermesagent-20', 'cli-40'];
const runtime = { benchLocalVersion: '0.2.4', hostFeatures: [] };
const UPDATE_PACKS = process.env.UPDATE_PACKS === '1';

async function main() {
    let config = await loadConfigFile(getConfigPath());
    for (const pack of packs) {
        let needsInstall = UPDATE_PACKS;
        const baseDir = path.join(process.env.HOME || '/root', '.benchlocal/benchpacks', pack);
        
        if (!UPDATE_PACKS) {
            try {
                const currentJsonPath = path.join(baseDir, 'current.json');
                await fs.access(currentJsonPath);
                console.log(`  └─ [离线模式] 发现本地已有测试包: ${pack}，跳过下载更新`);
                needsInstall = false;
            } catch(e) {
                console.log(`  └─ [离线模式] 未发现本地测试包: ${pack}，将尝试从网络获取`);
                needsInstall = true;
            }
        }

        if (needsInstall) {
            try {
                const res = await fetch("https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json");
                const registry = await res.json();
                const entry = registry.packs.find(e => e.id === pack);
                if (entry) {
                    const latestVersion = entry.version;
                    const currentJsonPath = path.join(baseDir, 'current.json');
                    try {
                        const currentJsonStr = await fs.readFile(currentJsonPath, 'utf8');
                        const currentJson = JSON.parse(currentJsonStr);
                        const localVersion = currentJson.version;
                        if (localVersion && localVersion.startsWith(latestVersion + '-')) {
                            needsInstall = false;
                        }
                    } catch(e) {}
                }
            } catch(e) {
                console.log(`  └─ 获取注册表失败，将使用默认安装逻辑`);
            }
        }
        
        if (needsInstall) {
            console.log(`  └─ 下载/更新测试包: ${pack}`);
            try {
                config = await installBenchPackFromRegistry(config, pack, () => {}, runtime);
            } catch(e) {
                console.error(`  └─ 下载失败: ${e.message}`);
            }
        }
    }
}
main().catch(() => {});
