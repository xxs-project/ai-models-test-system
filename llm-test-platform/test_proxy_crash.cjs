const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_evals.mjs', 'utf8');

code = code.replace(
  /const results = \{\};/,
  `process.on('uncaughtException', err => console.error("UNCAUGHT EXCEPTION:", err));
process.on('unhandledRejection', err => console.error("UNHANDLED REJECTION:", err));
const results = {};`
);

fs.writeFileSync('BenchLocal/run_evals.mjs', code);
