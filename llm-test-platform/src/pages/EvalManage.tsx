import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Play, Terminal, Code, Bug, Link2, Key, Box, Eye, EyeOff, List, StopCircle, Info, RefreshCw, Trash2 } from 'lucide-react'

// 模拟的基准包数据
const MOCK_BENCH_PACKS = [
  { id: 'toolcall-15', name: '工具调用', type: '常规能力', isSandbox: false, isIpd: false },
  { id: 'instructfollow-15', name: '指令遵循', type: '常规能力', isSandbox: false, isIpd: false },
  { id: 'reasonmath-15', name: '数理推理', type: '常规能力', isSandbox: false, isIpd: false },
  { id: 'dataextract-15', name: '信息抽取', type: '常规能力', isSandbox: false, isIpd: false },
  { id: 'IPD', name: 'IPD', type: '开发流程支撑能力', isSandbox: false, isIpd: true, description: '包含IPD各个阶段能力验证' },
  { id: 'bugfind-15', name: '代码漏洞', type: '隔离沙盒能力', isSandbox: true, isIpd: false },
  { id: 'structoutput-15', name: '结构化输出', type: '隔离沙盒能力', isSandbox: true, isIpd: false },
  { id: 'hermesagent-20', name: 'Agent调度', type: '隔离沙盒能力', isSandbox: true, isIpd: false },
  { id: 'cli-40', name: '运维命令', type: '隔离沙盒能力', isSandbox: true, isIpd: false },
]

