import fs from 'fs/promises';
import { runConfiguredBenchPack, installBenchPackFromRegistry } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath } from '@benchlocal/core';
import path from 'path';

async function main() {
  const packs = [
    'bugfind-15',
    'structoutput-15',
    'hermesagent-20'
  ];

  const runtime = {
    benchLocalVersion: '0.2.4',
    hostFeatures: ["inferenceEndpoints", "dockerInferenceEndpoints"]
  };

  for (const pack of packs) {
    console.log(`\n=== Processing ${pack} ===`);
    let config = await loadConfigFile(getConfigPath());

    if (!config.benchpacks[pack]) {
      console.log(`Installing ${pack}...`);
      config = await installBenchPackFromRegistry(
        config,
        pack,
        (progress) => console.log(`  [Install] ${progress.phase}: ${progress.message}`),
        runtime
      );
    }

    console.log(`Running ${pack}...`);
    try {
      const summary = await runConfiguredBenchPack(
        config, 
        pack, 
        {
          modelIds: ['local_model:gemma-4-26B-A4B-it'],
          executionMode: 'parallel',
          onEvent: (e) => {
            if (e.type === 'run_completed') {
              console.log(`  [Run Complete] Score: ${e.score.score} / ${e.score.maxScore} (${(e.score.percent * 100).toFixed(2)}%)`);
            } else if (e.type === 'scenario_completed') {
              console.log(`  [Scenario] ${e.scenario.id}: ${e.result.score > 0 ? 'PASS' : 'FAIL'} (Duration: ${e.result.durationMs}ms)`);
            }
          }
        },
        runtime
      );
      console.log(`Finished ${pack}. Summary saved to ${summary.summaryPath}`);
    } catch (err) {
      console.error(`Failed to run ${pack}:`, err);
    }
  }
}

main().catch(console.error);
