const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const useFieldArrayString = `  const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({
    control: form.control,
    name: "parameter_combinations"
  })

  // Watchers for conditional logic`;

code = code.replace(/\/\/ Watchers for conditional logic/, useFieldArrayString);

fs.writeFileSync('src/pages/TaskList.tsx', code);
