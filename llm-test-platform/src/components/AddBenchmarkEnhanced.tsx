import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Copy, FileSpreadsheet, Save, History, ChevronDown, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { BenchmarkConfig, BenchmarkMetricsEntry, Benchmark } from '@/lib/types'

interface AddBenchmarkEnhancedProps {
  onSubmit: (data: { config: BenchmarkConfig; metrics: BenchmarkMetricsEntry[] }) => void
  onCancel: () => void
  isSubmitting?: boolean
  existingBenchmarks?: Benchmark[]
}

// 指标模板类型
interface MetricsTemplate {
  id: string
  name: string
  description?: string
  metrics: BenchmarkMetricsEntry[]
  createdAt: string
}

const defaultConfig: BenchmarkConfig = {
  submitter: 'admin',
  modelName: '',
  serverName: '',
  framework: 'MindIE',
  frameworkVersion: '',
  chipName: '',
  shardingConfig: '',
  testDate: new Date().toISOString().split('T')[0],
}

const defaultMetric: BenchmarkMetricsEntry = {
  concurrency: 1,
  inputLength: 1024,
  outputLength: 128,
  ttft: 0,
  tpot: 0,
  tokensPerSecond: 0,
}

// 常用并发数模板
const COMMON_CONCURRENCY_TEMPLATES = [
  { name: '标准并发(1-16)', metrics: [1, 2, 4, 8, 16] },
  { name: '高并发(16-128)', metrics: [16, 32, 64, 96, 128] },
  { name: '全范围(1-128)', metrics: [1, 2, 4, 8, 16, 32, 64, 96, 128] },
]

