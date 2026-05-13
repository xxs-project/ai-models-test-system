import { runConfiguredBenchPack } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath } from '@benchlocal/core';

async function main() {
  const config = await loadConfigFile(getConfigPath());
  const summary = await runConfiguredBenchPack(
    config, 
    'toolcall-15', 
    {
      modelIds: ['local_model:gemma-4-26B-A4B-it'],
      executionMode: 'parallel',
      onEvent: (e) => {
        console.log(`[Event] type: ${e.type}`);
        if (e.type === 'run_completed') console.log('RUN COMPLETED EVENT:', e);
      }
    }
  );
  console.log('SUMMARY:', JSON.stringify(summary, null, 2));
}
main().catch(console.error);
