const fs = require('fs');
let code = fs.readFileSync('src/pages/TaskList.tsx', 'utf8');

const startupModeBlock = `                  {Number(testType) === 1 && Number(testMode) === 1 && (
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
                  )}`;

code = code.replace(startupModeBlock, '');

const testModeEnd = `                        <FormMessage />
                      </FormItem>
                    )}
                  />`;

// Find the last occurrence of testModeEnd within the testing config section
const parts = code.split('name="test_mode"');
const part1 = parts[0];
const part2 = parts[1];
const injectIndex = part2.indexOf(testModeEnd) + testModeEnd.length;

const newPart2 = part2.substring(0, injectIndex) + '\n' + startupModeBlock + part2.substring(injectIndex);

code = part1 + 'name="test_mode"' + newPart2;

fs.writeFileSync('src/pages/TaskList.tsx', code);
