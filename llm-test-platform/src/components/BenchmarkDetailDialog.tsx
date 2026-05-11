import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Benchmark, BenchmarkMetricsEntry } from '@/lib/types'
import { Pencil, Save, X, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface BenchmarkDetailDialogProps {
  benchmark: Benchmark | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: number, data: { config: Benchmark['config']; metrics: Benchmark['metrics'] }) => Promise<void>
  isSaving?: boolean
}

export function BenchmarkDetailDialog({
  benchmark,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: BenchmarkDetailDialogProps) {
  const [editConfig, setEditConfig] = useState<Benchmark['config'] | null>(null)
  const [editMetrics, setEditMetrics] = useState<BenchmarkMetricsEntry[]>([])
  const [editingMetricIndex, setEditingMetricIndex] = useState<number | null>(null)
  const [tempMetric, setTempMetric] = useState<BenchmarkMetricsEntry | null>(null)

  useEffect(() => {
    if (open && benchmark) {
      setEditConfig({
        submitter: benchmark.config?.submitter || '',
        modelName: benchmark.config?.modelName || '',
        serverName: benchmark.config?.serverName || '',
        chipName: benchmark.config?.chipName || '',
        framework: benchmark.config?.framework || '',
        frameworkVersion: benchmark.config?.frameworkVersion || '',
        shardingConfig: benchmark.config?.shardingConfig || '',
        graphMode: benchmark.config?.graphMode || '',
        operatorAcceleration: benchmark.config?.operatorAcceleration || '',
        frameworkParams: benchmark.config?.frameworkParams || '',
        testDate: benchmark.config?.testDate || '',
        notes: benchmark.config?.notes || '',
      })
      setEditMetrics(benchmark.metrics ? [...benchmark.metrics] : [])
    } else if (!open) {
      setEditConfig(null)
      setEditMetrics([])
      setEditingMetricIndex(null)
      setTempMetric(null)
    }
  }, [open, benchmark])

  if (!benchmark) return null

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen)
  }

  const handleSaveConfig = async () => {
    if (!editConfig) return
    try {
      await onSave(benchmark.id, { config: editConfig, metrics: editMetrics })
    } catch (error) {
      toast.error('保存失败')
    }
  }

  const handleStartEditMetric = (index: number) => {
    setEditingMetricIndex(index)
    setTempMetric({ ...editMetrics[index] })
  }

  const handleCancelEditMetric = () => {
    setEditingMetricIndex(null)
    setTempMetric(null)
  }

  const handleSaveMetric = () => {
    if (tempMetric && editingMetricIndex !== null) {
      const newMetrics = [...editMetrics]
      newMetrics[editingMetricIndex] = tempMetric
      setEditMetrics(newMetrics)
      setEditingMetricIndex(null)
      setTempMetric(null)
    }
  }

  const handleDeleteMetric = (index: number) => {
    const newMetrics = editMetrics.filter((_, i) => i !== index)
    setEditMetrics(newMetrics)
  }

  const handleAddMetric = () => {
    const newMetric: BenchmarkMetricsEntry = {
      inputLength: 1024,
      outputLength: 128,
      concurrency: 1,
      ttft: 0,
      tpot: 0,
      tokensPerSecond: 0,
    }
    setEditMetrics([...editMetrics, newMetric])
    setEditingMetricIndex(editMetrics.length)
    setTempMetric(newMetric)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{benchmark.config.modelName}</span>
            <Badge variant="secondary">{benchmark.unique_id}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">配置信息</TabsTrigger>
            <TabsTrigger value="metrics">性能数据 ({editMetrics.length} 条)</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">测试配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>模型名称</Label>
                    <Input
                      value={editConfig?.modelName || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, modelName: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>服务器名称</Label>
                    <Input
                      value={editConfig?.serverName || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, serverName: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI芯片</Label>
                    <Input
                      value={editConfig?.chipName || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, chipName: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>推理框架</Label>
                    <Input
                      value={editConfig?.framework || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, framework: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>框架版本</Label>
                    <Input
                      value={editConfig?.frameworkVersion || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, frameworkVersion: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>切分参数</Label>
                    <Input
                      value={editConfig?.shardingConfig || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, shardingConfig: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>提交人</Label>
                    <Input
                      value={editConfig?.submitter || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, submitter: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>测试日期</Label>
                    <Input
                      type="date"
                      value={editConfig?.testDate || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, testDate: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>图模式</Label>
                    <Input
                      value={editConfig?.graphMode || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, graphMode: e.target.value } : null)}
                      placeholder="例如：eager,aclgraph"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>算子加速</Label>
                    <Input
                      value={editConfig?.operatorAcceleration || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, operatorAcceleration: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>备注</Label>
                    <Input
                      value={editConfig?.notes || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>框架启动参数</Label>
                    <Input
                      value={editConfig?.frameworkParams || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, frameworkParams: e.target.value } : null)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">性能指标数据</CardTitle>
                <Button size="sm" onClick={handleAddMetric}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加数据
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">#</TableHead>
                        <TableHead className="text-center">并发数</TableHead>
                        <TableHead className="text-center">输入长度</TableHead>
                        <TableHead className="text-center">输出长度</TableHead>
                        <TableHead className="text-center">TTFT (ms)</TableHead>
                        <TableHead className="text-center">TPOT (ms)</TableHead>
                        <TableHead className="text-center">TPS (tokens/s)</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editMetrics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            暂无性能数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        editMetrics.map((metric, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            {editingMetricIndex === index && tempMetric ? (
                              <>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-20 text-center"
                                    value={tempMetric.concurrency}
                                    onChange={(e) => setTempMetric({ ...tempMetric, concurrency: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-24 text-center"
                                    value={tempMetric.inputLength}
                                    onChange={(e) => setTempMetric({ ...tempMetric, inputLength: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-24 text-center"
                                    value={tempMetric.outputLength}
                                    onChange={(e) => setTempMetric({ ...tempMetric, outputLength: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-24 text-center"
                                    value={tempMetric.ttft}
                                    onChange={(e) => setTempMetric({ ...tempMetric, ttft: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-24 text-center"
                                    value={tempMetric.tpot}
                                    onChange={(e) => setTempMetric({ ...tempMetric, tpot: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="w-32 text-center"
                                    value={tempMetric.tokensPerSecond}
                                    onChange={(e) => setTempMetric({ ...tempMetric, tokensPerSecond: parseFloat(e.target.value) || 0 })}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={handleSaveMetric}>
                                      <Save className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={handleCancelEditMetric}>
                                      <X className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-center font-mono">{metric.concurrency ?? 0}</TableCell>
                                <TableCell className="text-center font-mono">{metric.inputLength ?? 0}</TableCell>
                                <TableCell className="text-center font-mono">{metric.outputLength ?? 0}</TableCell>
                                <TableCell className="text-center font-mono">{(metric.ttft ?? 0).toFixed(2)}</TableCell>
                                <TableCell className="text-center font-mono">{(metric.tpot ?? 0).toFixed(2)}</TableCell>
                                <TableCell className="text-center font-mono">{(metric.tokensPerSecond ?? 0).toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handleStartEditMetric(index)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteMetric(index)}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>
            <X className="w-4 h-4 mr-1" />
            取消
          </Button>
          <Button onClick={handleSaveConfig} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? '保存中...' : '保存更改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
