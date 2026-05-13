const fs = require('fs');

let content = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

// 1. Add schema fields
content = content.replace(
  `  test_mode: z.coerce.number(),`,
  `  test_mode: z.coerce.number(),\n  startup_mode: z.enum(['api', 'container']).default('container'),\n\n  // API mode specific fields\n  base_url: z.string().optional(),\n  api_key: z.string().optional(),\n  parameter_combination: z.string().optional(),\n  processor_type: z.string().optional(),\n  server_model: z.string().optional(),\n  framework_startup_args: z.string().optional(),`
);

// 2. Fix superRefine validations to only apply when needed
content = content.replace(
  `  // Device Validation\n  if (data.device_selection_mode === 'list') {`,
  `  // Device Validation\n  if (data.startup_mode === 'container') {\n    if (data.device_selection_mode === 'list') {`
);

content = content.replace(
  `    if (!data.password) ctx.addIssue({ path: ['password'], code: z.ZodIssueCode.custom, message: '必填' })\n  }`,
  `    if (!data.password) ctx.addIssue({ path: ['password'], code: z.ZodIssueCode.custom, message: '必填' })\n    }\n  }`
);

// Wait, the validation for test_mode=1 currently requires model_name, npu_count, graph_mode.
// But in API mode, maybe they are also required? We can leave them as is, or we can make them conditional. Let's make them required for API mode too if they are in the new fields.
// Actually, let's leave the Zod validation as is, or tweak if it causes issues.

// 3. Default values in form
content = content.replace(
  `      test_mode: 1, // 单模型`,
  `      test_mode: 1, // 单模型\n      startup_mode: 'container',\n      base_url: '',\n      api_key: '',\n      parameter_combination: '',\n      processor_type: 'NPU',\n      server_model: '',\n      framework_startup_args: '',`
);

content = content.replace(
  `            test_mode: 1,`,
  `            test_mode: 1,\n            startup_mode: 'container',\n            base_url: '',\n            api_key: '',\n            parameter_combination: '',\n            processor_type: 'NPU',\n            server_model: '',\n            framework_startup_args: '',`
);

// 4. Watcher
content = content.replace(
  `  const testMode = form.watch('test_mode')`,
  `  const testMode = form.watch('test_mode')\n  const startupMode = form.watch('startup_mode')`
);

// 5. Submit data mapping
content = content.replace(
  `        test_mode: values.test_mode,`,
  `        test_mode: values.test_mode,\n        startup_mode: values.startup_mode,\n        base_url: values.base_url,\n        api_key: values.api_key,\n        parameter_combination: values.parameter_combination,\n        processor_type: values.processor_type,\n        server_model: values.server_model,\n        framework_startup_args: values.framework_startup_args,`
);

// 6. Edit mapping
content = content.replace(
  `      test_mode: task.test_mode ?? 1,`,
  `      test_mode: task.test_mode ?? 1,\n      startup_mode: task.startup_mode || 'container',\n      base_url: task.base_url || '',\n      api_key: task.api_key || '',\n      parameter_combination: task.parameter_combination || '',\n      processor_type: task.processor_type || 'NPU',\n      server_model: task.server_model || '',\n      framework_startup_args: task.framework_startup_args || '',`
);

fs.writeFileSync('src/pages/TaskList.tsx', content);
