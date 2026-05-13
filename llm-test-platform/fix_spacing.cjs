const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const oldHeader = `<div className="space-y-3">
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 text-center">
                              <div>input_len</div>
                              <div>output_len</div>
                              <div>num_prompts</div>
                              <div>max_concurrency</div>
                            </div>
                            <div className="w-[80px]"></div>
                          </div>`;

const newHeader = `<div className="space-y-2 mt-1">
                          <div className="flex gap-2 items-center px-1">
                            <div className="flex-1 grid grid-cols-4 gap-4 text-xs font-semibold text-slate-500 text-left">
                              <div>input_len</div>
                              <div>output_len</div>
                              <div>num_prompts</div>
                              <div>max_concurrency</div>
                            </div>
                            <div className="w-[80px]"></div>
                          </div>`;

code = code.replace(oldHeader, newHeader);

// Adjust map flex items-center to items-start in case form messages add height
const oldMapRow = `<div key={field.id} className="flex gap-2 items-center">`;
const newMapRow = `<div key={field.id} className="flex gap-2 items-start">`;
code = code.replace(oldMapRow, newMapRow);

// Add mt-1 to the buttons container so they align with the input boxes visually
const oldButtons = `<div className="flex items-center gap-1 w-[80px]">`;
const newButtons = `<div className="flex items-center gap-1 w-[80px] mt-1">`;
code = code.replace(oldButtons, newButtons);

fs.writeFileSync('src/pages/TaskList.tsx', code);