export default function EvalManage() {
  const navigate = useNavigate()
  
  // Views: list | create | logs | details
  const [view, setView] = useState<'list' | 'create' | 'logs' | 'details'>('list')
  const [step, setStep] = useState(1)
  
  // Task Data
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTask, setActiveTask] = useState<any>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<{ time: string, step: string, detail: string }[]>([])
  
  // 表单状态
  const [baseUrl, setBaseUrl] = useState('http://localhost:8001/v1')
  const [apiKey, setApiKey] = useState('EMPTY')
  const [showApiKey, setShowApiKey] = useState(false)
  const [modelName, setModelName] = useState('')
  const [selectedPacks, setSelectedPacks] = useState<string[]>([])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/eval/tasks')
      if (res.ok) {
        const data = await res.json()
        const newTasks = data.tasks || []
        setTasks(newTasks)
        setActiveTask(prev => prev ? (newTasks.find((t: any) => t.id === prev.id) || prev) : prev)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSelectAllPacks = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedPacks(MOCK_BENCH_PACKS.map(p => p.id))
    } else {
      setSelectedPacks([])
    }
  }

  const handleTogglePack = (id: string) => {
    setSelectedPacks(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleCreateTask = async () => {
    if (!baseUrl) { toast.error('请填写接口地址 (Base URL)'); return }
    if (!modelName) { toast.error('请填写模型名称 (Model Name)'); return }
    if (selectedPacks.length === 0) { toast.error('请至少选择一个评测基准'); return }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/eval/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packs: selectedPacks.join(','),
          model_name: modelName,
          base_url: baseUrl,
          api_key: apiKey || 'EMPTY'
        })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.message || err.error || 'Failed to create evaluation task');
      }
      
      toast.success('评测任务创建成功！')
      setIsSubmitting(false)
      setView('list')
      setStep(1)
      fetchTasks()
    } catch (error: any) {
      toast.error('任务创建失败: ' + error.message)
      setIsSubmitting(false)
    }
  }

  let pollInterval: any = null;

  const startLogPolling = (pid: number) => {
    let lastLineCount = 0;
    setLogs([]);
    setProgress(0);
    
    const fetchLogData = async () => {
      try {
        const logsRes = await fetch("/api/eval/logs");
        let hasError = false;
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const newLines = logsData.logs || [];
          if (newLines.length > lastLineCount) {
            const formattedLogs = newLines.slice(lastLineCount).map((line: string) => {
              const now = new Date();
              const isError = line.toLowerCase().includes("error") || line.toLowerCase().includes("traceback") || line.toLowerCase().includes("exception");
              if (isError) hasError = true;
              return {
                time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
                step: isError ? "[Exec] 错误异常" : "[Exec] 运行日志",
                detail: line
              };
            });
            setLogs(prev => [...prev, ...formattedLogs]);
            lastLineCount = newLines.length;
            setProgress(prev => Math.min(prev + Math.floor(Math.random() * 10) + 5, 95));
          }
        }
        
        if (pid === 0) return; // Not running

        const statusRes = await fetch(`/api/eval/status?pid=${pid}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setProgress(100);
            
            // Check if there was actually an error in the logs
            if (hasError) {
              toast.error("评测进程已退出，但日志中检测到异常，请检查环境！");
            } else {
              toast.success("评测执行完毕，报告已生成！");
            }
            fetchTasks();
          }
        }
      } catch (e) {
        console.error("Error polling logs:", e);
      }
    };
    
    // Fetch immediately once
    fetchLogData();
    
    if (pid !== 0) {
      pollInterval = setInterval(fetchLogData, 1500);
    }
  }


  const handleDeleteTask = async (task: any) => {
    if (!confirm('确定要删除任务 #' + task.id + ' 吗？')) return
    try {
      const res = await fetch('/api/eval/tasks/' + task.id, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        fetchTasks()
      } else {
        const err = await res.json()
        toast.error('删除失败: ' + (err.detail || '未知错误'))
      }
    } catch (e: any) {
      toast.error('删除失败: ' + e.message)
    }
  }

  const handleStartEval = async (task: any) => {

    try {
      const res = await fetch(`/api/eval/tasks/${task.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success('测评已启动')
        task.pid = data.pid; // update locally to view logs
        task.status = 'running';
        fetchTasks()
        viewLogs(task)
      } else {
        const err = await res.json()
        toast.error('启动失败: ' + (err.detail || '未知错误'))
      }
    } catch (e: any) {
      toast.error('启动失败: ' + e.message)
    }
  }

  const handleStopEval = async (task: any) => {
    if (!task.pid) return;
    try {
      const res = await fetch('/api/eval/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: task.pid })
      })
      if (res.ok) {
        toast.success('测评已停止')
        fetchTasks()
        if (view === 'logs' && activeTask?.id === task.id) {
            if (pollInterval) clearInterval(pollInterval);
            setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                step: "[Exec] 系统干预",
                detail: "用户手动终止了测评任务"
            }]);
        }
      } else {
        toast.error('停止失败')
      }
    } catch (e: any) {
      toast.error('停止失败: ' + e.message)
    }
  }

  const viewLogs = (task: any) => {
    setActiveTask(task)
    setView('logs')
    if (task.pid) {
      startLogPolling(task.pid)
    } else {
      // If no pid, maybe just fetch logs once
      startLogPolling(0) 
    }
  }
  
  const viewDetails = (task: any) => {
      setActiveTask(task)
      setView('details')
  }

  const normalPacks = MOCK_BENCH_PACKS.filter(p => !p.isSandbox && !p.isIpd)
  const sandboxPacks = MOCK_BENCH_PACKS.filter(p => p.isSandbox)
  const ipdPacks = MOCK_BENCH_PACKS.filter(p => p.isIpd)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">模型测评任务管理</h1>
            <p className="text-gray-500 text-sm mt-1">创建、管理并追踪大模型综合能力与业务流程评测任务</p>
        </div>
        {view === 'list' && (
            <Button onClick={() => { setView('create'); setStep(1); }} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                + 发起新测评
            </Button>
        )}
        {view !== 'list' && (
            <Button variant="outline" onClick={() => {
                if (pollInterval) clearInterval(pollInterval);
                setView('list'); 
                fetchTasks(); 
            }}>
                返回任务列表
            </Button>
        )}
      </div>

      {view === 'list' && (
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[80px]">任务ID</TableHead>
                  <TableHead>测评类别</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-[300px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-gray-500">#{task.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={task.eval_type?.includes('IPD') && task.eval_type?.includes('BenchLocal') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 border-gray-200' : task.eval_type === 'IPD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                        {task.eval_type?.split(',').map((t: string) => t === 'IPD' ? 'IDP' : t).join(',')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{task.model_name}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className={
                            task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            task.status === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            task.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                        }>
                            {task.status === 'completed' ? '✅ 已完成' :
                             task.status === 'running' ? '🔄 测评中' :
                             task.status === 'failed' ? '❌ 失败' : '⏳ 未运行'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{new Date(task.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => viewDetails(task)}>
                          <Info size={14} className="mr-1" /> 详情
                        </Button>
                        
                        {(task.status === 'pending' || task.status === 'failed' || task.status === 'stopped') && (
                          <Button variant="default" size="sm" className="h-8 text-xs bg-blue-600" onClick={() => handleStartEval(task)}>
                            <Play size={14} className="mr-1" /> 启动
                          </Button>
                        )}

                        {task.status === 'running' && (
                          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleStopEval(task)}>
                            <StopCircle size={14} className="mr-1" /> 停止
                          </Button>
                        )}
                        
                        {(task.status === 'running' || task.status === 'completed' || task.status === 'failed') && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => viewLogs(task)}>
                            <Terminal size={14} className="mr-1" /> 日志
                          </Button>
                        )}
                        
                        {task.status !== 'running' && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteTask(task)}>
                            <Trash2 size={14} className="mr-1" /> 删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">暂无评测任务，点击右上角发起新测评</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === 'create' && (
        <Card className="shadow-sm border-blue-100 overflow-hidden">
          <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              发起综合评测任务向导 (Evaluation)
            </h2>
            <div className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              Step {step} of 2
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className={`space-y-6 ${step !== 1 ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-semibold text-gray-800 text-lg">Step 1: 评测接口配置 (API Configuration)</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">全量适配 OpenAI 兼容格式</Badge>
              </div>
              
              <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6 shadow-inner">
                <div className="space-y-2">
                  <Label className="text-gray-700 flex items-center gap-2 font-medium">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    接口地址 (Base URL) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    placeholder="如: http://localhost:8001/v1" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="bg-white border-gray-300 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 flex items-center gap-2 font-medium">
                    <Box className="w-4 h-4 text-blue-500" />
                    模型名称 (Model Name) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    placeholder="如: Qwen/Qwen2.5-7B-Instruct" 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="bg-white border-gray-300 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Key className="w-4 h-4 text-blue-500" />
                    鉴权秘钥 (API Key)
                  </Label>
                  <div className="relative">
                    <Input 
                      placeholder="如: sk-..." 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      type={showApiKey ? "text" : "password"}
                      className="bg-white border-gray-300 focus-visible:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`space-y-6 ${step !== 2 ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-semibold text-gray-800 text-lg">Step 2: 测试基准包选择 (Bench Packs)</h3>
                <div className="space-x-3">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAllPacks(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">☑️ 一键全选</Button>
                  <Button variant="outline" size="sm" onClick={() => handleSelectAllPacks(false)} className="hover:bg-red-50 hover:text-red-600">⬜ 清除所有</Button>
                </div>
              </div>
              
              <div className="space-y-5 mt-2">
                <div className="border rounded-xl p-5 bg-white shadow-sm border-gray-100">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                    <div className="p-1.5 bg-blue-100 rounded-md"><Code className="w-4 h-4 text-blue-600" /></div>
                    <h4 className="font-bold text-gray-800">常规能力 (无需沙盒干预)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {normalPacks.map(pack => (
                      <div key={pack.id} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all border ${selectedPacks.includes(pack.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`}>
                        <Checkbox 
                          id={`pack-${pack.id}`} 
                          checked={selectedPacks.includes(pack.id)} 
                          onCheckedChange={() => handleTogglePack(pack.id)}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <Label htmlFor={`pack-${pack.id}`} className="cursor-pointer flex-1 font-semibold text-gray-700">{pack.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-xl p-5 bg-white shadow-sm border-orange-100">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-50">
                    <div className="p-1.5 bg-orange-100 rounded-md"><Bug className="w-4 h-4 text-orange-600" /></div>
                    <h4 className="font-bold text-gray-800">隔离沙盒能力 (需 Docker Sandbox 环境)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {sandboxPacks.map(pack => (
                      <div key={pack.id} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all border ${selectedPacks.includes(pack.id) ? 'border-orange-400 bg-orange-50' : 'border-orange-100 bg-orange-50/30 hover:border-orange-300'}`}>
                        <Checkbox 
                          id={`pack-${pack.id}`} 
                          checked={selectedPacks.includes(pack.id)} 
                          onCheckedChange={() => handleTogglePack(pack.id)}
                          className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <Label htmlFor={`pack-${pack.id}`} className="cursor-pointer flex-1 font-semibold text-orange-900">{pack.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-xl p-5 bg-white shadow-sm border-purple-100">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-50">
                    <div className="p-1.5 bg-purple-100 rounded-md"><Code className="w-4 h-4 text-purple-600" /></div>
                    <h4 className="font-bold text-gray-800">开发流程支撑能力</h4>
                    <span className="text-xs text-gray-400 ml-auto">包含IPD各个阶段能力验证</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {ipdPacks.map(pack => (
                      <div key={pack.id} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all border ${selectedPacks.includes(pack.id) ? 'border-purple-400 bg-purple-50' : 'border-purple-100 bg-purple-50/30 hover:border-purple-300'}`}>
                        <Checkbox 
                          id={`pack-${pack.id}`} 
                          checked={selectedPacks.includes(pack.id)} 
                          onCheckedChange={() => handleTogglePack(pack.id)}
                          className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                        />
                        <Label htmlFor={`pack-${pack.id}`} className="cursor-pointer flex-1 font-semibold text-purple-900">{pack.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-gray-50/80 p-5 border-t flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1 || isSubmitting}
              className="w-32"
            >
              返回上一步
            </Button>
            
            {step < 2 ? (
              <Button 
                onClick={() => {
                  if (step === 1) {
                    if (!baseUrl) { toast.error('请填写接口地址'); return; }
                    if (!modelName) { toast.error('请填写模型名称'); return; }
                  }
                  setStep(s => Math.min(2, s + 1))
                }}
                className="w-32 bg-gray-900 hover:bg-gray-800 text-white"
              >
                下一步
              </Button>
            ) : (
              <Button onClick={handleCreateTask} className="w-48 bg-blue-600 hover:bg-blue-700 font-bold shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '🚀 创建测评任务'}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
      
      {view === 'details' && activeTask && (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg">任务详情 (#{activeTask.id})</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label className="text-gray-500 text-xs">模型名称 (Model Name)</Label>
                        <div className="font-medium mt-1">{activeTask.model_name}</div>
                    </div>
                    <div>
                        <Label className="text-gray-500 text-xs">测评类别</Label>
                        <div className="font-medium mt-1 text-blue-600">{activeTask.eval_type?.split(',').map((t: string) => t === 'IPD' ? 'IDP' : t).join(',')}</div>
                    </div>
                    <div className="col-span-2">
                        <Label className="text-gray-500 text-xs">接口地址 (Base URL)</Label>
                        <div className="font-mono text-sm mt-1 bg-gray-100 p-2 rounded">{activeTask.base_url}</div>
                    </div>
                    <div className="col-span-2">
                        <Label className="text-gray-500 text-xs">API Key</Label>
                        <div className="font-mono text-sm mt-1 bg-gray-100 p-2 rounded">{'*'.repeat(activeTask.api_key?.length || 8)}</div>
                    </div>
                    <div className="col-span-2">
                        <Label className="text-gray-500 text-xs mb-2 block">已选测试包 (Packs)</Label>
                        <div className="flex flex-wrap gap-2">
                            {activeTask.packs.split(',').map((p: string) => (
                                <Badge key={p} variant="secondary">
                                    {MOCK_BENCH_PACKS.find(mp => mp.id === p)?.name || p}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      {view === 'logs' && activeTask && (
        <Card className="shadow-xl border-gray-200 overflow-hidden ring-1 ring-gray-900/5">
          <div className="bg-white text-gray-800 p-5 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-lg font-bold flex items-center gap-3">
              <Terminal className="w-5 h-5 text-blue-600" />
              任务执行白板 (任务 #{activeTask.id})
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`font-mono px-3 py-1 text-sm ${activeTask.status === 'completed' || activeTask.status === 'stopped' || activeTask.status === 'failed' ? 'text-green-600 border-green-500/30 bg-green-50' : 'text-blue-600 border-blue-500/30 bg-blue-50'}`}>
                {activeTask.status === 'completed' || activeTask.status === 'stopped' || activeTask.status === 'failed' ? '✅ 评测已结束 (Finished)' : '🔵 评测运行中 (Running)'}
              </Badge>
              {activeTask.status === 'running' && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleStopEval(activeTask)}
                  className="font-bold shadow-sm hover:bg-red-700"
                >
                  停止测评
                </Button>
              )}
            </div>
          </div>
          
          <div className="p-5 bg-gray-50/50 border-b border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-600">全局执行进度 (Progress)</span>
              <span className="text-lg font-bold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-blue-50 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 rounded-full" />
          </div>

          <CardContent className="p-0">
            <ScrollArea className="h-[450px] w-full bg-[#FAFAFA] font-mono text-[13px] leading-relaxed border-t border-gray-200 shadow-inner">
              <div className="p-4 flex flex-col gap-1">
                {logs.length === 0 && progress < 100 && (
                   <div className="text-gray-400 italic">初始化评测环境，等待日志输出...</div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 hover:bg-white p-1.5 rounded transition-colors border border-transparent hover:border-gray-200">
                    <span className="text-gray-400 shrink-0 w-20">{log.time}</span>
                    <span className={`shrink-0 w-32 font-semibold ${log.step.includes('错误') ? 'text-red-500' : 'text-blue-500'}`}>
                      {log.step}
                    </span>
                    <span className="text-gray-700 whitespace-pre-wrap break-words">{log.detail}</span>
                  </div>
                ))}
                {progress < 100 && logs.length > 0 && (
                  <div className="flex gap-4 p-1.5 animate-pulse text-gray-400">
                    <span className="shrink-0 w-20">--:--:--</span>
                    <span className="shrink-0 w-32">... 等待调度</span>
                    <span>Awaiting next engine trajectory...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

    </div>
  )
}