import re

with open('src/pages/TaskList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's wrap startup_mode with the condition.
original_startup_mode = """<FormField
                    control={form.control}
                    name="startup_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>启动模式 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  />"""

new_startup_mode = """{Number(testType) === 1 && Number(testMode) === 1 && (
                  <FormField
                    control={form.control}
                    name="startup_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>启动模式 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  />
                  )}"""

content = content.replace(original_startup_mode, new_startup_mode)

with open('src/pages/TaskList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
