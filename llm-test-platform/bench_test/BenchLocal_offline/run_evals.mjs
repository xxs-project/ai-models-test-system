import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { runConfiguredBenchPack, installBenchPackFromRegistry, startConfiguredBenchPackVerifiers } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath } from '@benchlocal/core';

const MODEL_NAME = process.env.MODEL_NAME || "gemma-4-26B-A4B-it";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:10093/v1";
const PACKS_STR = process.env.PACKS || "";
const PACK_ARRAY = PACKS_STR ? PACKS_STR.split(',') : [];
const UPDATE_PACKS = process.env.UPDATE_PACKS === '1';

async function main() {
  const packs = PACK_ARRAY.length > 0 ? PACK_ARRAY : [
    'dataextract-15',
    'instructfollow-15',
    'reasonmath-15',
    'toolcall-15',
    'bugfind-15',
    'structoutput-15',
    'hermesagent-20',
    'cli-40'
  ];

  const runtime = {
    benchLocalVersion: '0.2.4',
    hostFeatures: ["inferenceEndpoints", "dockerInferenceEndpoints"]
  };

  const results = {};

  for (const pack of packs) {
    console.log(`\n==================================================`);
    console.log(`▶ 开始评测: ${pack}`);
    console.log(`==================================================`);

    let config;
    try {
        config = await loadConfigFile(getConfigPath());
    } catch(e) {
        console.error("加载配置失败", e);
        continue;
    }

    results[pack] = {
      status: 'PENDING',
      scenarios: [],
      score: 0,
      maxScore: 0
    };

    let needsInstall = UPDATE_PACKS;
    const baseDir = path.join(process.env.HOME || '/root', '.benchlocal/benchpacks', pack);
    
    // 如果没有强制更新网络包，优先读取本地
    if (!needsInstall) {
        try {
            const currentJsonPath = path.join(baseDir, 'current.json');
            const currentJsonStr = await fs.readFile(currentJsonPath, 'utf8');
            const currentJson = JSON.parse(currentJsonStr);
            const localVersion = currentJson.version;
            
            if (localVersion) {
                console.log(`[+] [离线模式] 发现本地已有版本 ${localVersion}，直接加载执行...`);
                
                if (!config.benchpacks) config.benchpacks = {};
                const packDir = path.join(baseDir, 'versions');
                const manifestStr = await fs.readFile(path.join(packDir, localVersion, 'benchlocal.pack.json'), 'utf8');
                const manifest = JSON.parse(manifestStr);
                config.benchpacks[pack] = {
                    version: manifest.version,
                    source: 'registry',
                    path: path.join(packDir, localVersion),
                    enabled: true,
                    verifiers: (manifest.verifiers || manifest.sidecars || []).reduce((acc, spec) => {
                        acc[spec.id] = { auto_start: true, mode: 'docker' };
                        return acc;
                    }, {})
                };
                const core = await import('@benchlocal/core');
                await core.saveConfigFile(config, core.getConfigPath());
            } else {
                needsInstall = true;
            }
        } catch(e) {
            console.log(`⚠️ 未发现本地测试包或读取失败，将尝试从网络下载 ${pack}`);
            needsInstall = true;
        }
    } else {
        // 如果开启了UPDATE_PACKS，进行版本一致性校验
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
                        console.log(`[+] 发现本地已有最新版本 ${localVersion}，跳过下载...`);
                        needsInstall = false;
                        
                        if (!config.benchpacks) config.benchpacks = {};
                        const packDir = path.join(baseDir, 'versions');
                        const manifestStr = await fs.readFile(path.join(packDir, localVersion, 'benchlocal.pack.json'), 'utf8');
                        const manifest = JSON.parse(manifestStr);
                        config.benchpacks[pack] = {
                            version: manifest.version,
                            source: 'registry',
                            path: path.join(packDir, localVersion),
                            enabled: true,
                            verifiers: (manifest.verifiers || manifest.sidecars || []).reduce((acc, spec) => {
                                acc[spec.id] = { auto_start: true, mode: 'docker' };
                                return acc;
                            }, {})
                        };
                        const core = await import('@benchlocal/core');
                        await core.saveConfigFile(config, core.getConfigPath());
                    }
                } catch(e) {
                    // ignore
                }
            }
        } catch(e) {
            console.log(`⚠️ 获取注册表失败，将尝试下载/更新`);
        }
    }

    if (needsInstall) {
      console.log(`[+] 正在从注册表安装或更新 ${pack}...`);
      try {
        config = await installBenchPackFromRegistry(
          config,
          pack,
          (progress) => console.log(`  └─ [安装] ${progress.phase}: ${progress.message}`),
          runtime
        );
        try {
            execSync('find ' + process.env.BENCHLOCAL_DIR + '/benchpacks/' + pack + ' -name llm-client.js -exec sed -i \'s/throw error;/throw new Error(error.message + " | URL: " + baseUrl + " | Cause: " + (error.cause ? (error.cause.message || error.cause) : "None"));/g\' {} + || true');
        } catch(e) { console.log(e); }
      } catch (err) {
        console.error(`❌ 安装失败: ${err.message}`);
        results[pack].status = 'INSTALL_FAILED';
        results[pack].error = err.message;
        continue;
      }
    }


    try {
      console.log(`[+] 正在启动测试集依赖服务...`);
      await startConfiguredBenchPackVerifiers(config, pack, {
        onProgress: (progress) => console.log(`  └─ [服务启动] ${progress.verifierId}: ${progress.message}`)
      });
      const summary = await runConfiguredBenchPack(
        config,
        pack,
        {
          modelIds: [`local_model:${MODEL_NAME}`],
          executionMode: 'parallel',
          onEvent: (e) => {
            if (e.type === 'scenario_result') {
              const resultData = e.result;
              const pass = resultData.status !== 'fail' && resultData.score > 0;
              const errorMsg = resultData.error || resultData.summary || '-';

              results[pack].scenarios.push({
                id: resultData.scenarioId,
                pass: pass,
                score: resultData.score || 0,
                maxScore: resultData.maxScore || 100,
                durationMs: resultData.durationMs || 0,
                error: errorMsg
              });

              console.log(`  └─ [用例] ${resultData.scenarioId}: ${pass ? '✅ PASS' : '❌ FAIL'}`);
            }
          }
        },
        runtime
      );

      console.log(`✅ ${pack} 测试结束。`);

      results[pack].status = 'SUCCESS';
      let packScore = 0;
      let packMax = 0;
      for (const sc of results[pack].scenarios) {
        packScore += sc.score;
        packMax += sc.maxScore;
      }
      results[pack].score = packScore;
      results[pack].maxScore = packMax;
      results[pack].percent = packMax > 0 ? (packScore / packMax * 100).toFixed(2) : 0;
      results[pack].summaryPath = summary.summaryPath;

    } catch (err) {
      console.error(`❌ 运行失败 ${pack}: ${err.message.split('\n')[0]}`);
      results[pack].status = 'RUN_FAILED';
      results[pack].error = err.message;
    }
  }

  console.log(`\n\n📊 [3/4] 详细测评报告与大模型综合评分`);
  console.log(`==================================================`);
  console.log(`模型名称: ${MODEL_NAME}`);
  console.log(`测试接口: ${BASE_URL}`);
  console.log(`存放路径: /home/models-test-system_ucd_v1.2/llm-test-platform/bench_test/BenchLocal/results/`);
  console.log(`==================================================\n`);

  let totalScore = 0;
  let totalMaxScore = 0;

  let reportMd = `# 大模型测评详细报告\n\n`;
  const reportDate = new Date().toLocaleString();
  reportMd += `**模型名称**: ${MODEL_NAME}\n`;
  reportMd += `**测试接口**: ${BASE_URL}\n`;
  reportMd += `**测试时间**: ${reportDate}\n\n`;

  for (const pack of packs) {
    const res = results[pack];

    if (res.status === 'SUCCESS') {
      totalScore += res.score;
      totalMaxScore += res.maxScore;

      console.log(`📦 测试集: \x1b[36m${pack}\x1b[0m | 状态: \x1b[32m${res.status}\x1b[0m | 得分: ${res.score}/${res.maxScore} (${res.percent}%)`);
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`| 用例 ID ${' '.repeat(20)} | 状态 | 分数 | 失败原因 / 备注`);
      console.log(`|-----------------------------|------|------|---------------------------------|`);

      reportMd += `## 测试集: ${pack}\n`;
      reportMd += `- **状态**: ✅ ${res.status}\n`;
      reportMd += `- **得分**: ${res.score}/${res.maxScore} (${res.percent}%)\n\n`;
      reportMd += `| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |\n`;
      reportMd += `|---------|------|------|-----------------|\n`;

      for (const sc of res.scenarios) {
        const idPad = sc.id.substring(0, 27).padEnd(27, ' ');
        const passIcon = sc.pass ? '✅' : '❌';
        let scoreText = `${sc.score}/${sc.maxScore}`.padEnd(4, ' ');
        const errTrunc = sc.error.substring(0, 80).replace(/\n/g, ' ') + (sc.error.length > 80 ? '...' : '');

        console.log(`| ${idPad} |  ${passIcon}  | ${scoreText} | \x1b[90m${errTrunc}\x1b[0m`);

        const mdErr = sc.error.replace(/\n/g, ' ');
        reportMd += `| ${sc.id} | ${passIcon} | ${sc.score}/${sc.maxScore} | ${mdErr} |\n`;
      }
      console.log(`\n`);
      reportMd += `\n`;
    } else {
      console.log(`📦 测试集: \x1b[36m${pack}\x1b[0m | 状态: \x1b[31m${res.status}\x1b[0m`);
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`🚨 异常拦截原因: \x1b[31m${res.error?.substring(0, 150).replace(/\n/g, ' ')}...\x1b[0m\n`);

      reportMd += `## 测试集: ${pack}\n`;
      reportMd += `- **状态**: ❌ ${res.status}\n`;
      reportMd += `- **异常原因**: ${res.error}\n\n`;
    }
  }

  const overallPercent = totalMaxScore > 0 ? (totalScore / totalMaxScore * 100).toFixed(2) : 0;
  console.log(`==================================================`);
  console.log(`🏆 大模型综合评分: \x1b[33m${totalScore} / ${totalMaxScore}\x1b[0m (\x1b[33m${overallPercent}%\x1b[0m)`);
  console.log(`==================================================`);
  console.log(`✨ 测评执行完毕，所有完整日志存入本地。`);

  reportMd += `## 🏆 大模型综合评分\n\n`;
  reportMd += `- **总得分**: ${totalScore} / ${totalMaxScore}\n`;
  reportMd += `- **综合胜率**: **${overallPercent}%**\n`;

  const modelNameForFile = MODEL_NAME.replace(/[^a-zA-Z0-9-]/g, '_');
  const d = new Date();
  const timeStr = d.getFullYear() +
                  String(d.getMonth() + 1).padStart(2, '0') +
                  String(d.getDate()).padStart(2, '0') + '_' +
                  String(d.getHours()).padStart(2, '0') +
                  String(d.getMinutes()).padStart(2, '0') +
                  String(d.getSeconds()).padStart(2, '0');
  const reportFileName = `benchmark_${modelNameForFile}_${timeStr}_report.md`;
  const reportPath = path.join('/home/models-test-system_ucd_v1.2/llm-test-platform/bench_test/BenchLocal/results', reportFileName);
  try {
    await fs.writeFile(reportPath, reportMd, 'utf8');
    console.log(`📄 Markdown 测试报告已生成: ${reportPath}`);
  } catch (err) {
    console.error(`❌ 报告文件保存失败: ${err.message}`);
  }
}

main().catch(console.error);
