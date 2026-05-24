const fs = require('fs');
const file = 'llm-test-platform/bench_test/BenchLocal/run_benchlocal.sh';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /config\.benchpacks\[pack\] = \{\n\s*version: manifest\.version,\n\s*source: 'registry',\n\s*path: path\.join\(packDir, localVersion\),\n\s*enabled: true\n\s*\};/,
  `config.benchpacks[pack] = {
                        version: manifest.version,
                        source: 'registry',
                        path: path.join(packDir, localVersion),
                        enabled: true,
                        verifiers: (manifest.verifiers || manifest.sidecars || []).reduce((acc, spec) => {
                            acc[spec.id] = { auto_start: true, mode: 'docker' };
                            return acc;
                        }, {})
                    };`
);
fs.writeFileSync(file, content);
