const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const oldHeader = `<div className="grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 text-center px-2">
                            <div>input_len</div>
                            <div>output_len</div>
                            <div>num_prompts</div>
                            <div>max_concurrency</div>
                          </div>`;

const newHeader = `<div className="flex gap-2 items-center">
                            <div className="flex-1 grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 text-center">
                              <div>input_len</div>
                              <div>output_len</div>
                              <div>num_prompts</div>
                              <div>max_concurrency</div>
                            </div>
                            <div className="w-[80px]"></div>
                          </div>`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/pages/TaskList.tsx', code);
