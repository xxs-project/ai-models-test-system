const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const oldViewDialogFields = `                     <div>
                      <span className="text-xs text-gray-500 block">模型路径</span>
                      <span className="text-sm break-all">{viewTask.model_path}</span>
                     </div>
                       {viewTask.test_mode === 1 && (
                         <>
                           <div>
                             <span className="text-xs text-gray-500 block">测试路径</span>
                             <span className="text-sm break-all">{viewTask.script_path || '-'}</span>
                           </div>
                           <div>
                             <span className="text-xs text-gray-500 block">模型名称</span>
                             <span className="text-sm">{viewTask.model_name}</span>
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
                           {viewTask.startup_mode === 'api' && (`;

const newViewDialogFields = `                     <div>
                      <span className="text-xs text-gray-500 block">模型路径</span>
                      <span className="text-sm break-all">{viewTask.model_path}</span>
                     </div>
                     <div>
                       <span className="text-xs text-gray-500 block">测试路径</span>
                       <span className="text-sm break-all">{viewTask.script_path || '-'}</span>
                     </div>
                     {!(viewTask.test_type === 2 && viewTask.test_mode === 2) && (
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
                     )}
                     {viewTask.test_type === 2 && viewTask.test_mode === 1 && (
                       <div>
                         <span className="text-xs text-gray-500 block">数据集名称</span>
                         <span className="text-sm">{viewTask.dataset_name || '-'}</span>
                       </div>
                     )}
                       {viewTask.test_mode === 1 && (
                         <>
                           {viewTask.startup_mode === 'api' && (`;

code = code.replace(oldViewDialogFields, newViewDialogFields);

// Remove the duplicated processor_type inside the API view section because we already show it unconditionally for performance tests
code = code.replace(`                               <div>
                                 <span className="text-xs text-gray-500 block">处理器类型</span>
                                 <span className="text-sm">{viewTask.processor_type || '-'}</span>
                               </div>`, '');

fs.writeFileSync('src/pages/TaskList.tsx', code);
