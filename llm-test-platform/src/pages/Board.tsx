import { useState, useMemo, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Eye, ArrowUpDown, Search, Trophy, Medal, ChevronDown } from 'lucide-react'
import { useBenchmarks } from '@/hooks/use-benchmarks'
import { Benchmark } from '@/lib/types'
import { parseCardCount } from '@/lib/utils'
import { BenchmarkViewOnlyDialog } from '@/components/BenchmarkViewOnlyDialog'
import ReactECharts from 'echarts-for-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Board() {
  const [activeMainTab, setActiveMainTab] = useState('eval')
  
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">测评看板</h1>
          <p className="text-slate-500 mt-1 text-sm">多维度模型能力与性能综合分析</p>
        </div>
      </div>
      
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="mb-6 bg-slate-100/80 p-1 w-full sm:w-auto inline-flex">
          <TabsTrigger value="eval" className="flex-1 sm:flex-none px-6">测评榜单</TabsTrigger>
          <TabsTrigger value="perf" className="flex-1 sm:flex-none px-6">性能榜单</TabsTrigger>
          <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6">交互跑分面板</TabsTrigger>
        </TabsList>
        
        <TabsContent value="eval" className="space-y-4 focus-visible:outline-none">
          <EvalBoard />
        </TabsContent>
        
        <TabsContent value="perf" className="space-y-4 focus-visible:outline-none">
          <PerfBoard />
        </TabsContent>

        <TabsContent value="interactive" className="space-y-4 focus-visible:outline-none">
          <InteractiveBoard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EvalBoard() {
  const [reports, setReports] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('BenchLocal')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'score', direction: 'desc' })
  const [viewDetails, setViewDetails] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/eval/results')
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(console.error)
  }, [])

  const filteredReports = useMemo(() => {
    const byType = reports.filter(r => r.type === activeTab)
    const bestScores = new Map<string, any>()
    
    byType.forEach(r => {
      const existing = bestScores.get(r.model_name)
      // 如果当前模型还没有记录，或者当前记录的平均分数大于已有记录，则更新（实现去重且保留最高分）
      if (!existing || (r.percent || 0) > (existing.percent || 0)) {
        bestScores.set(r.model_name, r)
      }
    })
    
    return Array.from(bestScores.values())
  }, [reports, activeTab])

  const sortedReports = useMemo(() => {
    if (!sortConfig) return filteredReports
    
    return [...filteredReports].sort((a, b) => {
      let valA = 0
      let valB = 0
      
      if (sortConfig.key === 'score') {
        valA = a.percent || 0
        valB = b.percent || 0
      } else {
        const packA = a.packs.find((p: any) => (p.name && p.name.includes(sortConfig.key)) || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))
        const packB = b.packs.find((p: any) => (p.name && p.name.includes(sortConfig.key)) || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))
        
        if (activeTab === 'BenchLocal') {
          valA = packA && packA.maxScore > 0 ? (packA.score / packA.maxScore) * 100 : 0
          valB = packB && packB.maxScore > 0 ? (packB.score / packB.maxScore) * 100 : 0
        } else {
          // IPD cases
          const caseA = packA?.cases?.find((c: any) => c.id.includes(sortConfig.key))
          const caseB = packB?.cases?.find((c: any) => c.id.includes(sortConfig.key))
          valA = caseA ? parseFloat(caseA.score) || 0 : 0
          valB = caseB ? parseFloat(caseB.score) || 0 : 0
        }
      }
      
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })
  }, [filteredReports, sortConfig, activeTab])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' }
        return null
      }
      return { key, direction: 'desc' }
    })
  }

  const getPackScore = (report: any, packName: string) => {
    const pack = report.packs.find((p: any) => p.name && p.name.includes(packName))
    if (pack && pack.maxScore > 0) {
      return ((pack.score / pack.maxScore) * 100).toFixed(2)
    }
    return '-'
  }

  const getIpdScore = (report: any, caseName: string) => {
    for (const pack of report.packs) {
      if (pack.cases) {
        const c = pack.cases.find((c: any) => c.id.includes(caseName))
        if (c && c.score !== undefined) {
          const val = parseFloat(c.score)
          return isNaN(val) ? '-' : val.toFixed(2)
        }
      }
    }
    return '-'
  }

  const SortButton = ({ columnKey, label }: { columnKey: string, label: string }) => (
    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap" onClick={() => handleSort(columnKey)}>
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === columnKey ? 'text-blue-500' : 'text-slate-400'}`} />
    </div>
  )

  const singleReport = viewDetails;

  const radarOptions = singleReport ? {
    title: { text: '能力评测雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    radar: {
      indicator: singleReport.type === 'IPD' && singleReport.packs.length > 0 
        ? singleReport.packs[0].cases.map((c: any) => ({ name: c.id.split(' - ')[1] || c.id, max: 100 }))
        : singleReport.packs.map((p: any) => ({ name: p.name, max: p.maxScore || 100 })),
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: singleReport.type === 'IPD' && singleReport.packs.length > 0
          ? singleReport.packs[0].cases.map((c: any) => parseFloat(c.score))
          : singleReport.packs.map((p: any) => p.score),
        name: singleReport.model_name,
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      }]
    }]
  } : null;

  const singleBarOptions = singleReport ? {
    title: { text: singleReport.type === 'IPD' ? '各测评包得分' : '各测评包得分率 (%)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: singleReport.type === 'IPD' && singleReport.packs.length > 0
        ? singleReport.packs[0].cases.map((c: any) => c.id.split(' - ')[1] || c.id)
        : singleReport.packs.map((p: any) => p.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value', ...(singleReport.type === 'IPD' ? {} : { max: 100 }) },
    series: [{
      name: singleReport.type === 'IPD' ? '得分' : '得分率',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: 'top',
        formatter: singleReport.type === 'IPD' ? '{c}' : (params: any) => `${params.data.value}%`,
        color: '#374151',
        fontWeight: 'bold'
      },
      data: singleReport.type === 'IPD' && singleReport.packs.length > 0
        ? singleReport.packs[0].cases.map((c: any) => ({
            value: parseFloat(c.score),
            score: parseFloat(c.score)
          }))
        : singleReport.packs.map((p: any) => ({
            value: p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0,
            score: p.score
          }))
    }]
  } : null;

  const top3 = sortedReports.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Performers Area */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((r, i) => (
            <Card key={i} className={`relative overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md ${
              i === 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-50/50' :
              i === 1 ? 'bg-gradient-to-br from-slate-50 to-gray-50/50' :
              'bg-gradient-to-br from-orange-50/50 to-amber-50/30'
            }`}>
              {i === 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-200 to-yellow-400 rounded-bl-full opacity-10" />}
              <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-sm ${
                    i === 0 ? 'bg-amber-100 text-amber-600' :
                    i === 1 ? 'bg-slate-200 text-slate-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {i === 0 ? <Trophy className="w-6 h-6" /> : <Medal className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      TOP {i + 1}
                    </div>
                    <div className="font-bold text-slate-800 text-lg truncate max-w-[150px]" title={r.model_name}>{r.model_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-black tracking-tighter ${
                    i === 0 ? 'text-amber-600' :
                    i === 1 ? 'text-slate-600' :
                    'text-orange-600'
                  }`}>
                    {r.percent != null ? r.percent.toFixed(2) : '-'}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">平均分数</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSortConfig({ key: 'score', direction: 'desc' }); }} className="w-full sm:w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="BenchLocal">BenchLocal 测试集</TabsTrigger>
              <TabsTrigger value="IPD">IDP 测试集</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {activeTab === 'BenchLocal' ? (
                <TableRow>
                  <TableHead>模型名称</TableHead>
                  <TableHead>测评时间</TableHead>
                  <TableHead><SortButton columnKey="score" label="平均分数" /></TableHead>
                  <TableHead><SortButton columnKey="toolcall" label="toolcall" /></TableHead>
                  <TableHead><SortButton columnKey="instructfollow" label="instructfollow" /></TableHead>
                  <TableHead><SortButton columnKey="reasonmath" label="reasonmath" /></TableHead>
                  <TableHead><SortButton columnKey="dataextract" label="dataextract" /></TableHead>
                  <TableHead><SortButton columnKey="bugfind" label="bugfind" /></TableHead>
                  <TableHead><SortButton columnKey="structoutput" label="structoutput" /></TableHead>
                  <TableHead><SortButton columnKey="hermesagent" label="hermesagent" /></TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>模型名称</TableHead>
                  <TableHead>测评时间</TableHead>
                  <TableHead><SortButton columnKey="score" label="平均分数" /></TableHead>
                  <TableHead><SortButton columnKey="机会识别" label="机会识别" /></TableHead>
                  <TableHead><SortButton columnKey="概念阶段" label="概念阶段" /></TableHead>
                  <TableHead><SortButton columnKey="计划阶段" label="计划阶段" /></TableHead>
                  <TableHead><SortButton columnKey="开发阶段" label="开发阶段" /></TableHead>
                  <TableHead><SortButton columnKey="验证阶段" label="验证阶段" /></TableHead>
                  <TableHead><SortButton columnKey="发布阶段" label="发布阶段" /></TableHead>
                  <TableHead><SortButton columnKey="生命周期管理" label="生命周期管理" /></TableHead>
                  <TableHead><SortButton columnKey="组织与人才发展" label="组织与人才发展" /></TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {sortedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-gray-500">暂无数据</TableCell>
                </TableRow>
              ) : sortedReports.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.model_name}</TableCell>
                  <TableCell className="text-gray-500">{r.time}</TableCell>
                  <TableCell>{r.percent != null ? r.percent.toFixed(2) : '-'}</TableCell>
                  {activeTab === 'BenchLocal' ? (
                    <>
                      <TableCell>{getPackScore(r, 'toolcall')}</TableCell>
                      <TableCell>{getPackScore(r, 'instructfollow')}</TableCell>
                      <TableCell>{getPackScore(r, 'reasonmath')}</TableCell>
                      <TableCell>{getPackScore(r, 'dataextract')}</TableCell>
                      <TableCell>{getPackScore(r, 'bugfind')}</TableCell>
                      <TableCell>{getPackScore(r, 'structoutput')}</TableCell>
                      <TableCell>{getPackScore(r, 'hermesagent')}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{getIpdScore(r, '机会识别')}</TableCell>
                      <TableCell>{getIpdScore(r, '概念阶段')}</TableCell>
                      <TableCell>{getIpdScore(r, '计划阶段')}</TableCell>
                      <TableCell>{getIpdScore(r, '开发阶段')}</TableCell>
                      <TableCell>{getIpdScore(r, '验证阶段')}</TableCell>
                      <TableCell>{getIpdScore(r, '发布阶段')}</TableCell>
                      <TableCell>{getIpdScore(r, '生命周期管理')}</TableCell>
                      <TableCell>{getIpdScore(r, '组织与人才发展')}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setViewDetails(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!viewDetails} onOpenChange={(open) => { if (!open) setViewDetails(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-gray-50/50">
            <DialogTitle className="text-xl">测评详情 - {viewDetails?.model_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-50/30">
            {singleReport && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{singleReport.model_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">测试时间: {singleReport.time}</p>
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${singleReport.type === 'IPD' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      测评类别: {singleReport.type === 'IPD' ? 'IDP' : 'BenchLocal'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{singleReport.type === 'IPD' ? singleReport.score : `${singleReport.percent}%`}</div>
                    <p className="text-xs text-gray-500">综合得分 ({singleReport.score})</p>
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">1. 能力测评雷达图</h4>
                  <div className="bg-white rounded-lg border border-gray-100 p-4 h-[400px]">
                    {radarOptions && <ReactECharts option={radarOptions} style={{ height: '100%', width: '100%' }} />}
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">2. 各维度的测评结果柱状图</h4>
                  <div className="bg-white rounded-lg border border-gray-100 p-4 h-[350px]">
                    {singleBarOptions && <ReactECharts option={singleBarOptions} style={{ height: '100%', width: '100%' }} />}
                  </div>
                </div>

                {singleReport.type !== 'IPD' && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 模型各个维度的测评结果列表</h4>
                    <Table className="border rounded-md bg-white">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>评测维度 (测试集)</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>得分 / 满分</TableHead>
                          <TableHead>得分率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {singleReport.packs.map((pack: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-gray-700">{pack.name}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'}
                              </span>
                            </TableCell>
                            <TableCell>{`${pack.score} / ${pack.maxScore}`}</TableCell>
                            <TableCell className="font-semibold text-gray-900">{pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : 0}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-4 mt-8 pb-8">
                  <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">
                    {singleReport.type !== 'IPD' ? '4. 分项能力详情' : '3. 模型各个维度的测评结果列表'}
                  </h4>
                  {singleReport.packs.map((pack: any, i: number) => (
                    <Card key={i} className="shadow-sm border-gray-200">
                      <CardHeader className="py-3 bg-gray-50/80 border-b">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-semibold">{pack.name}</CardTitle>
                          <span className={`text-xs font-mono px-2 py-1 rounded ${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'} 
                            {singleReport.type !== 'IPD' && ` | ${pack.score}/${pack.maxScore}`}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[180px]">{singleReport.type !== 'IPD' ? '用例 ID' : '评测维度'}</TableHead>
                              <TableHead className="w-[80px]">状态</TableHead>
                              <TableHead className="w-[100px]">得分</TableHead>
                              <TableHead>失败原因 / 备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pack.cases.map((c: any, j: number) => (
                              <TableRow key={j}>
                                <TableCell className="font-mono text-xs">{c.id}</TableCell>
                                <TableCell>{c.pass ? '✅ 通关' : '❌ 失败'}</TableCell>
                                <TableCell className="text-xs font-medium">{c.score}</TableCell>
                                <TableCell className="text-xs text-gray-500">{c.error}</TableCell>
                              </TableRow>
                            ))}
                            {pack.cases.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-400 py-4">无用例详情</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-white shrink-0">
            <Button onClick={() => setViewDetails(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  )
}

function PerfBoard() {
  const { data: benchmarksData, isLoading } = useBenchmarks({ size: 1000 })
  const benchmarks = benchmarksData?.items || []

  const [filterModel, setFilterModel] = useState<string>('all')
  const [filterFeatures, setFilterFeatures] = useState<string[]>([])
  const [filterServer, setFilterServer] = useState<string>('all')
  const [filterCard, setFilterCard] = useState<string>('all')
  const [filterFramework, setFilterFramework] = useState<string>('all')
  const [filterFrameworkVersion, setFilterFrameworkVersion] = useState<string>('all')
  const [filterConcurrency, setFilterConcurrency] = useState<string>('all')
  const [filterContext, setFilterContext] = useState<string>('all')
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  const [viewDetails, setViewDetails] = useState<any | null>(null)

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' }
        return null
      }
      return { key, direction: 'desc' }
    })
  }

  const SortButton = ({ columnKey, label }: { columnKey: string, label: string }) => (
    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap" onClick={() => handleSort(columnKey)}>
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === columnKey ? 'text-blue-500' : 'text-slate-400'}`} />
    </div>
  )

  const modelOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.modelName).filter(Boolean))), [benchmarks])
  const featuresOptions = ['FP4', 'FP8', '投机推理', 'KV Cache卸载', 'KV稀疏']
  const serverOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.serverName).filter(Boolean))), [benchmarks])
  const cardOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.chipName).filter(Boolean))), [benchmarks])
  const frameworkOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.framework).filter(Boolean))), [benchmarks])
  const frameworkVersionOptions = useMemo(() => Array.from(new Set(benchmarks.map(b => b.config.frameworkVersion).filter(Boolean))), [benchmarks])
  const contextOptions = useMemo(() => {
    const opts = new Set<string>()
    benchmarks.forEach(b => {
      b.metrics.forEach(m => opts.add(`${m.inputLength}/${m.outputLength}`))
    })
    return Array.from(opts).sort((a, b) => {
      const aVal = parseInt(a.split('/')[0]) || 0
      const bVal = parseInt(b.split('/')[0]) || 0
      return aVal - bVal
    })
  }, [benchmarks])

  const rows = useMemo(() => {
    const result: any[] = []
    benchmarks.forEach(b => {
      if (filterModel !== 'all' && b.config.modelName !== filterModel) return
      
      const bFeatures = b.config.features || []
      const bFeaturesArr = Array.isArray(bFeatures) ? bFeatures : (typeof bFeatures === 'string' ? bFeatures.split(',') : [])
      if (filterFeatures.length > 0) {
        if (filterFeatures.length !== bFeaturesArr.length || !filterFeatures.every(f => bFeaturesArr.includes(f))) return
      }

      if (filterServer !== 'all' && b.config.serverName !== filterServer) return
      if (filterCard !== 'all' && b.config.chipName !== filterCard) return
      if (filterFramework !== 'all' && b.config.framework !== filterFramework) return
      if (filterFrameworkVersion !== 'all' && b.config.frameworkVersion !== filterFrameworkVersion) return

      const cardCount = parseCardCount(b.config.shardingConfig)

      b.metrics.forEach(m => {
        if (filterConcurrency !== 'all' && String(m.concurrency) !== filterConcurrency) return
        if (filterContext !== 'all' && `${m.inputLength}/${m.outputLength}` !== filterContext) return

        result.push({
          id: b.id,
          model_name: b.config.modelName,
          scenario: b.config.scenario || '',
          test_time: b.config.testDate,
          server: b.config.serverName,
          card: b.config.chipName,
          concurrency: m.concurrency,
          inputLength: m.inputLength,
          outputLength: m.outputLength,
          ttft: m.ttft,
          tpot: m.tpot,
          tps: m.tokensPerSecond / cardCount,
          raw: b
        })
      })
    })

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key]
        let valB = b[sortConfig.key]
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
      })
    } else {
      // Default sort by time desc
      result.sort((a, b) => new Date(b.test_time).getTime() - new Date(a.test_time).getTime())
    }

    return result
  }, [benchmarks, filterModel, filterFeatures, filterServer, filterCard, filterFramework, filterFrameworkVersion, filterConcurrency, filterContext, sortConfig])

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-5 bg-slate-50/50">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-5 items-end">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型名称</Label>
                <Select value={filterModel} onValueChange={setFilterModel}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {modelOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">机型</Label>
                <Select value={filterServer} onValueChange={setFilterServer}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {serverOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">加速卡</Label>
                <Select value={filterCard} onValueChange={setFilterCard}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {cardOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">推理框架</Label>
                <Select value={filterFramework} onValueChange={setFilterFramework}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {frameworkOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">框架版本</Label>
                <Select value={filterFrameworkVersion} onValueChange={setFilterFrameworkVersion}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {frameworkVersionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">并发数</Label>
                <Select value={filterConcurrency} onValueChange={setFilterConcurrency}>
                  <SelectTrigger className="w-[100px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                    <SelectItem value="64">64</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">上下文长度</Label>
                <Select value={filterContext} onValueChange={setFilterContext}>
                  <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {contextOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Features Checkboxes */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200/60">
              <div className="flex flex-wrap gap-5 justify-between items-end">
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">特性</Label>
                  <div className="flex flex-wrap gap-5 items-center">
                    {featuresOptions.map(f => (
                      <label key={f} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={filterFeatures.includes(f)}
                          onChange={(e) => {
                            setFilterFeatures(prev => 
                              e.target.checked ? [...prev, f] : prev.filter(item => item !== f)
                            )
                          }}
                        />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <Button variant="outline" className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0" onClick={() => {
                  setFilterModel('all')
                  setFilterFeatures([])
                  setFilterServer('all')
                  setFilterCard('all')
                  setFilterFramework('all')
                  setFilterFrameworkVersion('all')
                  setFilterConcurrency('all')
                  setFilterContext('all')
                  setSortConfig(null)
                }}>重置选择</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>场景</TableHead>
                  <TableHead>模型名称</TableHead>
                  <TableHead>测试时间</TableHead>
                  <TableHead>并发数</TableHead>
                  <TableHead>输入长度</TableHead>
                  <TableHead>输出长度</TableHead>
                  <TableHead><SortButton columnKey="ttft" label="TTFT (ms)" /></TableHead>
                  <TableHead><SortButton columnKey="tpot" label="TPOT (ms)" /></TableHead>
                  <TableHead><SortButton columnKey="tps" label="每卡TPS" /></TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center">加载中...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-gray-500">暂无匹配数据</TableCell></TableRow>
                ) : rows.map((r, i) => (
                  <TableRow key={`${r.id}-${i}`}>
                    <TableCell>{r.scenario || '-'}</TableCell>
                    <TableCell className="font-medium">{r.model_name}</TableCell>
                    <TableCell className="text-gray-500">{new Date(r.test_time).toLocaleString()}</TableCell>
                    <TableCell>{r.concurrency}</TableCell>
                    <TableCell>{r.inputLength}</TableCell>
                    <TableCell>{r.outputLength}</TableCell>
                    <TableCell>{r.ttft.toFixed(2)}</TableCell>
                    <TableCell>{r.tpot.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">{r.tps.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewDetails(r.raw)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BenchmarkViewOnlyDialog
        benchmark={viewDetails}
        open={!!viewDetails}
        onOpenChange={(open) => { if (!open) setViewDetails(null) }}
      />
    </div>
  )
}

function InteractiveBoard() {
  const { data: benchmarksData, isLoading } = useBenchmarks({ size: 1000 })
  const benchmarks = benchmarksData?.items || []

  const [model, setModel] = useState<string>('')
  const [features, setFeatures] = useState<string[]>([])
  const [server, setServer] = useState<string>('')
  const [card, setCard] = useState<string>('')
  const [framework, setFramework] = useState<string>('')
  const [frameworkVersion, setFrameworkVersion] = useState<string>('')
  const [dimension, setDimension] = useState<string>('')
  
  const [viewDetails, setViewDetails] = useState<any | null>(null)

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
               } else if (valA > 0) {
                  scoreA++
               } else if (valB > 0) {
                  scoreB++
               }
            } else if (dim === 'tps') {
               const cardCountA = parseCardCount(a.config.shardingConfig)
               const cardCountB = parseCardCount(b.config.shardingConfig)
               const tpsA = mA.tokensPerSecond / cardCountA
               const tpsB = mB.tokensPerSecond / cardCountB
               
               if (tpsA > 0 && tpsB > 0) {
                  if (tpsA > tpsB) scoreA++
                  else if (tpsB > tpsA) scoreB++
               } else if (tpsA > 0) {
                  scoreA++
               } else if (tpsB > 0) {
                  scoreB++
               }
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

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">模型/特性/机型 交互跑分面板</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">模型列表</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择模型" /></SelectTrigger>
                  <SelectContent>
                    {modelOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">机型列表</Label>
                <Select value={server} onValueChange={setServer}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择机型" /></SelectTrigger>
                  <SelectContent>
                    {serverOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">加速卡列表</Label>
                <Select value={card} onValueChange={setCard}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择加速卡" /></SelectTrigger>
                  <SelectContent>
                    {cardOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">推理框架列表</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择推理框架" /></SelectTrigger>
                  <SelectContent>
                    {frameworkOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">推理框架版本</Label>
                <Select value={frameworkVersion} onValueChange={setFrameworkVersion}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择版本" /></SelectTrigger>
                  <SelectContent>
                    {frameworkVersionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">对比维度</Label>
                <Select value={dimension} onValueChange={setDimension}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="请选择维度" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ttft">TTFT</SelectItem>
                    <SelectItem value="tps">每卡 TPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60">
              <div className="flex flex-wrap gap-5 justify-between items-end">
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">特性列表</Label>
                  <div className="flex flex-wrap gap-5 items-center">
                    {featuresOptions.map(f => (
                      <label key={f} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={features.includes(f)}
                          onChange={(e) => {
                            setFeatures(prev => 
                              e.target.checked ? [...prev, f] : prev.filter(item => item !== f)
                            )
                          }}
                        />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button variant="outline" className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0" onClick={() => {
                  setModel('')
                  setFeatures([])
                  setServer('')
                  setCard('')
                  setFramework('')
                  setFrameworkVersion('')
                  setDimension('')
                }}>重置选择</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {allSelected && bestRecords.length > 0 && (
        <Card className="shadow-sm border-slate-200">
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
      )}

      {allSelected && bestRecords.length === 0 && !isLoading && (
        <div className="text-center p-8 text-slate-500 border border-dashed rounded-lg bg-slate-50">
          根据所选条件，未找到匹配的性能数据。
        </div>
      )}

      <BenchmarkViewOnlyDialog
        benchmark={viewDetails}
        open={!!viewDetails}
        onOpenChange={(open) => { if (!open) setViewDetails(null) }}
      />
    </div>
  )
}
