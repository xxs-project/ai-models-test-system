const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const startupModeRegex = /\{Number\(testType\) === 1 && Number\(testMode\) === 1 && \(\s*<FormField[\s\S]*?name="startup_mode"[\s\S]*?<\/FormItem>\s*\)\}\s*<\/FormField>\s*\)\}\s*/g;

// Wait, the regex is too complex. Let's do string replacement manually or with exact match.
