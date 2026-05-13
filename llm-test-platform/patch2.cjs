const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

// handleEdit modifications
const handleEditRegex = /const handleEdit = \(task: Task\) => \{\n    setEditingTask\(task\)/;
const handleEditReplacement = `const handleEdit = (task: Task) => {
    let parsedCombinations = [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }];
    if (task.parameter_combination) {
      try {
        const parsed = JSON.parse(task.parameter_combination);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedCombinations = parsed;
        } else if (typeof parsed === 'object') {
           // Handle old format if it was a single object
           parsedCombinations = [ { input_len: String(parsed.input_len || ''), output_len: String(parsed.output_len || ''), num_prompts: String(parsed.num_prompts || ''), max_concurrency: String(parsed.max_concurrency || '') } ];
        }
      } catch (e) {
        console.error("Failed to parse parameter_combination", e);
      }
    }
    setEditingTask(task)`;
code = code.replace(handleEditRegex, handleEditReplacement);

// form.reset inside handleEdit
const resetRegex = /parameter_combination: task.parameter_combination \|\| '',/;
const resetReplacement = `parameter_combination: task.parameter_combination || '',
      parameter_combinations: parsedCombinations,`;
code = code.replace(resetRegex, resetReplacement);

// Create task default values
const useFormRegex = /parameter_combination: '',\n      processor_type: 'NPU',/;
const useFormReplacement = `parameter_combination: '',
      parameter_combinations: [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }],
      processor_type: 'NPU',`;
code = code.replace(useFormRegex, useFormReplacement);

const createBtnRegex = /parameter_combination: '',\n            processor_type: 'NPU',/;
const createBtnReplacement = `parameter_combination: '',
            parameter_combinations: [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }],
            processor_type: 'NPU',`;
code = code.replace(createBtnRegex, createBtnReplacement);

fs.writeFileSync('src/pages/TaskList.tsx', code);
