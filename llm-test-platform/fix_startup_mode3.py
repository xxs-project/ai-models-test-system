import re

with open('src/pages/TaskList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to properly wrap the startup_mode Field

target = """                  <FormField
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

replacement = """                  {Number(testType) === 1 && Number(testMode) === 1 && (
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

if target in content:
    content = content.replace(target, replacement)
else:
    print("Could not find target block to replace!")

with open('src/pages/TaskList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
