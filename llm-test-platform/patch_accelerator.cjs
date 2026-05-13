const fs = require('fs');

// Patch types.ts
let typesCode = fs.readFileSync('src/lib/types.ts', 'utf8');
typesCode = typesCode.replace(
  'framework_startup_args?: string;',
  'framework_startup_args?: string;\n  accelerator_card?: string;'
);
fs.writeFileSync('src/lib/types.ts', typesCode);

// Patch TaskList.tsx
let taskListCode = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

taskListCode = taskListCode.replace(
  /framework_startup_args: z\.string\(\)\.optional\(\),/g,
  'framework_startup_args: z.string().optional(),\n  accelerator_card: z.string().optional(),'
);

taskListCode = taskListCode.replace(
  /framework_startup_args: task\.framework_startup_args \|\| '',/g,
  "framework_startup_args: task.framework_startup_args || '',\n      accelerator_card: task.accelerator_card || '',"
);

taskListCode = taskListCode.replace(
  /framework_startup_args: '',/g,
  "framework_startup_args: '',\n      accelerator_card: '',"
);

taskListCode = taskListCode.replace(
  /framework_startup_args: values\.framework_startup_args,/g,
  "framework_startup_args: values.framework_startup_args,\n        accelerator_card: values.accelerator_card,"
);

const uiFormOld = `<FormField control={form.control} name="server_model" render={({ field }) => (
                        <FormItem><FormLabel>服务器机型</FormLabel><FormControl><Input placeholder="Atlas 800T A2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />`;
const uiFormNew = `<FormField control={form.control} name="server_model" render={({ field }) => (
                        <FormItem><FormLabel>服务器机型</FormLabel><FormControl><Input placeholder="Atlas 800T A2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="accelerator_card" render={({ field }) => (
                        <FormItem><FormLabel>加速卡</FormLabel><FormControl><Input placeholder="比如910B等" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />`;
taskListCode = taskListCode.replace(uiFormOld, uiFormNew);

const uiDetailsOld = `<div>
                                 <span className="text-xs text-gray-500 block">服务器机型</span>
                                 <span className="text-sm">{viewTask.server_model || '-'}</span>
                               </div>`;
const uiDetailsNew = `<div>
                                 <span className="text-xs text-gray-500 block">服务器机型</span>
                                 <span className="text-sm">{viewTask.server_model || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">加速卡</span>
                                 <span className="text-sm">{viewTask.accelerator_card || '-'}</span>
                               </div>`;
taskListCode = taskListCode.replace(uiDetailsOld, uiDetailsNew);

fs.writeFileSync('src/pages/TaskList.tsx', taskListCode);
