import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { useBenchmarks, useReports, useSaveReport, useDeleteBenchmark, useDeleteReport, useCreateBenchmark, useImportBenchmark, useUpdateBenchmark, AdvancedSearchFilters } from '@/hooks/use-benchmarks'
import { Benchmark, Report } from '@/lib/types'
import { ComparisonPanel } from '@/components/ComparisonPanel'
import { PerformanceTrendCharts } from '@/components/PerformanceTrendCharts'
import { MultiVersionTrendCharts } from '@/components/MultiVersionTrendCharts'
import {
  Search,
  Plus,
  Trash2,
  FileText,
  ChartBar,
  ArrowRightLeft,
  Upload,
  BarChart3,
  FileUp,
  TrendingUp,
  GitCompare,
  X,
  RefreshCw,
  ClipboardPlus,
  Filter,
  Pencil,
} from 'lucide-react'
import { AddBenchmarkForm } from '@/components/AddBenchmarkForm'
import { CsvImportEnhanced } from '@/components/CsvImportEnhanced'
import { AddBenchmarkEnhanced } from '@/components/AddBenchmarkEnhanced'
import { AdvancedSearchPanel } from '@/components/AdvancedSearchPanel'
import { BenchmarkDetailDialog } from '@/components/BenchmarkDetailDialog'
import { BenchmarkViewOnlyDialog } from '@/components/BenchmarkViewOnlyDialog'
import { toast } from 'sonner'

import { format } from 'date-fns'

