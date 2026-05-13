const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

// The boolean condition for "not Accuracy + Full Suite"
const showModelConfigFields = `!(Number(testType) === 2 && Number(testMode) === 2)`;

// Replace testMode === 1 with the new condition for model_name
code = code.replace(
  /\{\/\* 5\. 模型名称 - 仅单模型测试显示 \*\/\}\s*\{Number\(testMode\) === 1 && \(/,
  `{/* 5. 模型名称 */}\n                    {${showModelConfigFields} && (`
);

// Replace testMode === 1 with the new condition for npu_count
code = code.replace(
  /\{\/\* 6\. 加速卡数量 - 仅单模型测试显示 \*\/\}\s*\{Number\(testMode\) === 1 && \(/,
  `{/* 6. 加速卡数量 */}\n                    {${showModelConfigFields} && (`
);

// Add processor_type after npu_count
const npuCountBlockEnd = `</FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}`;

const processorTypeBlock = `
                    {/* 处理器 - 仅性能测试显示 */}
                    {Number(testType) === 1 && (
                    <FormField
                     control={form.control}
                     name="processor_type"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>处理器类型 <span className="text-red-500">*</span></FormLabel>
                         <Select onValueChange={field.onChange} value={field.value || 'NPU'}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="选择处理器类型" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="NPU">NPU</SelectItem>
                             <SelectItem value="GPU">GPU</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}`;

code = code.replace(npuCountBlockEnd, npuCountBlockEnd + processorTypeBlock);

// Replace testMode === 1 for graph_mode
code = code.replace(
  /\{\/\* 7\. 图模式 - 仅单模型测试且vLLM显示 \*\/\}\s*\{Number\(testMode\) === 1 && Number\(inferenceFramework\) === 1 && \(/,
  `{/* 7. 图模式 */}\n                    {${showModelConfigFields} && Number(inferenceFramework) === 1 && (`
);

// Replace testMode === 1 for execution_id
code = code.replace(
  /\{\/\* 8\. 执行标识 - 仅单模型测试且vLLM显示 \*\/\}\s*\{Number\(testMode\) === 1 && Number\(inferenceFramework\) === 1 && \(/,
  `{/* 8. 执行标识 */}\n                    {${showModelConfigFields} && Number(inferenceFramework) === 1 && (`
);

fs.writeFileSync('src/pages/TaskList.tsx', code);