// 从localStorage加载模板
const loadTemplates = (): MetricsTemplate[] => {
  try {
    const saved = localStorage.getItem('benchmarkMetricsTemplates')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// 保存模板到localStorage
const saveTemplates = (templates: MetricsTemplate[]) => {
  try {
    localStorage.setItem('benchmarkMetricsTemplates', JSON.stringify(templates))
  } catch (error) {
    console.error('Failed to save templates:', error)
  }
}

export function AddBenchmarkEnhanced({
  onSubmit,
  onCancel,
  isSubmitting = false,
  existingBenchmarks = [],
}: AddBenchmarkEnhancedProps) {
  const [config, setConfig] = useState<BenchmarkConfig>(defaultConfig)
  const [metrics, setMetrics] = useState<BenchmarkMetricsEntry[]>([{ ...defaultMetric }])
  const [activeStep, setActiveStep] = useState<'config' | 'metrics'>('config')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [templates, setTemplates] = useState<MetricsTemplate[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [csvPasteContent, setCsvPasteContent] = useState('')
  const [showCsvPaste, setShowCsvPaste] = useState(false)
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<number[]>([])

  // 加载模板
  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const updateConfig = (field: keyof BenchmarkConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors })
    }
  }

  const addMetric = (metricData?: Partial<BenchmarkMetricsEntry>) => {
    const lastMetric = metrics[metrics.length - 1]
    const newMetric: BenchmarkMetricsEntry = {
      ...defaultMetric,
      concurrency: lastMetric ? lastMetric.concurrency * 2 : 1,
      ...metricData,
    }
    setMetrics(prev => [...prev, newMetric])
  }

  const updateMetric = (index: number, field: keyof BenchmarkMetricsEntry, value: number) => {
    setMetrics(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
    const errorKey = `metric_${index}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[errorKey]; return newErrors })
    }
  }

  const removeMetric = (index: number) => {
    if (metrics.length <= 1) {
      toast.error('至少需要一个性能指标')
      return
    }
    setMetrics(prev => prev.filter((_, i) => i !== index))
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!config.modelName.trim()) {
      newErrors.modelName = '请输入模型名称'
    } else if (config.modelName.length > 100) {
      newErrors.modelName = '模型名称不能超过100个字符'
    }

    if (!config.serverName.trim()) {
      newErrors.serverName = '请输入服务器名称'
    }

    if (!config.chipName.trim()) {
      newErrors.chipName = '请输入AI芯片型号'
    }

    if (!config.framework) {
      newErrors.framework = '请选择推理框架'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateMetrics = (): boolean => {
    const newErrors: Record<string, string> = {}
    const concurrencySet = new Set<number>()
    
    metrics.forEach((metric, index) => {
      if (metric.concurrency <= 0) {
        newErrors[`metric_${index}_concurrency`] = '并发数必须大于0'
      } else if (concurrencySet.has(metric.concurrency)) {
        newErrors[`metric_${index}_concurrency`] = `并发数 ${metric.concurrency} 重复`
      } else {
        concurrencySet.add(metric.concurrency)
      }

      if (metric.inputLength <= 0 || metric.inputLength > 100000) {
        newErrors[`metric_${index}_inputLength`] = '输入长度范围: 1-100000'
      }

      if (metric.outputLength <= 0 || metric.outputLength > 100000) {
        newErrors[`metric_${index}_outputLength`] = '输出长度范围: 1-100000'
      }

      if (metric.ttft < 0 || metric.ttft > 10000) {
        newErrors[`metric_${index}_ttft`] = 'TTFT范围: 0-10000ms'
      }

      if (metric.tpot < 0 || metric.tpot > 1000) {
        newErrors[`metric_${index}_tpot`] = 'TPOT范围: 0-1000ms'
      }

      if (metric.tokensPerSecond < 0 || metric.tokensPerSecond > 10000) {
        newErrors[`metric_${index}_tokensPerSecond`] = 'TPS范围: 0-10000'
      }

      // 一致性检查
      if (metric.tpot > 0) {
        const expectedTps = 1000 / metric.tpot
        if (Math.abs(metric.tokensPerSecond - expectedTps) / expectedTps > 0.5) {
          newErrors[`metric_${index}_consistency`] = `TPS与TPOT不匹配(期望约${expectedTps.toFixed(1)})`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateConfig()) {
      setActiveStep('metrics')
    }
  }

  const handleSubmit = () => {
    if (!validateConfig()) {
      setActiveStep('config')
      return
    }

    if (!validateMetrics()) {
      return
    }

    onSubmit({ config, metrics })
  }

  // 保存为模板
  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称')
      return
    }

    const newTemplate: MetricsTemplate = {
      id: Date.now().toString(),
      name: templateName,
      description: templateDescription,
      metrics: [...metrics],
      createdAt: new Date().toISOString(),
    }

    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    saveTemplates(updatedTemplates)
    
    setTemplateName('')
    setTemplateDescription('')
    setShowTemplateDialog(false)
    toast.success('模板保存成功')
  }

  // 加载模板
  const loadTemplate = (template: MetricsTemplate) => {
    setMetrics([...template.metrics])
    toast.success(`已加载模板: ${template.name}`)
  }

  // 删除模板
  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId)
    setTemplates(updatedTemplates)
    saveTemplates(updatedTemplates)
    toast.success('模板已删除')
  }

  // 应用并发数模板
  const applyConcurrencyTemplate = (concurrencyList: number[]) => {
    const newMetrics = concurrencyList.map((concurrency, index) => {
      const existingMetric = metrics[index] || defaultMetric
      return { ...existingMetric, concurrency }
    })
    setMetrics(newMetrics)
    toast.success(`已应用模板: ${concurrencyList.join(', ')}`)
  }

  // 解析CSV粘贴内容
  const parseCsvPaste = () => {
    if (!csvPasteContent.trim()) {
      toast.error('请输入CSV数据')
      return
    }

    const lines = csvPasteContent.trim().split('\n')
    const parsedMetrics: BenchmarkMetricsEntry[] = []
    const parseErrors: string[] = []

    lines.forEach((line, index) => {
      const values = line.split(/[,\t]/).map(v => v.trim())
      
      if (values.length >= 3) {
        const concurrency = parseInt(values[0])
        const ttft = parseFloat(values[1])
        const tpot = parseFloat(values[2])
        const tokensPerSecond = values[3] ? parseFloat(values[3]) : (tpot > 0 ? 1000 / tpot : 0)
        const inputLength = values[4] ? parseInt(values[4]) : 1024
        const outputLength = values[5] ? parseInt(values[5]) : 128

        if (!isNaN(concurrency) && !isNaN(ttft) && !isNaN(tpot)) {
          parsedMetrics.push({
            concurrency,
            inputLength,
            outputLength,
            ttft,
            tpot,
            tokensPerSecond,
          })
        } else {
          parseErrors.push(`第${index + 1}行: 数据格式错误`)
        }
      } else {
        parseErrors.push(`第${index + 1}行: 数据列数不足`)
      }
    })

    if (parsedMetrics.length > 0) {
      setMetrics(parsedMetrics)
      setShowCsvPaste(false)
      setCsvPasteContent('')
      toast.success(`成功导入 ${parsedMetrics.length} 条数据`)
    }

    if (parseErrors.length > 0) {
      toast.error(parseErrors.slice(0, 3).join('\n') + (parseErrors.length > 3 ? `\n...还有${parseErrors.length - 3}个错误` : ''))
    }
  }

  // 复制现有基准测试
  const copyExistingBenchmark = (benchmark: Benchmark) => {
    setConfig({
      ...defaultConfig,
      modelName: `${benchmark.config.modelName} (复制)`,
      serverName: benchmark.config.serverName,
      framework: benchmark.config.framework,
      frameworkVersion: benchmark.config.frameworkVersion,
      chipName: benchmark.config.chipName,
      shardingConfig: benchmark.config.shardingConfig,
      testDate: new Date().toISOString().split('T')[0],
    })
    setMetrics(benchmark.metrics.map(m => ({ ...m })))
    setShowCopyDialog(false)
    setActiveStep('config')
    toast.success(`已复制: ${benchmark.config.modelName}`)
  }

  // 批量更新指标
  const batchUpdateMetrics = (field: keyof BenchmarkMetricsEntry, value: number) => {
    setMetrics(prev => prev.map(m => ({ ...m, [field]: value })))
    toast.success(`已将${field}更新为${value}`)
  }

  return (
    <div className="space-y-6">
      {/* 复制现有测试按钮 */}
      {existingBenchmarks.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)} className="gap-2">
            <Copy className="w-4 h-4" />
            复制现有测试
          </Button>
        </div>
      )}

      {/* 进度步骤 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            activeStep === 'config' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {activeStep === 'config' ? '1' : <CheckCircle className="w-4 h-4" />}
          </div>
          <span className={`text-sm font-medium ${activeStep === 'config' ? 'text-blue-600' : 'text-slate-600'}`}>
            配置信息
          </span>
        </div>
        <div className="flex-1 h-0.5 bg-slate-200">
          <div className={`h-full transition-all ${activeStep === 'metrics' ? 'bg-green-600 w-full' : 'bg-blue-600 w-0'}`} />
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            activeStep === 'metrics' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            2
          </div>
          <span className={`text-sm font-medium ${activeStep === 'metrics' ? 'text-blue-600' : 'text-slate-400'}`}>
            性能指标
          </span>
        </div>
      </div>

      {activeStep === 'config' ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
              测试配置信息
              <span className="text-xs text-slate-500 font-normal">（*为必填项）</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="modelName" className="text-xs font-semibold text-slate-700">
                  模型名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelName"
                  value={config.modelName}
                  onChange={(e) => updateConfig('modelName', e.target.value)}
                  placeholder="如：Qwen-14B"
                  className={`bg-white border-slate-300 focus:bg-white h-9 ${errors.modelName ? 'border-red-500' : ''}`}
                />
                {errors.modelName && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.modelName}
                  </span>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="serverName" className="text-xs font-semibold text-slate-700">
                  服务器名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serverName"
                  value={config.serverName}
                  onChange={(e) => updateConfig('serverName', e.target.value)}
                  placeholder="如：server-01"
                  className={`bg-white border-slate-300 focus:bg-white h-9 ${errors.serverName ? 'border-red-500' : ''}`}
                />
                {errors.serverName && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.serverName}
                  </span>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="framework" className="text-xs font-semibold text-slate-700">
                  推理框架 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={config.framework}
                  onValueChange={(v) => updateConfig('framework', v)}
                >
                  <SelectTrigger className={`bg-white border-slate-300 h-9 ${errors.framework ? 'border-red-500' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MindIE">MindIE</SelectItem>
                    <SelectItem value="VLLM">VLLM</SelectItem>
                    <SelectItem value="TensorRT-LLM">TensorRT-LLM</SelectItem>
                    <SelectItem value="DeepSpeed">DeepSpeed</SelectItem>
                    <SelectItem value="vLLM">vLLM</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
                {errors.framework && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.framework}
                  </span>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="frameworkVersion" className="text-xs font-semibold text-slate-700">
                  框架版本
                </Label>
                <Input
                  id="frameworkVersion"
                  value={config.frameworkVersion}
                  onChange={(e) => updateConfig('frameworkVersion', e.target.value)}
                  placeholder="如：v1.0.1"
                  className="bg-white border-slate-300 focus:bg-white h-9"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="chipName" className="text-xs font-semibold text-slate-700">
                  AI芯片 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="chipName"
                  value={config.chipName}
                  onChange={(e) => updateConfig('chipName', e.target.value)}
                  placeholder="如：GPU-A100"
                  className={`bg-white border-slate-300 focus:bg-white h-9 ${errors.chipName ? 'border-red-500' : ''}`}
                />
                {errors.chipName && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.chipName}
                  </span>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="shardingConfig" className="text-xs font-semibold text-slate-700">
                  切分参数
                </Label>
                <Input
                  id="shardingConfig"
                  value={config.shardingConfig}
                  onChange={(e) => updateConfig('shardingConfig', e.target.value)}
                  placeholder="如：tp=4"
                  className="bg-white border-slate-300 focus:bg-white h-9"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="testDate" className="text-xs font-semibold text-slate-700">
                  测试日期
                </Label>
                <Input
                  id="testDate"
                  type="date"
                  value={config.testDate}
                  onChange={(e) => updateConfig('testDate', e.target.value)}
                  className="bg-white border-slate-300 focus:bg-white h-9"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="submitter" className="text-xs font-semibold text-slate-700">
                  提交人
                </Label>
                <Input
                  id="submitter"
                  value={config.submitter}
                  onChange={(e) => updateConfig('submitter', e.target.value)}
                  className="bg-white border-slate-300 focus:bg-white h-9"
                />
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="graphMode" className="text-xs font-semibold text-slate-700">
                  图模式
                </Label>
                <Textarea
                  id="graphMode"
                  value={config.graphMode || ''}
                  onChange={(e) => updateConfig('graphMode', e.target.value)}
                  placeholder="例如：eager,aclgraph"
                  className="bg-white border-slate-300 focus:bg-white min-h-[60px]"
                />
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="operatorAcceleration" className="text-xs font-semibold text-slate-700">
                  算子加速
                </Label>
                <Input
                  id="operatorAcceleration"
                  value={config.operatorAcceleration || ''}
                  onChange={(e) => updateConfig('operatorAcceleration', e.target.value)}
                  placeholder="如：FlashAttention"
                  className="bg-white border-slate-300 focus:bg-white h-9"
                />
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                  备注
                </Label>
                <Textarea
                  id="notes"
                  value={config.notes || ''}
                  onChange={(e) => updateConfig('notes', e.target.value)}
                  placeholder="输入其他备注信息..."
                  className="bg-white border-slate-300 focus:bg-white min-h-[60px]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="px-6">
              取消
            </Button>
            <Button onClick={handleNextStep} className="px-6">
              下一步
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <History className="w-4 h-4" />
                  并发数模板
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {COMMON_CONCURRENCY_TEMPLATES.map((template) => (
                  <DropdownMenuItem
                    key={template.name}
                    onClick={() => applyConcurrencyTemplate(template.metrics)}
                  >
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Save className="w-4 h-4" />
                  我的模板
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {templates.length === 0 ? (
                  <DropdownMenuItem disabled>暂无保存的模板</DropdownMenuItem>
                ) : (
                  templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="flex items-center justify-between"
                    >
                      <span>{template.name}</span>
                      <Trash2
                        className="w-3 h-3 text-red-500 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTemplate(template.id)
                        }}
                      />
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => setShowCsvPaste(true)} className="gap-1">
              <FileSpreadsheet className="w-4 h-4" />
              粘贴CSV
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)} className="gap-1">
              <Save className="w-4 h-4" />
              保存模板
            </Button>

            <div className="flex-1"></div>

            <Button size="sm" onClick={() => addMetric()} variant="outline" className="gap-1">
              <Plus className="w-4 h-4" /> 添加指标
            </Button>
          </div>

          {/* 批量操作 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">批量设置:</span>
            <Input
              type="number"
              placeholder="输入长度"
              className="w-24 h-7 text-xs"
              onChange={(e) => batchUpdateMetrics('inputLength', parseInt(e.target.value) || 1024)}
            />
            <Input
              type="number"
              placeholder="输出长度"
              className="w-24 h-7 text-xs"
              onChange={(e) => batchUpdateMetrics('outputLength', parseInt(e.target.value) || 128)}
            />
          </div>

          {/* 指标列表 */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                性能指标数据
                <Badge variant="secondary">{metrics.length} 条</Badge>
              </h4>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-2">
                {metrics.map((metric, index) => (
                  <div
                    key={index}
                    className={`bg-white border rounded-lg p-3 ${
                      errors[`metric_${index}_concurrency`] ||
                      errors[`metric_${index}_inputLength`] ||
                      errors[`metric_${index}_outputLength`] ||
                      errors[`metric_${index}_ttft`] ||
                      errors[`metric_${index}_tpot`] ||
                      errors[`metric_${index}_tokensPerSecond`] ||
                      errors[`metric_${index}_consistency`]
                        ? 'border-red-300 bg-red-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">指标 #{index + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMetric(index)}
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">并发数 *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={metric.concurrency}
                          onChange={(e) => updateMetric(index, 'concurrency', parseInt(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_concurrency`] ? 'border-red-500' : ''}`}
                        />
                        {errors[`metric_${index}_concurrency`] && (
                          <span className="text-[10px] text-red-500">{errors[`metric_${index}_concurrency`]}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">输入长度</Label>
                        <Input
                          type="number"
                          min={1}
                          value={metric.inputLength}
                          onChange={(e) => updateMetric(index, 'inputLength', parseInt(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_inputLength`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">输出长度</Label>
                        <Input
                          type="number"
                          min={1}
                          value={metric.outputLength}
                          onChange={(e) => updateMetric(index, 'outputLength', parseInt(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_outputLength`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">TTFT (ms)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={metric.ttft}
                          onChange={(e) => updateMetric(index, 'ttft', parseFloat(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_ttft`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">TPOT (ms)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={metric.tpot}
                          onChange={(e) => updateMetric(index, 'tpot', parseFloat(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_tpot`] ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">TPS</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={metric.tokensPerSecond}
                          onChange={(e) => updateMetric(index, 'tokensPerSecond', parseFloat(e.target.value) || 0)}
                          className={`h-8 text-sm ${errors[`metric_${index}_tokensPerSecond`] || errors[`metric_${index}_consistency`] ? 'border-red-500' : ''}`}
                        />
                        {errors[`metric_${index}_consistency`] && (
                          <span className="text-[10px] text-red-500">{errors[`metric_${index}_consistency`]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {metrics.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>暂无性能指标数据</p>
                <Button size="sm" onClick={() => addMetric()} variant="outline" className="mt-2">
                  <Plus className="w-4 h-4 mr-1" /> 添加第一条指标
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep('config')} disabled={isSubmitting}>
              上一步
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="px-6">
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || metrics.length === 0}
                className="px-6"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    提交中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    添加基准测试
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 保存模板对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>模板名称 *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="输入模板名称"
              />
            </div>
            <div className="grid gap-2">
              <Label>描述</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="输入模板描述（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={saveAsTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV粘贴对话框 */}
      <Dialog open={showCsvPaste} onOpenChange={setShowCsvPaste}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>粘贴CSV数据</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Alert>
              <AlertDescription className="text-sm">
                支持从Excel或CSV文件复制粘贴。格式：并发数,TTFT,TPOT,TPS,输入长度,输出长度
                <br />
                示例：1,45.2,12.5,156.3,1024,128
              </AlertDescription>
            </Alert>
            <Textarea
              value={csvPasteContent}
              onChange={(e) => setCsvPasteContent(e.target.value)}
              placeholder="在此粘贴CSV数据..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvPaste(false)}>
              取消
            </Button>
            <Button onClick={parseCsvPaste}>
              <Upload className="w-4 h-4 mr-2" />
              解析数据
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复制现有测试对话框 */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="bg-white max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>复制现有基准测试</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="grid gap-3 p-4">
              {existingBenchmarks.map((benchmark) => (
                <div
                  key={benchmark.id}
                  onClick={() => copyExistingBenchmark(benchmark)}
                  className="p-4 border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{benchmark.config.modelName}</p>
                      <p className="text-sm text-slate-500">
                        {benchmark.config.serverName} | {benchmark.config.framework} | {benchmark.metrics.length}条数据
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AddBenchmarkEnhanced