export function BenchmarkList() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('benchmarks')
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<number[]>([])
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null)
  const [viewingBenchmark, setViewingBenchmark] = useState<Benchmark | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  
  const [addBenchmarkOpen, setAddBenchmarkOpen] = useState(false)
  const [addBenchmarkLoading, setAddBenchmarkLoading] = useState(false)
  
  const [importConfig, setImportConfig] = useState({
    modelName: '',
    serverName: '',
    framework: 'MindIE',
    frameworkVersion: '',
    chipName: '',
    shardingConfig: '',
    submitter: 'admin',
    testDate: new Date().toISOString().split('T')[0],
  })
  
  const [comparisonTabBenchmarks, setComparisonTabBenchmarks] = useState<number[]>([])
  const [trendTabBenchmark, setTrendTabBenchmark] = useState<number | null>(null)
  const [showTrendForSingle, setShowTrendForSingle] = useState(false)
  
  const [enhancedImportOpen, setEnhancedImportOpen] = useState(false)
  const [enhancedAddOpen, setEnhancedAddOpen] = useState(false)
  
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({})
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const { data: benchmarksData, isLoading } = useBenchmarks({
    page,
    size: 20,
    search: search || undefined,
    framework: frameworkFilter === 'all' ? undefined : frameworkFilter,
    filters: Object.keys(advancedFilters).length > 0 ? advancedFilters : undefined,
  })

  // Fetch all benchmarks for trend charts
  const { data: allBenchmarksData } = useBenchmarks({
    page: 1,
    size: 1000,
    search: search || undefined,
    framework: frameworkFilter === 'all' ? undefined : frameworkFilter,
    filters: Object.keys(advancedFilters).length > 0 ? advancedFilters : undefined,
  })

  const { data: reports } = useReports()
  const saveReport = useSaveReport()
  const deleteBenchmark = useDeleteBenchmark()
  const deleteReport = useDeleteReport()
  const updateBenchmark = useUpdateBenchmark()

  const benchmarks = benchmarksData?.items || []
  const totalPages = benchmarksData ? Math.ceil(benchmarksData.total / benchmarksData.size) : 0

  const handleSelect = (id: number) => {
    setSelectedBenchmarks((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id)
      }
      if (prev.length >= 2) {
        return [prev[1], id]
      }
      return [...prev, id]
    })
  }

  const selectedData = useMemo(() => {
    return benchmarks.filter((b) => selectedBenchmarks.includes(b.id))
  }, [benchmarks, selectedBenchmarks])

  const handleDeleteBenchmark = async (id: number) => {
    try {
      await deleteBenchmark.mutateAsync(id)
      toast.success('删除成功')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleDeleteReport = async (id: number) => {
    try {
      await deleteReport.mutateAsync(id)
      toast.success('删除成功')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const createBenchmark = useCreateBenchmark()
  const importBenchmark = useImportBenchmark()

  const handleAdvancedSearch = (filters: any) => {
    // Convert Date objects to strings for the API
    const apiFilters = { ...filters }
    if (apiFilters.startDate instanceof Date) {
      apiFilters.startDate = format(apiFilters.startDate, 'yyyy-MM-dd')
    }
    if (apiFilters.endDate instanceof Date) {
      apiFilters.endDate = format(apiFilters.endDate, 'yyyy-MM-dd')
    }
    
    setAdvancedFilters(apiFilters)
    setPage(1)
  }

  const handleResetAdvancedSearch = () => {
    setAdvancedFilters({})
    setPage(1)
  }

  const handleSaveBenchmark = async (id: number, data: { config: Benchmark['config']; metrics: Benchmark['metrics'] }) => {
    await updateBenchmark.mutateAsync({ id, data })
    toast.success('更新成功')
    setDetailDialogOpen(false)
  }

  const handleViewDetail = (benchmark: Benchmark) => {
    setViewingBenchmark(benchmark)
    setViewDialogOpen(true)
  }

  const handleEditBenchmark = (benchmark: Benchmark) => {
    setEditingBenchmark(benchmark)
    setDetailDialogOpen(true)
  }

  const handleAddBenchmark = async (data: { config: Benchmark['config']; metrics: Benchmark['metrics'] }) => {
    setAddBenchmarkLoading(true)
    try {
      await createBenchmark.mutateAsync(data)
      toast.success(`成功添加基准测试：${data.config.modelName}`)
      setAddBenchmarkOpen(false)
    } catch (error: any) {
      console.error('Add benchmark error:', error)
      toast.error(`添加失败: ${error.message || '未知错误'}`)
    } finally {
      setAddBenchmarkLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv')) {
        setCsvFileName(file.name)
        setCsvFile(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setCsvContent(content)
          // Try to auto-extract model name from filename
          const fileNameWithoutExt = file.name.replace('.csv', '')
          if (!importConfig.modelName && fileNameWithoutExt) {
            setImportConfig(prev => ({ ...prev, modelName: fileNameWithoutExt }))
          }
        }
        reader.readAsText(file)
      } else {
        toast.error('请上传CSV格式文件')
      }
    }
  }

  // Parse CSV content to metrics
  const parseCsvToMetrics = (content: string) => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV文件格式不正确，至少需要包含标题行和一行数据')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    const findIndex = (aliases: string[]) => {
      const normalized = headers.map(h => h.replace(/\s+/g, ''))
      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '')
        const idx = normalized.findIndex(h => h.includes(normalizedAlias))
        if (idx !== -1) return idx
      }
      return -1
    }

    const concurrencyIdx = findIndex(['concurrency', 'c', 'process num', 'process'])
    const inputLengthIdx = findIndex(['inputlength', 'input length', 'input', 'il', 'avg input tokens'])
    const outputLengthIdx = findIndex(['outputlength', 'output length', 'output', 'ol', 'avg output tokens'])
    const ttftIdx = findIndex(['ttft', 'ttft (ms)', '首token', 'first token'])
    const tpotIdx = findIndex(['tpot', 'per token', '每token'])
    const tpsWithIdx = findIndex(['tps (with prefill)', 'avg tps (with prefill)'])
    const tpsWithoutIdx = findIndex(['tps (without prefill)', 'avg tps (without prefill)'])
    const tpsIdx = findIndex(['tokenspersecond', 'tps', '每秒token'])
    const totalTimeIdx = findIndex(['total time (ms)', 'totaltime'])

    if (concurrencyIdx === -1 || (ttftIdx === -1 && tpsIdx === -1 && tpsWithIdx === -1 && tpsWithoutIdx === -1)) {
      throw new Error('CSV文件缺少必要的列：concurrency 及至少一个性能指标')
    }

    const metrics = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length === 0 || values.every(v => v === '')) continue

      const concurrency = parseFloat(values[concurrencyIdx] || '')
      const inputLength = inputLengthIdx !== -1 ? parseFloat(values[inputLengthIdx] || '') : 1024
      const outputLength = outputLengthIdx !== -1 ? parseFloat(values[outputLengthIdx] || '') : 128
      const ttft = ttftIdx !== -1 ? parseFloat(values[ttftIdx] || '') : 0
      const tpot = tpotIdx !== -1 ? parseFloat(values[tpotIdx] || '') : 0
      const tpsMain = tpsIdx !== -1 ? parseFloat(values[tpsIdx] || '') : 0
      const tpsWith = tpsWithIdx !== -1 ? parseFloat(values[tpsWithIdx] || '') : 0
      const tpsWithout = tpsWithoutIdx !== -1 ? parseFloat(values[tpsWithoutIdx] || '') : 0
      const totalTimeMs = totalTimeIdx !== -1 ? parseFloat(values[totalTimeIdx] || '') : 0

      if (!isNaN(concurrency) && concurrency > 0) {
        const tokensPerSecond = !isNaN(tpsMain) && tpsMain > 0
          ? tpsMain
          : (!isNaN(tpsWith) && tpsWith > 0 ? tpsWith : (!isNaN(tpsWithout) && tpsWithout > 0 ? tpsWithout : 0))

        let resolvedTpot = !isNaN(tpot) && tpot > 0 ? tpot : 0
        if (!resolvedTpot && tokensPerSecond > 0) {
          resolvedTpot = 1000 / tokensPerSecond
        } else if (!resolvedTpot && totalTimeMs > 0 && outputLength > 0) {
          resolvedTpot = totalTimeMs / outputLength
        }

        if (!isNaN(tokensPerSecond) && tokensPerSecond >= 0 && !isNaN(resolvedTpot)) {
          metrics.push({
            concurrency,
            inputLength: isNaN(inputLength) || inputLength <= 0 ? 1024 : inputLength,
            outputLength: isNaN(outputLength) || outputLength <= 0 ? 128 : outputLength,
            ttft: isNaN(ttft) || ttft < 0 ? 0 : ttft,
            tpot: resolvedTpot,
            tokensPerSecond,
          })
        }
      }
    }

    if (metrics.length === 0) {
      throw new Error('未能从CSV文件中解析出有效的性能数据')
    }

    return metrics
  }

  const handleImportCsv = async () => {
    if (!csvContent) {
      toast.error('请先选择CSV文件')
      return
    }

    // Validate required config fields
    if (!importConfig.modelName.trim()) {
      toast.error('请填写模型名称')
      return
    }
    if (!importConfig.serverName.trim()) {
      toast.error('请填写服务器名称')
      return
    }
    if (!importConfig.framework.trim()) {
      toast.error('请填写推理框架')
      return
    }
    if (!importConfig.chipName.trim()) {
      toast.error('请填写AI芯片')
      return
    }

    setImportLoading(true)
    try {
      // Parse CSV to metrics
      const metrics = parseCsvToMetrics(csvContent)
      
      // Create benchmark
      await createBenchmark.mutateAsync({
        config: {
          submitter: importConfig.submitter,
          modelName: importConfig.modelName,
          serverName: importConfig.serverName,
          framework: importConfig.framework,
          frameworkVersion: importConfig.frameworkVersion,
          chipName: importConfig.chipName,
          shardingConfig: importConfig.shardingConfig,
          testDate: importConfig.testDate,
        },
        metrics,
      })

      toast.success(`成功导入 ${metrics.length} 条性能数据`)
      
      // Reset form
      setImportOpen(false)
      setCsvContent('')
      setCsvFileName('')
      setCsvFile(null)
      setImportConfig({
        modelName: '',
        serverName: '',
        framework: 'MindIE',
        frameworkVersion: '',
        chipName: '',
        shardingConfig: '',
        submitter: 'admin',
        testDate: new Date().toISOString().split('T')[0],
      })
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(`导入失败: ${error.message || '未知错误'}`)
    } finally {
      setImportLoading(false)
    }
  }

  const handleCloseImport = () => {
    setImportOpen(false)
    setCsvContent('')
    setCsvFileName('')
    setCsvFile(null)
    setImportConfig({
      modelName: '',
      serverName: '',
      framework: 'MindIE',
      frameworkVersion: '',
      chipName: '',
      shardingConfig: '',
      submitter: 'admin',
      testDate: new Date().toISOString().split('T')[0],
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">性能结果</h1>
          <p className="text-gray-500 mt-1">查看和分析测试结果，对比性能数据</p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" onClick={() => setEnhancedAddOpen(true)}>
            <ClipboardPlus className="w-4 h-4 mr-2" />
            手动添加
          </Button> */}
          <Button onClick={() => setEnhancedImportOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            导入CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="benchmarks">基准测试</TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompare className="w-4 h-4 mr-1" />
            性能对比
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="w-4 h-4 mr-1" />
            性能趋势图
          </TabsTrigger>
          <TabsTrigger value="reports">
            对比报告
            {reports && reports.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benchmarks" className="mt-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索模型、服务器..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="框架" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="MindIE">MindIE</SelectItem>
                <SelectItem value="VLLM">VLLM</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showAdvancedSearch ? "default" : "outline"}
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            >
              <Filter className="w-4 h-4 mr-1" />
              高级搜索
              {Object.keys(advancedFilters).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.values(advancedFilters).filter(v => v !== undefined && v !== '').length}
                </Badge>
              )}
            </Button>
          </div>

          {showAdvancedSearch && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <AdvancedSearchPanel
                  onSearch={handleAdvancedSearch}
                  onReset={handleResetAdvancedSearch}
                />
              </CardContent>
            </Card>
          )}

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">选择</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>模型名称</TableHead>
                  <TableHead>服务器</TableHead>
                  <TableHead>推理框架</TableHead>
                  <TableHead>版本号</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>测试日期</TableHead>
                  <TableHead>数据量</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} columns={10} />
                    ))}
                  </>
                ) : benchmarks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      暂无基准测试数据
                    </TableCell>
                  </TableRow>
                ) : (
                  benchmarks.map((benchmark) => (
                    <TableRow key={benchmark.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedBenchmarks.includes(benchmark.id)}
                          onChange={() => handleSelect(benchmark.id)}
                          className="w-4 h-4 rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{benchmark.unique_id}</TableCell>
                      <TableCell className="font-medium">{benchmark.config.modelName}</TableCell>
                      <TableCell>{benchmark.config.serverName}</TableCell>
                      <TableCell>{benchmark.config.framework}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {benchmark.config.frameworkVersion}
                        </Badge>
                      </TableCell>
                      <TableCell>{benchmark.config.submitter || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {benchmark.config.testDate}
                      </TableCell>
                      <TableCell>{benchmark.metrics.length} 条</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(benchmark)}
                            title="查看详情"
                          >
                            <ChartBar className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditBenchmark(benchmark)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBenchmark(benchmark.id)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-gray-500">
                  第 {page} / {totalPages} 页，共 {benchmarksData?.total || 0} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GitCompare className="w-5 h-5" />
                    性能对比分析
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    选择两个基准测试进行详细对比分析
                  </p>
                </div>
                {(comparisonTabBenchmarks.length > 0 || selectedBenchmarks.length > 0) && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                        setComparisonTabBenchmarks([])
                        setSelectedBenchmarks([])
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    清除选择
                  </Button>
                )}
              </div>

              {/* Use comparisonTabBenchmarks if set, otherwise fallback to selectedBenchmarks if exactly 2 */}
              {(() => {
                const activeIds = comparisonTabBenchmarks.length === 2 
                    ? comparisonTabBenchmarks 
                    : (selectedBenchmarks.length === 2 ? selectedBenchmarks : [])
                
                if (activeIds.length < 2) {
                   return (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <GitCompare className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                      <p className="text-slate-600 font-medium mb-2">
                        请选择两个基准测试进行对比
                      </p>
                      <p className="text-sm text-slate-500">
                        已从下方列表中选择 {comparisonTabBenchmarks.length > 0 ? comparisonTabBenchmarks.length : selectedBenchmarks.length}/2 个测试
                      </p>
                    </div>
                   )
                }

                const allBenchmarks = allBenchmarksData?.items || []
                const b1 = allBenchmarks.find(b => b.id === activeIds[0])
                const b2 = allBenchmarks.find(b => b.id === activeIds[1])
                
                if (b1 && b2) {
                    return <ComparisonPanel benchmark1={b1} benchmark2={b2} />
                }
                return null
              })()}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">选择基准测试：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(allBenchmarksData?.items || []).map((benchmark) => (
                    <div
                      key={benchmark.id}
                      onClick={() => {
                        setComparisonTabBenchmarks(prev => {
                          if (prev.includes(benchmark.id)) {
                            return prev.filter(id => id !== benchmark.id)
                          }
                          if (prev.length >= 2) {
                            return [prev[1], benchmark.id]
                          }
                          return [...prev, benchmark.id]
                        })
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        comparisonTabBenchmarks.includes(benchmark.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{benchmark.config.modelName}</p>
                          <p className="text-xs text-slate-500">{benchmark.config.serverName}</p>
                          <p className="text-xs text-slate-400 mt-1">{benchmark.unique_id}</p>
                        </div>
                        {comparisonTabBenchmarks.includes(benchmark.id) && (
                          <Badge variant="default" className="text-xs">
                            {comparisonTabBenchmarks.indexOf(benchmark.id) === 0 ? 'A' : 'B'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <MultiVersionTrendCharts benchmarks={allBenchmarksData?.items || []} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>模型A</TableHead>
                  <TableHead>模型B</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      暂无对比报告
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-sm">{report.unique_id}</TableCell>
                      <TableCell>{report.model_name1}</TableCell>
                      <TableCell>{report.model_name2}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(report.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBenchmarks([report.benchmark_id1, report.benchmark_id2])
                            setActiveTab('comparison') // Switch to comparison tab
                          }}
                          title="查看"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReport(report.id)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addBenchmarkOpen} onOpenChange={setAddBenchmarkOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">手动添加基准测试</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AddBenchmarkForm
              onSubmit={handleAddBenchmark}
              onCancel={() => setAddBenchmarkOpen(false)}
              isSubmitting={addBenchmarkLoading || createBenchmark?.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">导入CSV测试结果</DialogTitle>
          </DialogHeader>
          {/* ... Import Dialog Content (Same as before) ... */}
           <div className="grid gap-5 py-6">
            {/* File Upload Section */}
            <div className="grid gap-2">
              <Label htmlFor="csv-file" className="text-sm font-semibold text-slate-800">
                选择CSV文件 <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-slate-400 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer bg-slate-50">
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csv-file" className="cursor-pointer block">
                  <FileUp className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    {csvFileName ? `已选择: ${csvFileName}` : '点击选择CSV文件或将文件拖拽到此处'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    支持CSV格式，需包含列：concurrency, ttft, tpot, tokensPerSecond
                  </p>
                </label>
              </div>
            </div>

            {/* CSV Preview */}
            {csvContent && (
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-800">文件预览</Label>
                <div className="border-2 border-slate-300 rounded-lg p-3 bg-slate-50 max-h-32 overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap text-slate-700">{csvContent.slice(0, 300)}...</pre>
                </div>
              </div>
            )}

            {/* Config Form */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                测试配置信息
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="modelName" className="text-xs font-semibold text-slate-700">
                    模型名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modelName"
                    value={importConfig.modelName}
                    onChange={(e) => setImportConfig({ ...importConfig, modelName: e.target.value })}
                    placeholder="如：Qwen-14B"
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="serverName" className="text-xs font-semibold text-slate-700">
                    服务器名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serverName"
                    value={importConfig.serverName}
                    onChange={(e) => setImportConfig({ ...importConfig, serverName: e.target.value })}
                    placeholder="如：server-01"
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="framework" className="text-xs font-semibold text-slate-700">
                    推理框架 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={importConfig.framework}
                    onValueChange={(v) => setImportConfig({ ...importConfig, framework: v })}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-300 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MindIE">MindIE</SelectItem>
                      <SelectItem value="VLLM">VLLM</SelectItem>
                      <SelectItem value="TensorRT-LLM">TensorRT-LLM</SelectItem>
                      <SelectItem value="DeepSpeed">DeepSpeed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="frameworkVersion" className="text-xs font-semibold text-slate-700">
                    框架版本
                  </Label>
                  <Input
                    id="frameworkVersion"
                    value={importConfig.frameworkVersion}
                    onChange={(e) => setImportConfig({ ...importConfig, frameworkVersion: e.target.value })}
                    placeholder="如：v1.0.1"
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="chipName" className="text-xs font-semibold text-slate-700">
                    AI芯片 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="chipName"
                    value={importConfig.chipName}
                    onChange={(e) => setImportConfig({ ...importConfig, chipName: e.target.value })}
                    placeholder="如：GPU-A100"
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="shardingConfig" className="text-xs font-semibold text-slate-700">
                    切分参数
                  </Label>
                  <Input
                    id="shardingConfig"
                    value={importConfig.shardingConfig}
                    onChange={(e) => setImportConfig({ ...importConfig, shardingConfig: e.target.value })}
                    placeholder="如：tp=4"
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="testDate" className="text-xs font-semibold text-slate-700">
                    测试日期
                  </Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={importConfig.testDate}
                    onChange={(e) => setImportConfig({ ...importConfig, testDate: e.target.value })}
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="submitter" className="text-xs font-semibold text-slate-700">
                    提交人
                  </Label>
                  <Input
                    id="submitter"
                    value={importConfig.submitter}
                    onChange={(e) => setImportConfig({ ...importConfig, submitter: e.target.value })}
                    className="bg-slate-50 border-slate-300 focus:bg-white h-9"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button variant="outline" onClick={handleCloseImport} className="px-6" disabled={importLoading}>
              取消
            </Button>
            <Button 
              onClick={handleImportCsv} 
              disabled={!csvContent || importLoading || createBenchmark?.isPending}
              className="px-6"
            >
              {importLoading || createBenchmark?.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  导入中...
                </span>
              ) : (
                '导入'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced CSV Import Dialog */}
      <CsvImportEnhanced
        isOpen={enhancedImportOpen}
        onClose={() => setEnhancedImportOpen(false)}
        onImport={async (importData) => {
          try {
            await createBenchmark.mutateAsync({
              config: {
                ...importData.config,
                submitter: importData.config.submitter || importConfig.submitter,
                modelName: importData.config.modelName || importConfig.modelName,
                serverName: importData.config.serverName || importConfig.serverName,
                framework: importData.config.framework || importConfig.framework,
                frameworkVersion: importData.config.frameworkVersion || importConfig.frameworkVersion,
                chipName: importData.config.chipName || importConfig.chipName,
                shardingConfig: importData.config.shardingConfig || importConfig.shardingConfig,
                testDate: importData.config.testDate || importConfig.testDate,
                operatorAcceleration: importData.config.operatorAcceleration,
                frameworkParams: importData.config.frameworkParams,
                notes: importData.config.notes,
                graphMode: importData.config.graphMode,
                scenario: importData.config.scenario,
                features: importData.config.features,
              },
              metrics: importData.metrics,
            })
            toast.success(`成功导入 ${importData.metrics.length} 条性能数据`)
            setEnhancedImportOpen(false)
          } catch (error: any) {
            toast.error(`导入失败: ${error.message || '未知错误'}`)
          }
        }}
        existingBenchmarks={benchmarks}
        isLoading={createBenchmark?.isPending}
      />

      {/* Enhanced Add Benchmark Dialog */}
      <Dialog open={enhancedAddOpen} onOpenChange={setEnhancedAddOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">手动添加基准测试</DialogTitle>
          </DialogHeader>
          <AddBenchmarkEnhanced
            onSubmit={async (data) => {
              try {
                await createBenchmark.mutateAsync(data)
                toast.success(`成功添加基准测试: ${data.config.modelName}`)
                setEnhancedAddOpen(false)
              } catch (error: any) {
                toast.error(`添加失败: ${error.message || '未知错误'}`)
              }
            }}
            onCancel={() => setEnhancedAddOpen(false)}
            isSubmitting={createBenchmark?.isPending}
            existingBenchmarks={benchmarks}
          />
        </DialogContent>
      </Dialog>

      {/* Benchmark Detail Dialog */}
      <BenchmarkDetailDialog
        benchmark={editingBenchmark}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSave={handleSaveBenchmark}
        isSaving={updateBenchmark.isPending}
      />

      {/* Benchmark View Only Dialog */}
      <BenchmarkViewOnlyDialog
        benchmark={viewingBenchmark}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  )
}
