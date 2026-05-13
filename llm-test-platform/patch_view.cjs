const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const oldBlock = `{!(viewTask.test_type === 2 && viewTask.test_mode === 2) && (
                       <>
                         <div>
                           <span className="text-xs text-gray-500 block">模型名称</span>
                           <span className="text-sm">{viewTask.model_name || '-'}</span>
                         </div>
                         <div>
                           <span className="text-xs text-gray-500 block">加速卡数量</span>
                           <span className="text-sm">{viewTask.npu_count || '-'}</span>
                         </div>
                         {/* 仅性能测试显示处理器 */}
                         {viewTask.test_type === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">处理器类型</span>
                             <span className="text-sm">{viewTask.processor_type || '-'}</span>
                           </div>
                         )}
                         {/* 图模式 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">图模式</span>
                             <span className="text-sm">{viewTask.graph_mode || '-'}</span>
                           </div>
                         )}
                         {/* 执行标识 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">执行标识</span>
                             <span className="text-sm">
                               {viewTask.execution_flag === '1' ? '自定义性能脚本' : 
                                viewTask.execution_flag === '2' ? 'VLLM基准测试脚本' : 
                                viewTask.execution_flag || '-'}
                             </span>
                           </div>
                         )}
                       </>
                     )}`;

const newBlock = `                     {/* 仅性能测试显示处理器 */}
                     {viewTask.test_type === 1 && (
                       <div>
                         <span className="text-xs text-gray-500 block">处理器类型</span>
                         <span className="text-sm">{viewTask.processor_type || '-'}</span>
                       </div>
                     )}
                     {viewTask.test_mode === 1 && (
                       <>
                         <div>
                           <span className="text-xs text-gray-500 block">模型名称</span>
                           <span className="text-sm">{viewTask.model_name || '-'}</span>
                         </div>
                         <div>
                           <span className="text-xs text-gray-500 block">加速卡数量</span>
                           <span className="text-sm">{viewTask.npu_count || '-'}</span>
                         </div>
                         {/* 图模式 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">图模式</span>
                             <span className="text-sm">{viewTask.graph_mode || '-'}</span>
                           </div>
                         )}
                         {/* 执行标识 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">执行标识</span>
                             <span className="text-sm">
                               {viewTask.execution_flag === '1' ? '自定义性能脚本' : 
                                viewTask.execution_flag === '2' ? 'VLLM基准测试脚本' : 
                                viewTask.execution_flag || '-'}
                             </span>
                           </div>
                         )}
                       </>
                     )}`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/pages/TaskList.tsx', code);
