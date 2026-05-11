import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { BenchmarkConfig, BenchmarkMetricsEntry } from '@/lib/types'

interface AddBenchmarkFormProps {
  onSubmit: (data: { config: BenchmarkConfig; metrics: BenchmarkMetricsEntry[] }) => void
  onCancel: () => void
  isSubmitting?: boolean
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

export function AddBenchmarkForm({ onSubmit, onCancel, isSubmitting = false }: AddBenchmarkFormProps) {
  const [config, setConfig] = useState<BenchmarkConfig>(defaultConfig)
  const [metrics, setMetrics] = useState<BenchmarkMetricsEntry[]>([{ ...defaultMetric }])
  const [activeStep, setActiveStep] = useState<'config' | 'metrics'>('config')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateConfig = (field: keyof BenchmarkConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors })
    }
  }

  const addMetric = () => {
    const lastMetric = metrics[metrics.length - 1]
    const newConcurrency = lastMetric ? lastMetric.concurrency * 2 : 1
    setMetrics(prev => [...prev, { ...defaultMetric, concurrency: newConcurrency }])
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
    
    metrics.forEach((metric, index) => {
      if (metric.concurrency <= 0) {
        newErrors[`metric_${index}_concurrency`] = '并发数必须大于0'
      }
      if (metric.inputLength <= 0) {
        newErrors[`metric_${index}_inputLength`] = '输入长度必须大于0'
      }
      if (metric.outputLength <= 0) {
        newErrors[`metric_${index}_outputLength`] = '输出长度必须大于0'
      }
      if (metric.ttft < 0) {
        newErrors[`metric_${index}_ttft`] = 'TTFT不能为负数'
      }
      if (metric.tpot < 0) {
        newErrors[`metric_${index}_tpot`] = 'TPOT不能为负数'
      }
      if (metric.tokensPerSecond < 0) {
        newErrors[`metric_${index}_tokensPerSecond`] = 'TPS不能为负数'
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
    if (!validateConfig() || !validateMetrics()) {
      if (!validateConfig()) {
        setActiveStep('config')
      }
      return
    }

    onSubmit({ config, metrics })
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
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
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} className="px-6">
              取消
            </Button>
            <Button onClick={handleNextStep} className="px-6">
              下一步
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                性能指标数据
                <Badge variant="secondary">{metrics.length} 条</Badge>
              </h4>
              <Button size="sm" onClick={addMetric} variant="outline" className="gap-1">
                <Plus className="w-4 h-4" /> 添加指标
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-white border rounded-lg p-3">
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
                      <Label className="text-xs text-slate-600">并发数</Label>
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
                        className={`h-8 text-sm ${errors[`metric_${index}_tokensPerSecond`] ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {metrics.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>暂无性能指标数据</p>
                <Button size="sm" onClick={addMetric} variant="outline" className="mt-2">
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
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} className="px-6">
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
    </div>
  )
}

export default AddBenchmarkForm
