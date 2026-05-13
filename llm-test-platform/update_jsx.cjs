const fs = require('fs');

let content = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const startupModeField = `                  <FormField
                    control={form.control}
                    name="startup_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>启动模式 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="api">直连API</SelectItem>
                            <SelectItem value="container">容器化启动</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />`;

// Change grid-cols-2 to grid-cols-3
content = content.replace(
  `<h3 className="font-semibold text-slate-900">测试配置</h3>
                <div className="grid grid-cols-2 gap-4">`,
  `<h3 className="font-semibold text-slate-900">测试配置</h3>
                <div className="grid grid-cols-3 gap-4">`
);

content = content.replace(
  `</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>`,
  `</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
${startupModeField}
                </div>`
);

// Now conditional rendering for "设备配置" and "模型配置"
// We want to hide them if startupMode === 'api'
// And instead show the new sections

const newConfigJSX = `
              {startupMode === 'api' && (
                <>
                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-semibold text-slate-900">性能测试配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="base_url" render={({ field }) => (
                        <FormItem><FormLabel>接口地址 (BASE_URL) <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="http://api..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="model_name" render={({ field }) => (
                        <FormItem><FormLabel>模型名称 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="Qwen-14B" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="api_key" render={({ field }) => (
                        <FormItem><FormLabel>鉴权密钥</FormLabel><FormControl><Input placeholder="Bearer token..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="model_path" render={({ field }) => (
                        <FormItem><FormLabel>模型路径 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="/data/models/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parameter_combination" render={({ field }) => (
                        <FormItem><FormLabel>参数组合</FormLabel><FormControl><Input placeholder='{"top_p": 0.8}' {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="test_path" render={({ field }) => (
                        <FormItem><FormLabel>测试路径 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="/data/scripts/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="processor_type" render={({ field }) => (
                        <FormItem><FormLabel>处理器类型 <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="NPU">NPU</SelectItem><SelectItem value="GPU">GPU</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="graph_mode" render={({ field }) => (
                        <FormItem><FormLabel>图模式</FormLabel><FormControl><Input placeholder="aclgraph" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4 pb-6">
                    <h3 className="font-semibold text-slate-900">服务器及推理框架配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="server_model" render={({ field }) => (
                        <FormItem><FormLabel>服务器机型</FormLabel><FormControl><Input placeholder="Atlas 800T A2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="npu_count" render={({ field }) => (
                        <FormItem><FormLabel>加速卡数量 <span className="text-red-500">*</span></FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="inference_framework" render={({ field }) => (
                        <FormItem><FormLabel>推理框架 <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="1">vLLM</SelectItem><SelectItem value="2">MindIE</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="framework_version" render={({ field }) => (
                        <FormItem><FormLabel>推理框架版本 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="v1.0.1" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="framework_startup_args" render={({ field }) => (
                        <FormItem><FormLabel>框架启动参数</FormLabel><FormControl><Input placeholder="--tensor-parallel-size 1" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </>
              )}
`;

content = content.replace(
  `{/* 设备配置 */}`,
  `${newConfigJSX}\n              {/* 设备配置 */}\n              {startupMode === 'container' && (`
);

content = content.replace(
  `<div className="space-y-4 pb-6">
                <h3 className="font-semibold text-slate-900">模型配置</h3>`,
  `)}\n              {/* 模型配置 */}\n              {startupMode === 'container' && (\n              <div className="space-y-4 pb-6">\n                <h3 className="font-semibold text-slate-900">模型配置</h3>`
);

content = content.replace(
  `{/* Dataset Name - 仅精度测试且单模型测试显示 */}`,
  `{/* Dataset Name - 仅精度测试且单模型测试显示 */}`
);

// We need to close the conditional for container model config.
content = content.replace(
  `                  </div>
               </div>

              <DialogFooter className="gap-3">`,
  `                  </div>
               </div>\n              )}\n\n              <DialogFooter className="gap-3">`
);

fs.writeFileSync('src/pages/TaskList.tsx', content);
