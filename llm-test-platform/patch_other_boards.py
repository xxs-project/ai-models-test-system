import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

# For InteractiveBoard and PerfDragonTigerBoard
# We need to replace:
#   const [model, setModel] = useState<string>('')
# with:
#   const [scenario, setScenario] = useState<string>('')
#   const [model, setModel] = useState<string>('')

content = content.replace("  const [model, setModel] = useState<string>('')", "  const [scenario, setScenario] = useState<string>('')\n  const [model, setModel] = useState<string>('')")

# Add filter in filteredByModelAndFeatures:
old_filter = """      if (model && b.config.modelName !== model) return false"""
new_filter = """      if (scenario && (b.config.scenario || '对话') !== scenario) return false
      if (model && b.config.modelName !== model) return false"""
content = content.replace(old_filter, new_filter)

# For InteractiveBoard UI
old_ib_ui = """              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型列表</Label>"""
new_ib_ui = """              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">场景</Label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择场景" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {scenarioOptions.map(o => <SelectItem key={o} value={o || '全部'}>{o || '全部'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型列表</Label>"""
content = content.replace(old_ib_ui, new_ib_ui)

# Update the reset in InteractiveBoard and PerfDragonTigerBoard
old_reset = """                  setModel('')
                  setFeatures([])"""
new_reset = """                  setScenario('')
                  setModel('')
                  setFeatures([])"""
content = content.replace(old_reset, new_reset)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Other boards patched.")
