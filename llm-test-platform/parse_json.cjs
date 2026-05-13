const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const jsonParseLogic = `                                   {viewTask.parameter_combination ? (
                                     <pre className="whitespace-pre-wrap">{viewTask.parameter_combination}</pre>
                                   ) : '-'}`;

const newJsonParseLogic = `                                   {viewTask.parameter_combination ? (
                                     <pre className="whitespace-pre-wrap">
                                       {(() => {
                                         try {
                                           return JSON.stringify(JSON.parse(viewTask.parameter_combination), null, 2);
                                         } catch (e) {
                                           return viewTask.parameter_combination;
                                         }
                                       })()}
                                     </pre>
                                   ) : '-'}`;

code = code.replace(jsonParseLogic, newJsonParseLogic);

fs.writeFileSync('src/pages/TaskList.tsx', code);
