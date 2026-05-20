import { useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Upload,
  Clipboard,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
  Plus,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import type { BenchmarkConfig, BenchmarkMetricsEntry, Benchmark } from '@/lib/types'
import { parseCSV } from '@/lib/csv-parser'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface CsvImportEnhancedProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: { config: BenchmarkConfig; metrics: BenchmarkMetricsEntry[] }) => void
  existingBenchmarks?: Benchmark[]
  isLoading?: boolean
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  submitter: '',
  modelName: '',
  serverName: '',
  framework: '',
  frameworkVersion: '',
  chipName: '',
  shardingConfig: '',
  scenario: '对话',
  features: [],
  graphMode: '',
  operatorAcceleration: '',
  frameworkParams: '',
  testDate: new Date().toISOString().split('T')[0],
  notes: '',
}

const CSV_PLACEHOLDER_EXAMPLE = `parallel,input,output,total input Tokens,total output Tokens,duration (s),,output throughput (tok/s),,Mean TTFT (ms),,Mean TPOT (ms),,Mean ITL (ms)
16,256,1024,4096,16384,56.2584375590086,,291.22742669159766,,417.7063327806536,,54.57922939602254,,54.5259199566317
16,256,4096,4096,65536,240.95772743597627,,271.9813167951348,,419.53694124822505,,58.73777987707665,,58.72343752662346`

