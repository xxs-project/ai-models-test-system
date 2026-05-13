const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const newCond = 'Number(testMode) === 1';

code = code.replace(
  /\{\/\* 5\. 模型名称 \*\/\}\n\s*\{!\(Number\(testType\) === 2 && Number\(testMode\) === 2\) && \(/,
  '{/* 5. 模型名称 */}\n                    {' + newCond + ' && ('
);

code = code.replace(
  /\{\/\* 6\. 加速卡数量 \*\/\}\n\s*\{!\(Number\(testType\) === 2 && Number\(testMode\) === 2\) && \(/,
  '{/* 6. 加速卡数量 */}\n                    {' + newCond + ' && ('
);

code = code.replace(
  /\{\/\* 7\. 图模式 \*\/\}\n\s*\{!\(Number\(testType\) === 2 && Number\(testMode\) === 2\) && Number\(inferenceFramework\) === 1 && \(/,
  '{/* 7. 图模式 */}\n                    {' + newCond + ' && Number(inferenceFramework) === 1 && ('
);

code = code.replace(
  /\{\/\* 8\. 执行标识 \*\/\}\n\s*\{!\(Number\(testType\) === 2 && Number\(testMode\) === 2\) && Number\(inferenceFramework\) === 1 && \(/,
  '{/* 8. 执行标识 */}\n                    {' + newCond + ' && Number(inferenceFramework) === 1 && ('
);

fs.writeFileSync('src/pages/TaskList.tsx', code);
