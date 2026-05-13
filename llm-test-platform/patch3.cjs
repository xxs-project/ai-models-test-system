const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const onSubmitRegex = /parameter_combination: values\.parameter_combination,/;
const onSubmitReplacement = `parameter_combination: values.parameter_combinations && values.parameter_combinations.length > 0 ? JSON.stringify(values.parameter_combinations) : '',`;
code = code.replace(onSubmitRegex, onSubmitReplacement);

fs.writeFileSync('src/pages/TaskList.tsx', code);
