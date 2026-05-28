import os

file_path = "../../src/pages/Board.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Cancel filterScenario UI in PerfBoard
perf_board_scenario_ui = """              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">场景</Label>
                <Select value={filterScenario} onValueChange={setFilterScenario}>
                  <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {scenarioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>"""

content = content.replace(perf_board_scenario_ui, "")

# 2. Cancel scenario UI in InteractiveBoard
interactive_board_scenario_ui = """              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">场景</Label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择场景" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {scenarioOptions.map(o => <SelectItem key={o} value={o || '全部'}>{o || '全部'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>"""

content = content.replace(interactive_board_scenario_ui, "")

# 3. Cancel scenario ButtonGroup UI in PerfDragonTigerBoard
perf_dragon_scenario_ui = """          <ButtonGroup label="场景" options={scenarioOptions} value={scenario} onChange={setScenario} />\n"""
content = content.replace(perf_dragon_scenario_ui, "")

# 4. Replace PerfDragonTigerBoard grid with Table
# Find the start and end of the block to replace in PerfDragonTigerBoard
start_marker = """          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Trophy className="w-7 h-7 text-yellow-500" />
              龙虎霸榜记录
            </div>"""

end_marker = """            </div>
          </div>
        ) : ("""

table_replacement = """          <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">vLLM Benchmark结果</CardTitle>
            <p className="text-sm text-slate-500 mt-1">当前：{model} / {features.join(',')} / {server}+{card} / {dimension === 'ttft' ? 'TTFT' : '每卡 TPS'}</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>场景</TableHead>
                    <TableHead>并发数</TableHead>
                    <TableHead>输入长度</TableHead>
                    <TableHead>输出长度</TableHead>
                    <TableHead>TTFT (ms)</TableHead>
                    <TableHead>每卡TPS</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bestRecords.flatMap(record => 
                    record.metrics.map((m: any, i: number) => {
                      const cardCount = parseCardCount(record.config.shardingConfig)
                      const tps = m.tokensPerSecond / cardCount
                      return (
                        <TableRow key={`${record.id}-${i}`}>
                          <TableCell>{record.config.scenario || '-'}</TableCell>
                          <TableCell>{m.concurrency}</TableCell>
                          <TableCell>{m.inputLength}</TableCell>
                          <TableCell>{m.outputLength}</TableCell>
                          <TableCell>{m.ttft.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">{tps.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setViewDetails(record)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        ) : ("""

# Replace in content
start_idx = content.find(start_marker)
if start_idx != -1:
    end_idx = content.find(end_marker, start_idx)
    if end_idx != -1:
        content = content[:start_idx] + table_replacement + content[end_idx + len(end_marker):]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacement done.")