import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Benchmark } from '@/lib/types'
import { parseCardCount } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartBar, FileText, Settings, Activity } from 'lucide-react'

interface BenchmarkViewOnlyDialogProps {
  benchmark: Benchmark | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BenchmarkViewOnlyDialog({
  benchmark,
  open,
  onOpenChange,
}: BenchmarkViewOnlyDialogProps) {
  if (!benchmark) return null

  const cardCount = benchmark ? parseCardCount(benchmark.config.shardingConfig) : 1;

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen)
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              配置信息
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              性能数据
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <ChartBar className="w-4 h-4" />
              数据摘要
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">测试配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">模型名称</span>
                    <p className="font-medium">{benchmark.config.modelName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">服务器名称</span>
                    <p className="font-medium">{benchmark.config.serverName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">AI芯片</span>
                    <p className="font-medium">{benchmark.config.chipName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">推理框架</span>
                    <p className="font-medium">{benchmark.config.framework}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">框架版本</span>
                    <p className="font-medium">{benchmark.config.frameworkVersion || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">切分参数</span>
                    <p className="font-medium">
                      {benchmark.config.shardingConfig || '-'}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({parseCardCount(benchmark.config.shardingConfig)}卡)
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">提交人</span>
                    <p className="font-medium">{benchmark.config.submitter}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">测试日期</span>
                    <p className="font-medium">{benchmark.config.testDate}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">图模式</span>
                    <p className="font-medium">{benchmark.config.graphMode || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">算子加速</span>
                    <p className="font-medium">{benchmark.config.operatorAcceleration || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">场景</span>
                    <p className="font-medium">{benchmark.config.scenario || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">特性</span>
                    <p className="font-medium">{Array.isArray(benchmark.config.features) ? benchmark.config.features.join(', ') : benchmark.config.features || '-'}</p>
                  </div>
                  {benchmark.config.frameworkParams && (
                    <div className="col-span-2 space-y-1">
                      <span className="text-sm text-muted-foreground">框架启动参数</span>
                      <p className="font-mono text-sm bg-muted p-2 rounded">{benchmark.config.frameworkParams}</p>
                    </div>
                  )}
                  {benchmark.config.dataset_args && (
                    <div className="col-span-2 space-y-1">
                      <span className="text-sm text-muted-foreground">数据集参数</span>
                      <p className="font-mono text-sm bg-muted p-2 rounded">{benchmark.config.dataset_args}</p>
                    </div>
                  )}
                  {benchmark.config.notes && (
                    <div className="col-span-2 space-y-1">
                      <span className="text-sm text-muted-foreground">备注</span>
                      <p className="font-medium">{benchmark.config.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">性能指标数据</CardTitle>
                <Badge variant="outline">共 {benchmark.metrics.length} 条数据</Badge>
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
                        <TableHead className="text-center">每卡 TPS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benchmark.metrics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            暂无性能数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        benchmark.metrics.map((metric, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="text-center font-mono">{metric.concurrency ?? 0}</TableCell>
                            <TableCell className="text-center font-mono">{metric.inputLength ?? 0}</TableCell>
                            <TableCell className="text-center font-mono">{metric.outputLength ?? 0}</TableCell>
                            <TableCell className="text-center font-mono">{(metric.ttft ?? 0).toFixed(2)}</TableCell>
                            <TableCell className="text-center font-mono">{(metric.tpot ?? 0).toFixed(2)}</TableCell>
                            <TableCell className="text-center font-mono">{((metric.tokensPerSecond ?? 0) / cardCount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">性能数据摘要</CardTitle>
              </CardHeader>
              <CardContent>
                {benchmark.metrics.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <span className="text-sm text-muted-foreground">平均TTFT</span>
                        <p className="text-2xl font-bold">
                          {(benchmark.metrics.reduce((sum, m) => sum + (m.ttft || 0), 0) / benchmark.metrics.length).toFixed(2)} ms
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <span className="text-sm text-muted-foreground">平均TPOT</span>
                        <p className="text-2xl font-bold">
                          {(benchmark.metrics.reduce((sum, m) => sum + (m.tpot || 0), 0) / benchmark.metrics.length).toFixed(2)} ms
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <span className="text-sm text-muted-foreground">平均TPS</span>
                        <p className="text-2xl font-bold">
                          {((benchmark.metrics.reduce((sum, m) => sum + (m.tokensPerSecond || 0), 0) / benchmark.metrics.length) / cardCount).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <span className="text-sm text-muted-foreground">并发数范围</span>
                        <p className="text-2xl font-bold">
                          {Math.min(...benchmark.metrics.map(m => m.concurrency || 0))} - {Math.max(...benchmark.metrics.map(m => m.concurrency || 0))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">并发数性能对比</h4>
                      <div className="space-y-2">
                        {benchmark.metrics.map((metric, index) => (
                          <div key={index} className="flex items-center gap-4 p-2 border rounded">
                            <span className="w-16 text-sm font-medium">并发 {metric.concurrency}</span>
                            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ 
                                  width: `${Math.min(100, ((metric.tokensPerSecond / cardCount) / Math.max(...benchmark.metrics.map(m => (m.tokensPerSecond || 1) / cardCount))) * 100)}%` 
                                }} 
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-24 text-right">
                              {(metric.tokensPerSecond / cardCount).toFixed(2)} TPS
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">暂无性能数据</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default BenchmarkViewOnlyDialog
