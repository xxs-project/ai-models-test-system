const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

// Insert startup_mode info right after test_mode info
const testModeDiv = `<h4 className="text-sm font-medium text-gray-500">测试模式</h4>
                  <p className="mt-1 text-sm text-gray-900">{viewTask.test_mode === 1 ? '单模型测试' : '全套模型测试'}</p>
                </div>`;
const startupModeDiv = `${testModeDiv}
                {viewTask.test_type === 1 && viewTask.test_mode === 1 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">启动模式</h4>
                  <p className="mt-1 text-sm text-gray-900">{viewTask.startup_mode === 'api' ? '直连API' : '容器化启动'}</p>
                </div>
                )}`;
code = code.replace(testModeDiv, startupModeDiv);

// Insert API details
const configDetailsStart = `<div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">配置详情</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">`;

// We will add conditional rendering.
// Since container mode shows one thing, API mode shows something else.
// Or we just add API details to the existing config details conditionally.

// Wait, the prompt says "单模型测试选择直连API启动时新增在任务详情中需要呈现".
// So let's replace the whole config block or add a new block for API specific details.
const executionFlagDiv = `                           {/* 执行标识 - 仅vLLM显示 */}
                           {viewTask.inference_framework === 1 && (
                             <div>
                               <span className="text-xs text-gray-500 block">执行标识</span>
                               <span className="text-sm">
                                 {viewTask.execution_flag === '1' ? '自定义性能脚本' : 
                                  viewTask.execution_flag === '2' ? 'VLLM基准测试脚本' : 
                                  viewTask.execution_flag || '-'}
                               </span>
                             </div>
                           )}`;

const apiDetailsDiv = `${executionFlagDiv}
                           {viewTask.startup_mode === 'api' && (
                             <>
                               <div>
                                 <span className="text-xs text-gray-500 block">接口地址</span>
                                 <span className="text-sm break-all">{viewTask.base_url || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">鉴权密钥</span>
                                 <span className="text-sm">{viewTask.api_key ? '***' : '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">处理器类型</span>
                                 <span className="text-sm">{viewTask.processor_type || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">服务器机型</span>
                                 <span className="text-sm">{viewTask.server_model || '-'}</span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-xs text-gray-500 block">框架启动参数</span>
                                 <span className="text-sm break-all">{viewTask.framework_startup_args || '-'}</span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-xs text-gray-500 block mb-1">参数组合</span>
                                 <div className="text-sm bg-white p-2 border rounded">
                                   {viewTask.parameter_combination ? (
                                     <pre className="whitespace-pre-wrap">{viewTask.parameter_combination}</pre>
                                   ) : '-'}
                                 </div>
                               </div>
                             </>
                           )}`;

code = code.replace(executionFlagDiv, apiDetailsDiv);

// Container logic: wait, when it's API mode, `device_ip` shouldn't be required but if we just append this it's fine. 
// "单模型测试选择直连API启动时新增在任务详情中需要呈现"

fs.writeFileSync('src/pages/TaskList.tsx', code);
