const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const oldField = `                      <FormField control={form.control} name="parameter_combination" render={({ field }) => (
                        <FormItem><FormLabel>参数组合</FormLabel><FormControl><Input placeholder='{"top_p": 0.8}' {...field} /></FormControl><FormMessage /></FormItem>
                      )} />`;

const newField = `                      <div className="col-span-2 space-y-2 border p-4 rounded-lg bg-gray-50/50">
                        <FormLabel>参数组合</FormLabel>
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 text-center px-2">
                            <div>input_len</div>
                            <div>output_len</div>
                            <div>num_prompts</div>
                            <div>max_concurrency</div>
                          </div>
                          {paramFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-center">
                              <div className="flex-1 grid grid-cols-4 gap-4">
                                <FormField control={form.control} name={\`parameter_combinations.\${index}.input_len\`} render={({field}) => <FormItem><FormControl><Input placeholder="1024" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={\`parameter_combinations.\${index}.output_len\`} render={({field}) => <FormItem><FormControl><Input placeholder="1024" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={\`parameter_combinations.\${index}.num_prompts\`} render={({field}) => <FormItem><FormControl><Input placeholder="1" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={\`parameter_combinations.\${index}.max_concurrency\`} render={({field}) => <FormItem><FormControl><Input placeholder="1" {...field} /></FormControl></FormItem>} />
                              </div>
                              <div className="flex items-center gap-1 w-[80px]">
                                {index === paramFields.length - 1 && (
                                  <Button type="button" variant="outline" size="icon" onClick={() => appendParam({ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' })}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                                {paramFields.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeParam(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>`;

code = code.replace(oldField, newField);

fs.writeFileSync('src/pages/TaskList.tsx', code);