export function CsvImportEnhanced({
  isOpen,
  onClose,
  onImport,
  isLoading = false,
}: CsvImportEnhancedProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload')
  const [parsedMetrics, setParsedMetrics] = useState<BenchmarkMetricsEntry[]>([])
  const [importConfig, setImportConfig] = useState<BenchmarkConfig>(DEFAULT_CONFIG)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [csvText, setCsvText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate card count hint
  const cardCountHint = useMemo(() => {
    if (!importConfig.shardingConfig) return null
    const matches = importConfig.shardingConfig.match(/\d+/g)
    if (!matches) return null
    const total = matches.reduce((acc, val) => acc * parseInt(val), 1)
    return `预计使用 ${total} 块卡`
  }, [importConfig.shardingConfig])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('请上传CSV格式文件')
      return
    }

    setFileName(file.name)
    setError('')
    setParsedMetrics([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || ''
        const metrics = parseCSV(text)
        setParsedMetrics(metrics)
        toast.success(`成功解析 ${metrics.length} 条数据`)
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析 CSV 文件时发生错误')
        setParsedMetrics([])
      }
    }
    reader.readAsText(file)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCsvText(text)
    setError('')
    
    if (!text.trim()) {
      setParsedMetrics([])
      return
    }

    try {
      const metrics = parseCSV(text)
      setParsedMetrics(metrics)
    } catch (err) {
      // Don't show error immediately while typing, only if needed or maybe just let it fail silently until valid
      // But for better UX let's show error if it's not empty
      setError(err instanceof Error ? err.message : '解析 CSV 内容时发生错误')
      setParsedMetrics([])
    }
  }

  const handleRemoveFile = () => {
    setFileName('')
    setParsedMetrics([])
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClearText = () => {
    setCsvText('')
    setParsedMetrics([])
    setError('')
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'upload' | 'paste')
    setParsedMetrics([])
    setError('')
    if (value === 'upload') {
      setCsvText('')
    } else {
      setFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const isConfigValid = 
    importConfig.modelName &&
    importConfig.serverName &&
    importConfig.shardingConfig &&
    importConfig.chipName &&
    importConfig.framework &&
    importConfig.frameworkVersion &&
    importConfig.submitter &&
    importConfig.testDate

  const handleImport = () => {
    if (!parsedMetrics.length) {
      toast.error('没有可导入的数据')
      return
    }
    if (!isConfigValid) {
      toast.error('请完善配置信息')
      return
    }

    onImport({
      config: importConfig,
      metrics: parsedMetrics
    })
    
    // Close dialog and reset is handled by parent or useEffect, but typically onClose is called
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            导入CSV基准测试数据
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="space-y-6">
            {/* Import Section */}
            <div className="space-y-3">
              <Label>导入方式</Label>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" /> 上传文件
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <Clipboard className="w-4 h-4" /> 粘贴文本
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-3 mt-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">点击上传 CSV 文件</p>
                        <p className="text-sm text-muted-foreground">支持 .csv 格式</p>
                      </div>
                    </div>
                  </div>

                  {fileName && (
                    <div className="flex items-center gap-3 text-sm bg-muted/60 px-3 py-2 rounded-md">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-medium truncate flex-1">{fileName}</span>
                      <Badge variant="secondary">{parsedMetrics.length} 条记录</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemoveFile}>
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paste" className="space-y-3 mt-4">
                   <div className="space-y-2">
                    <Textarea
                      placeholder={CSV_PLACEHOLDER_EXAMPLE}
                      value={csvText}
                      onChange={handleTextChange}
                      className="min-h-[200px] font-mono text-sm break-words"
                    />
                    {csvText && (
                      <div className="flex items-center gap-3 text-sm bg-muted/60 px-3 py-2 rounded-md">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="font-medium flex-1">已输入 CSV 数据</span>
                        <Badge variant="secondary">{parsedMetrics.length} 条记录</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearText}>
                          <X size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>解析失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Config Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">配置信息</h3>
                <p className="text-sm text-muted-foreground">以下配置将应用于所有导入的记录</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelName">模型名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="modelName"
                    value={importConfig.modelName}
                    onChange={(e) => setImportConfig({ ...importConfig, modelName: e.target.value })}
                    placeholder="例如：Qwen3-32B-FP8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serverName">服务器名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="serverName"
                    value={importConfig.serverName}
                    onChange={(e) => setImportConfig({ ...importConfig, serverName: e.target.value })}
                    placeholder="例如：服务器-A1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shardingConfig">切分参数 <span className="text-red-500">*</span></Label>
                  <Input
                    id="shardingConfig"
                    value={importConfig.shardingConfig}
                    onChange={(e) => setImportConfig({ ...importConfig, shardingConfig: e.target.value })}
                    placeholder="例如：TP4, TP16"
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Info size={12} />
                    <span>支持解析卡数</span>
                    {cardCountHint && (
                      <Badge variant="outline" className="ml-auto text-[10px] py-0 h-4 bg-primary/5 text-primary border-primary/20">
                        {cardCountHint}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chipName">AI 芯片 <span className="text-red-500">*</span></Label>
                  <Input
                    id="chipName"
                    value={importConfig.chipName}
                    onChange={(e) => setImportConfig({ ...importConfig, chipName: e.target.value })}
                    placeholder="例如：A100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="framework">推理框架 <span className="text-red-500">*</span></Label>
                  <Input
                    id="framework"
                    value={importConfig.framework}
                    onChange={(e) => setImportConfig({ ...importConfig, framework: e.target.value })}
                    placeholder="例如：MindIE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frameworkVersion">框架版本 <span className="text-red-500">*</span></Label>
                  <Input
                    id="frameworkVersion"
                    value={importConfig.frameworkVersion}
                    onChange={(e) => setImportConfig({ ...importConfig, frameworkVersion: e.target.value })}
                    placeholder="例如：v0.6.3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitter">提交人 <span className="text-red-500">*</span></Label>
                  <Input
                    id="submitter"
                    value={importConfig.submitter}
                    onChange={(e) => setImportConfig({ ...importConfig, submitter: e.target.value })}
                    placeholder="例如：张三"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testDate">测试日期 <span className="text-red-500">*</span></Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={importConfig.testDate}
                    onChange={(e) => setImportConfig({ ...importConfig, testDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>场景</Label>
                  <Select
                    value={importConfig.scenario || '对话'}
                    onValueChange={(value) => setImportConfig({ ...importConfig, scenario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="对话">对话</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>特性</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['FP4', 'FP8', '投机推理', 'KV Cache卸载', 'KV稀疏'].map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`import-feature-${feature}`}
                        checked={(Array.isArray(importConfig.features) ? importConfig.features : []).includes(feature)}
                        onCheckedChange={(checked) => {
                          const currentFeatures = Array.isArray(importConfig.features) ? [...importConfig.features] : []
                          if (checked) {
                            setImportConfig({ ...importConfig, features: [...currentFeatures, feature] })
                          } else {
                            setImportConfig({ ...importConfig, features: currentFeatures.filter(f => f !== feature) })
                          }
                        }}
                      />
                      <label
                        htmlFor={`import-feature-${feature}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="graphMode">图模式</Label>
                <Input
                  id="graphMode"
                  value={importConfig.graphMode}
                  onChange={(e) => setImportConfig({ ...importConfig, graphMode: e.target.value })}
                  placeholder="例如：eager,aclgraph"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operatorAcceleration">算子加速</Label>
                <Input
                  id="operatorAcceleration"
                  value={importConfig.operatorAcceleration}
                  onChange={(e) => setImportConfig({ ...importConfig, operatorAcceleration: e.target.value })}
                  placeholder="例如：FlashAttention"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frameworkParams">框架启动参数</Label>
                <Textarea
                  id="frameworkParams"
                  value={importConfig.frameworkParams}
                  onChange={(e) => setImportConfig({ ...importConfig, frameworkParams: e.target.value })}
                  placeholder="例如：--max-batch-size=256"
                  className="min-h-[80px] font-mono text-sm"
                />
              </div>

               <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Input
                  id="notes"
                  value={importConfig.notes}
                  onChange={(e) => setImportConfig({ ...importConfig, notes: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>

            {/* Preview Section */}
            {parsedMetrics.length > 0 && (
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      数据预览
                      <Badge variant="secondary" className="ml-2">{parsedMetrics.length} 条</Badge>
                    </h3>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>并发数</TableHead>
                          <TableHead>输入长度</TableHead>
                          <TableHead>输出长度</TableHead>
                          <TableHead>TTFT (ms)</TableHead>
                          <TableHead>TPOT (ms)</TableHead>
                          <TableHead>TPS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedMetrics.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.concurrency}</TableCell>
                            <TableCell>{row.inputLength}</TableCell>
                            <TableCell>{row.outputLength}</TableCell>
                            <TableCell>{row.ttft.toFixed(2)}</TableCell>
                            <TableCell>{row.tpot.toFixed(4)}</TableCell>
                            <TableCell>{row.tokensPerSecond.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-slate-50">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!parsedMetrics.length || !isConfigValid || isLoading}>
            {isLoading ? '导入中...' : '导入并保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CsvImportEnhanced
