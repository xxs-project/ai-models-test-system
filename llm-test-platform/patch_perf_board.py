import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

# Add state
old_state = """  const [filterModel, setFilterModel] = useState<string>('all')"""
new_state = """  const [filterScenario, setFilterScenario] = useState<string>('all')
  const [filterModel, setFilterModel] = useState<string>('all')"""
content = content.replace(old_state, new_state)

# Add options
old_options = """  const modelOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.modelName).filter(Boolean))), [benchmarks])"""
new_options = """  const scenarioOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.scenario).filter(Boolean))), [benchmarks])
  const modelOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.modelName).filter(Boolean))), [benchmarks])"""
content = content.replace(old_options, new_options)

# Add filter logic
old_filter = """      if (filterModel !== 'all' && b.config.modelName !== filterModel) return"""
new_filter = """      if (filterScenario !== 'all' && (b.config.scenario || '对话') !== filterScenario) return
      if (filterModel !== 'all' && b.config.modelName !== filterModel) return"""
content = content.replace(old_filter, new_filter)

# Add reset logic
old_reset = """                  setFilterModel('all')
                  setFilterFeatures([])"""
new_reset = """                  setFilterScenario('all')
                  setFilterModel('all')
                  setFilterFeatures([])"""
content = content.replace(old_reset, new_reset)

# Add UI
old_ui = """            <div className="flex flex-wrap gap-5 items-end">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型名称</Label>"""
new_ui = """            <div className="flex flex-wrap gap-5 items-end">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">场景</Label>
                <Select value={filterScenario} onValueChange={setFilterScenario}>
                  <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {scenarioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型名称</Label>"""
content = content.replace(old_ui, new_ui)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("PerfBoard patched.")
