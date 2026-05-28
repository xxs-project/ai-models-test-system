import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Let's add the scenario field to the container mode as well so it matches API mode.
old_container_fields = """                    {/* 6. 加速卡数量 */}
                    {Number(testMode) === 1 && (
                    <FormField
                     control={form.control}
                     name="npu_count"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>加速卡数量 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input type="number" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}"""

new_container_fields = """                    {/* 6. 加速卡数量 */}
                    {Number(testMode) === 1 && (
                    <FormField
                     control={form.control}
                     name="npu_count"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>加速卡数量 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input type="number" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}

                    {/* 场景 */}
                    <FormField control={form.control} name="scenario" render={({ field }) => (
                      <FormItem><FormLabel>场景</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="对话">对话</SelectItem>
                            <SelectItem value="Agent">Agent</SelectItem>
                            <SelectItem value="AI Coding">AI Coding</SelectItem>
                            <SelectItem value="Openclaw">Openclaw</SelectItem>
                            <SelectItem value="文档写作">文档写作</SelectItem>
                            <SelectItem value="通用">通用</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />"""

if old_container_fields in content:
    content = content.replace(old_container_fields, new_container_fields)
    with open('src/pages/TaskList.tsx', 'w') as f:
        f.write(content)
    print("Scenario added to container mode form.")
else:
    print("Could not find the target string in container mode.")
