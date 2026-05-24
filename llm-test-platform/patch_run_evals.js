const fs = require('fs');
const file = 'llm-test-platform/bench_test/BenchLocal/run_benchlocal.sh';
let content = fs.readFileSync(file, 'utf8');

// The generation of config object is around line 542:
//   const config = {
//     benchpacks: {
//       // dynamic generation

content = content.replace(
  /const config = \{\n    benchpacks: \{\n(.*?)\n    \}\n  \};/s,
  (match, p1) => {
    const lines = p1.split('\n');
    const newLines = lines.map(line => {
      if (line.includes('{ enabled: true }')) {
        return line.replace('{ enabled: true }', '{ enabled: true, verifiers: { verifier: { auto_start: true } } }');
      }
      return line;
    });
    return `  const config = {\n    benchpacks: {\n${newLines.join('\n')}\n    }\n  };`;
  }
);
fs.writeFileSync(file, content);
