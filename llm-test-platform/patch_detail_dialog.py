import sys

with open('src/components/BenchmarkDetailDialog.tsx', 'r') as f:
    content = f.read()

# Add scenario and features to editConfig initialization
old_init = """        frameworkParams: benchmark.config?.frameworkParams || '',
        dataset_args: benchmark.config?.dataset_args || '',
        testDate: benchmark.config?.testDate || '',
        notes: benchmark.config?.notes || '','""\""""

if 'scenario: benchmark.config?.scenario' not in content:
    content = content.replace(
        "frameworkParams: benchmark.config?.frameworkParams || '',",
        "frameworkParams: benchmark.config?.frameworkParams || '',\n        scenario: benchmark.config?.scenario || '对话',\n        features: benchmark.config?.features || [],"
    )

# Add Select imports if not present
if "Select," not in content:
    content = content.replace("import { Label } from '@/components/ui/label'", "import { Label } from '@/components/ui/label'\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'")

# Now add the fields to the UI under config tab
old_ui = """                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="graphMode" className="text-right">图模式</Label>"""

new_ui = """                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">场景</Label>
                    <div className="col-span-3">
                      <Select
                        value={editConfig?.scenario || '对话'}
                        onValueChange={(value) => setEditConfig(prev => prev ? { ...prev, scenario: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="对话">对话</SelectItem>
                          <SelectItem value="Agent">Agent</SelectItem>
                          <SelectItem value="AI Coding">AI Coding</SelectItem>
                          <SelectItem value="Openclaw">Openclaw</SelectItem>
                          <SelectItem value="文档写作">文档写作</SelectItem>
                          <SelectItem value="通用">通用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="graphMode" className="text-right">图模式</Label>"""

content = content.replace(old_ui, new_ui)

with open('src/components/BenchmarkDetailDialog.tsx', 'w') as f:
    f.write(content)
print("Detail dialog patched.")
