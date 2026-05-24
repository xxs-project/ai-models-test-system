const fs = require('fs');
const file = 'llm-test-platform/bench_test/BenchLocal/run_benchlocal.sh';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /sed -i 's\|const AGENT_RUNNER_PATH = "\/opt\/verification\/agent-runner\.py";\|const AGENT_RUNNER_PATH = "\/opt\/verification\/agent-runner\.py";\|g' "\$HERMES_DIR\/hermes-runtime\.mjs"/g,
  'sed -i \'s|const AGENT_RUNNER_PATH = "/opt/verification/agent-runner.py";|const AGENT_RUNNER_PATH = process.cwd() + "/agent-runner.py";|g\' "$HERMES_DIR/hermes-runtime.mjs"'
);
fs.writeFileSync(file, content);
