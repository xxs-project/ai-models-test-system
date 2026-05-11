const fs = require('fs');
let code = fs.readFileSync('BenchLocal/run_benchlocal.sh', 'utf8');

code = code.replace(
  /        try \{\n            import\('child_process'\)\.then\(\(\{execSync\}\) => \{\n                execSync\(`find ~\/\.benchlocal\/benchpacks\/\$\{pack\} -name llm-client\.js -exec sed -i 's\/throw error;\/throw new Error\\(error\.message \+ " \| URL: " \+ baseUrl \+ " \| Cause: " \+ \\(error\.cause \? \\(error\.cause\.message \|\| error\.cause\\) : "None"\\)\\);\/g' \{\} \+ \|\| true`\);\n            \}\);\n        \} catch\(e\) \{\}/g,
  `import('child_process').then(cp => {
          try {
              cp.execSync('find ~/.benchlocal/benchpacks/' + pack + ' -name llm-client.js -exec sed -i \\'s/throw error;/throw new Error(error.message + " | URL: " + baseUrl + " | Cause: " + (error.cause ? (error.cause.message || error.cause) : "None"));/g\\' {} + || true');
          } catch(e) {}
        });`
);

fs.writeFileSync('BenchLocal/run_benchlocal.sh', code);
