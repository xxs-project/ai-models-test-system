import sys

components = """
function EvalLadderBoard() {
  const [reports, setReports] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('BenchLocal')

  useEffect(() => {
    fetch('/api/eval/results')
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(console.error)
  }, [])

  const getDimensionScore = (r: any, dimKey: string) => {
    if (dimKey === 'score') return r.percent || 0;
    
    if (activeTab === 'BenchLocal') {
      const pack = r.packs.find((p: any) => p.name && p.name.toLowerCase().includes(dimKey.toLowerCase()))
      if (pack && pack.maxScore > 0) {
        return (pack.score / pack.maxScore) * 100
      }
      return 0
    } else {
      for (const pack of r.packs) {
        if (pack.cases) {
          const c = pack.cases.find((c: any) => {
            const name = c.id.split(' - ')[1] || c.id;
            const finalName = (name === '组织与人才发展' || name === '项目进度与风险治理') ? '组织支撑与运营' : name;
            return finalName.includes(dimKey);
          })
          if (c && c.score !== undefined) {
            return parseFloat(c.score) || 0;
          }
        }
      }
      return 0
    }
  }

  const getTopModels = (dimKey: string) => {
    const byType = reports.filter(r => r.type === activeTab)
    const bestScores = new Map<string, any>()
    byType.forEach(r => {
      const existing = bestScores.get(r.model_name)
      const currentScore = getDimensionScore(r, dimKey)
      const existingScore = existing ? getDimensionScore(existing, dimKey) : -1
      
      if (!existing || currentScore > existingScore) {
        bestScores.set(r.model_name, r)
      }
    })
    
    return Array.from(bestScores.values())
      .map(r => ({ model_name: r.model_name, score: getDimensionScore(r, dimKey) }))
      .sort((a, b) => b.score - a.score)
  }

  const dimensionsBenchLocal = [
    { title: '综合能力榜单', key: 'score' },
    { title: '工具调用榜单', key: 'toolcall' },
    { title: '指令遵循榜单', key: 'instructfollow' },
    { title: '数理推理榜单', key: 'reasonmath' },
    { title: '信息抽取榜单', key: 'dataextract' },
    { title: '代码漏洞榜单', key: 'bugfind' },
    { title: '结构化输出榜单', key: 'structoutput' },
    { title: 'Agent规划榜单', key: 'hermesagent' },
    { title: '运维命令榜单', key: 'cli-40' }
  ]

  const dimensionsIPD = [
    { title: '综合能力榜单', key: 'score' },
    { title: '机会识别榜单', key: '机会识别' },
    { title: '概念阶段榜单', key: '概念阶段' },
    { title: '计划阶段榜单', key: '计划阶段' },
    { title: '开发阶段榜单', key: '开发阶段' },
    { title: '验证阶段榜单', key: '验证阶段' },
    { title: '发布阶段榜单', key: '发布阶段' },
    { title: '生命周期管理榜单', key: '生命周期管理' },
    { title: '组织支撑与运营榜单', key: '组织支撑与运营' }
  ]

  const currentDimensions = activeTab === 'BenchLocal' ? dimensionsBenchLocal : dimensionsIPD;

  const LadderColumn = ({ title, data }: { title: string, data: { model_name: string, score: number }[] }) => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-full hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
          <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        
        <div className="space-y-3 flex-1">
          {data.length === 0 && <div className="text-sm text-slate-400 text-center py-8">暂无数据</div>}
          {data.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-bold
                ${idx === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' : 
                  idx === 1 ? 'bg-slate-200 text-slate-600 shadow-sm' : 
                  idx === 2 ? 'bg-orange-100 text-orange-600 shadow-sm' : 
                  'bg-slate-50 text-slate-400'}`}>
                {idx + 1}
              </div>
              <div className="flex-1 text-sm font-semibold text-slate-700 truncate" title={item.model_name}>
                {item.model_name}
              </div>
              <div className="text-sm font-bold text-blue-600 w-12 text-right">
                {item.score.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100/80 p-1.5 rounded-xl">
          <button 
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'BenchLocal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('BenchLocal')}
          >
            BenchLocal 测试集
          </button>
          <button 
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'IPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('IPD')}
          >
            IPD 测试集
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentDimensions.map(dim => (
          <LadderColumn key={dim.key} title={dim.title} data={getTopModels(dim.key)} />
        ))}
      </div>
    </div>
  )
}

function PerfDragonTigerBoard() {
  const { data: benchmarksData, isLoading } = useBenchmarks({ size: 1000 })
  const benchmarks = benchmarksData?.items || []

  const [model, setModel] = useState<string>('')
  const [features, setFeatures] = useState<string[]>([])
  const [server, setServer] = useState<string>('')
  const [card, setCard] = useState<string>('')
  const [framework, setFramework] = useState<string>('')
  const [frameworkVersion, setFrameworkVersion] = useState<string>('')
  const [dimension, setDimension] = useState<string>('')

  const modelOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.modelName).filter(Boolean))), [benchmarks])
  const featuresOptions = ['FP4', 'FP8', '投机推理', 'KV Cache卸载', 'KV稀疏']
  const serverOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.serverName).filter(Boolean))), [benchmarks])

  const filteredByModelAndFeatures = useMemo(() => {
    return benchmarks.filter(b => {
      if (model && b.config.modelName !== model) return false
      const bFeatures = b.config.features || []
      const bFeaturesArr = Array.isArray(bFeatures) ? bFeatures : (typeof bFeatures === 'string' ? bFeatures.split(',') : [])
      if (features.length > 0) {
        if (features.length !== bFeaturesArr.length || !features.every(f => bFeaturesArr.includes(f))) {
          return false
        }
      }
      return true
    })
  }, [benchmarks, model, features])

  const cardOptions = useMemo(() => {
    const opts = new Set(filteredByModelAndFeatures.map(b => b.config.chipName).filter(Boolean))
    if (card && !opts.has(card)) opts.add(card)
    return Array.from(opts)
  }, [filteredByModelAndFeatures, card])
  
  const frameworkOptions = useMemo(() => {
    const opts = new Set(filteredByModelAndFeatures.map(b => b.config.framework).filter(Boolean))
    if (framework && !opts.has(framework)) opts.add(framework)
    return Array.from(opts)
  }, [filteredByModelAndFeatures, framework])
  
  const frameworkVersionOptions = useMemo(() => {
    const opts = new Set(filteredByModelAndFeatures.map(b => b.config.frameworkVersion).filter(Boolean))
    if (frameworkVersion && !opts.has(frameworkVersion)) opts.add(frameworkVersion)
    return Array.from(opts)
  }, [filteredByModelAndFeatures, frameworkVersion])

  const allSelected = model && features.length > 0 && server && card && framework && frameworkVersion && dimension

  const bestRecords = useMemo(() => {
    if (!allSelected) return []

    const matchingRecords = filteredByModelAndFeatures.filter(b => 
      b.config.serverName === server &&
      b.config.chipName === card &&
      b.config.framework === framework &&
      b.config.frameworkVersion === frameworkVersion
    )

    if (matchingRecords.length === 0) return []

    const recordsByScenario = new Map<string, Benchmark[]>()
    matchingRecords.forEach(b => {
      const scenario = b.config.scenario || '对话'
      if (!recordsByScenario.has(scenario)) {
        recordsByScenario.set(scenario, [])
      }
      recordsByScenario.get(scenario)!.push(b)
    })

    const compareRecords = (a: Benchmark, b: Benchmark, dim: string) => {
      let scoreA = 0
      let scoreB = 0
      
      const metricsA = a.metrics || []
      const metricsB = b.metrics || []
      const mapB = new Map()
      metricsB.forEach(m => mapB.set(`${m.concurrency}-${m.inputLength}-${m.outputLength}`, m))

      metricsA.forEach(mA => {
         const key = `${mA.concurrency}-${mA.inputLength}-${mA.outputLength}`
         const mB = mapB.get(key)
         if (mB) {
            if (dim === 'ttft') {
               const valA = mA.ttft
               const valB = mB.ttft
               if (valA > 0 && valB > 0) {
                  if (valA < valB) scoreA++
                  else if (valB < valA) scoreB++
               } else if (valA > 0) { scoreA++ } else if (valB > 0) { scoreB++ }
            } else if (dim === 'tps') {
               const cardCountA = parseCardCount(a.config.shardingConfig)
               const cardCountB = parseCardCount(b.config.shardingConfig)
               const tpsA = mA.tokensPerSecond / cardCountA
               const tpsB = mB.tokensPerSecond / cardCountB
               if (tpsA > 0 && tpsB > 0) {
                  if (tpsA > tpsB) scoreA++
                  else if (tpsB > tpsA) scoreB++
               } else if (tpsA > 0) { scoreA++ } else if (tpsB > 0) { scoreB++ }
            }
         }
      })
      return scoreA - scoreB
    }

    const bests: Benchmark[] = []
    recordsByScenario.forEach(records => {
      let best = records[0]
      for (let i = 1; i < records.length; i++) {
          if (compareRecords(records[i], best, dimension) > 0) {
              best = records[i]
          }
      }
      bests.push(best)
    })
    
    return bests
  }, [allSelected, filteredByModelAndFeatures, server, card, framework, frameworkVersion, dimension])

  const ButtonGroup = ({ label, options, value, onChange, isMulti = false, optionLabels }: any) => {
    if (!options || options.length === 0) return null;
    return (
      <div className="flex flex-col gap-3 py-3 border-b border-slate-100/50 last:border-0">
        <Label className="text-sm font-bold text-slate-700">{label}</Label>
        <div className="flex flex-wrap gap-3">
          {options.map((opt: string) => {
            const isSelected = isMulti ? value.includes(opt) : value === opt;
            const displayLabel = optionLabels ? (optionLabels[opt] || opt) : opt;
            return (
              <button
                key={opt}
                onClick={() => {
                  if (isMulti) {
                    onChange(isSelected ? value.filter((v: string) => v !== opt) : [...value, opt])
                  } else {
                    onChange(isSelected ? '' : opt)
                  }
                }}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {displayLabel}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
          <div className="flex items-center gap-2 text-base font-bold text-slate-800">
            <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
            龙虎榜筛选配置
          </div>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800" onClick={() => {
            setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
          }}>重置所有条件</Button>
        </div>
        <CardContent className="p-6 space-y-2 bg-slate-50/30">
          <ButtonGroup label="模型列表" options={modelOptions} value={model} onChange={setModel} />
          <ButtonGroup label="机型列表" options={serverOptions} value={server} onChange={setServer} />
          <ButtonGroup label="加速卡列表" options={cardOptions} value={card} onChange={setCard} />
          <ButtonGroup label="推理框架列表" options={frameworkOptions} value={framework} onChange={setFramework} />
          <ButtonGroup label="推理框架版本" options={frameworkVersionOptions} value={frameworkVersion} onChange={setFrameworkVersion} />
          <ButtonGroup label="对比维度" options={['ttft', 'tps']} value={dimension} onChange={setDimension} optionLabels={{'ttft': 'TTFT', 'tps': '每卡 TPS'}} />
          <ButtonGroup label="特性列表" options={featuresOptions} value={features} onChange={setFeatures} isMulti={true} />
        </CardContent>
      </Card>

      {allSelected ? (
        bestRecords.length > 0 ? (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Trophy className="w-7 h-7 text-yellow-500" />
              龙虎霸榜记录
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bestRecords.flatMap(record => 
                record.metrics.map((m: any, i: number) => {
                  const cardCount = parseCardCount(record.config.shardingConfig)
                  const tps = m.tokensPerSecond / cardCount
                  return (
                    <div key={`${record.id}-${i}`} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute -right-12 -top-12 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-md">
                            {record.config.scenario || '通用对话'}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">并发数</div>
                            <div className="text-2xl font-black text-slate-800 leading-none">{m.concurrency}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 mb-6 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                          <div className="flex-1 text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">输入长度</div>
                            <div className="text-lg font-bold text-slate-700">{m.inputLength}</div>
                          </div>
                          <div className="w-px bg-slate-200" />
                          <div className="flex-1 text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">输出长度</div>
                            <div className="text-lg font-bold text-slate-700">{m.outputLength}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-4 rounded-xl flex flex-col items-center justify-center ${dimension === 'ttft' ? 'bg-blue-50 border-2 border-blue-200 shadow-inner' : 'bg-slate-50 border border-slate-100'}`}>
                            <div className="text-xs font-bold text-slate-500 mb-1">TTFT</div>
                            <div className={`text-xl font-black ${dimension === 'ttft' ? 'text-blue-600' : 'text-slate-800'}`}>
                              {m.ttft.toFixed(2)}<span className="text-xs font-semibold text-slate-400 ml-1">ms</span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-xl flex flex-col items-center justify-center ${dimension === 'tps' ? 'bg-green-50 border-2 border-green-200 shadow-inner' : 'bg-slate-50 border border-slate-100'}`}>
                            <div className="text-xs font-bold text-slate-500 mb-1">TPS/卡</div>
                            <div className={`text-xl font-black ${dimension === 'tps' ? 'text-green-600' : 'text-slate-800'}`}>
                              {tps.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
              <Medal className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">暂无龙虎榜数据</h3>
            <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
              当前组合配置下没有找到跑分记录，请尝试切换其他模型或框架组合。
            </p>
          </div>
        )
      ) : (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-3">等待生成龙虎榜</h3>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            请依次点击上方所有必选按钮（模型、机型、加速卡、框架、版本、维度及至少一项特性），以发掘最强性能组合。
          </p>
        </div>
      )}
    </div>
  )
}
"""

with open('src/pages/Board.tsx', 'a') as f:
    f.write(components)
print("Components appended.")
