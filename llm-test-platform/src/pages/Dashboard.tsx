import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton, StatsCardSkeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDevices } from '@/hooks/use-devices'
import { useTasks } from '@/hooks/use-tasks'
import {
  Server,
  FlaskConical,
  BarChart3,
  Layers,
  Cpu,
  Activity,
  Clock,
  ArrowRight,
  TrendingUp,
  ClipboardList,
  PieChart,
} from 'lucide-react'

export function Dashboard() {
  const { data: devicesData, isLoading: devicesLoading } = useDevices({ size: 100 })
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ size: 100 })
  const { data: evalData, isLoading: evalLoading } = useQuery({
    queryKey: ['eval-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/eval/tasks')
      if (!res.ok) throw new Error('Failed to fetch eval tasks')
      return res.json()
    }
  })

  const devices = devicesData?.items || []
  const tasks = tasksData?.items || []
  const evalTasks = evalData?.tasks || []

  const isLoading = devicesLoading || tasksLoading || evalLoading

  const onlineDevices = devices.filter((d) => d.status === 'Online').length
  const totalAccelerators = devices.reduce((sum, d) => sum + d.accelerator_count, 0)
  
  const runningPerfTasks = tasks.filter((t) => t.status === 3).length
  const completedPerfTasks = tasks.filter((t) => t.status === 4).length
  
  const runningEvalTasks = evalTasks.filter((t: any) => t.status === 'running').length
  const completedEvalTasks = evalTasks.filter((t: any) => t.status === 'completed').length

  const totalRunningTasks = runningPerfTasks + runningEvalTasks
  const totalCompletedTasks = completedPerfTasks + completedEvalTasks

  const recentPerfTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    
  const recentEvalTasks = evalTasks
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const [activeTaskTab, setActiveTaskTab] = useState('perf')

  const statusConfig: Record<number, { color: string; label: string }> = {
    0: { color: 'bg-gray-100 text-gray-800', label: '待执行' },
    1: { color: 'bg-blue-100 text-blue-800', label: '队列中' },
    2: { color: 'bg-yellow-100 text-yellow-800', label: '准备中' },
    3: { color: 'bg-orange-100 text-orange-800', label: '执行中' },
    4: { color: 'bg-green-100 text-green-800', label: '已完成' },
    5: { color: 'bg-red-100 text-red-800', label: '失败' },
    6: { color: 'bg-gray-100 text-gray-800', label: '已取消' },
    7: { color: 'bg-red-100 text-red-800', label: '超时' },
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">仪表板</h1>
          <p className="text-slate-500 mt-1">大模型测评平台全局数据概览与快速导航</p>
        </div>
      </div>

      {/* Quick Navigation Area (Moved to top for better access) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link to="/devices" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Server className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">设备管理</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/resource-calc" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">资源测算</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tests" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">性能测试</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/results" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">性能结果</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/eval-manage" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">模型测评</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/eval-results" className="block">
          <Card className="hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-slate-50 border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                <PieChart className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-700">测评结果</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Core Metrics Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">设备总数</CardTitle>
                <div className="p-2 bg-slate-100 rounded-full">
                  <Server className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{devices.length}</div>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                    {onlineDevices} 在线
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                    {devices.length - onlineDevices} 离线
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">加速卡总数</CardTitle>
                <div className="p-2 bg-slate-100 rounded-full">
                  <Cpu className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{totalAccelerators}</div>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {devices.reduce((sum, d) => sum + d.idle_count, 0)} 闲置
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {devices.reduce((sum, d) => sum + d.busy_count, 0)} 忙碌
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">执行中任务</CardTitle>
                <div className="p-2 bg-slate-100 rounded-full">
                  <Activity className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{totalRunningTasks}</div>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    性能 {runningPerfTasks}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    测评 {runningEvalTasks}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">已完成任务</CardTitle>
                <div className="p-2 bg-slate-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{totalCompletedTasks}</div>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                    性能 {completedPerfTasks}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    测评 {completedEvalTasks}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Lists Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        <Card className="lg:col-span-5 shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="w-5 h-5 text-slate-500" />
              设备状态
            </CardTitle>
            <Link to="/devices">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-28 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-14 rounded-md" />
                      <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                  </div>
                ))
              ) : devices.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">暂无设备信息</div>
              ) : devices.slice(0, 6).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-3 w-3">
                        {device.status === 'Online' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                          device.status === 'Online'
                            ? 'bg-green-500'
                            : device.status === 'Offline'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}></span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{device.ip}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {device.accelerator_type || '无加速卡'} × {device.accelerator_count}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                        闲置: {device.idle_count}
                      </Badge>
                      {device.busy_count > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                          忙碌: {device.busy_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 shadow-sm border-slate-200 flex flex-col">
          <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab} className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-0 pt-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
                  <FlaskConical className="w-5 h-5 text-slate-500" />
                  最近任务
                </div>
                <TabsList className="bg-transparent h-auto p-0 mb-0 space-x-4">
                  <TabsTrigger 
                    value="perf" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-blue-600 border-b-2 border-transparent rounded-none px-2 pb-3 pt-1 font-medium text-slate-600 data-[state=active]:text-blue-700"
                  >
                    性能测试
                  </TabsTrigger>
                  <TabsTrigger 
                    value="eval" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-indigo-600 border-b-2 border-transparent rounded-none px-2 pb-3 pt-1 font-medium text-slate-600 data-[state=active]:text-indigo-700"
                  >
                    模型测评
                  </TabsTrigger>
                </TabsList>
              </div>
              <Link to={activeTaskTab === 'perf' ? "/tests" : "/eval-manage"} className="mb-3">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  查看全部 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative">
              <TabsContent value="perf" className="m-0 border-none outline-none">
                <div className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4">
                        <div>
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    ))
                  ) : recentPerfTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">暂无性能测试任务</div>
                  ) : recentPerfTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate pr-4" title={task.task_name}>
                            {task.task_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:min-w-[140px] sm:justify-end shrink-0">
                          {task.progress > 0 && task.status === 3 && (
                            <div className="w-20 hidden sm:block">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>进度</span>
                                <span>{task.progress}%</span>
                              </div>
                              <Progress value={task.progress} className="h-1.5" />
                            </div>
                          )}
                          <Badge className={`${statusConfig[task.status]?.color} border-0 whitespace-nowrap`}>
                            {statusConfig[task.status]?.label}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="eval" className="m-0 border-none outline-none">
                <div className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4">
                        <div>
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    ))
                  ) : recentEvalTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">暂无模型测评任务</div>
                  ) : recentEvalTasks.map((task: any) => {
                      let statusBadge = { color: 'bg-gray-50 text-gray-700', label: '未知' };
                      if (task.status === 'completed') statusBadge = { color: 'bg-emerald-50 text-emerald-700', label: '已完成' };
                      else if (task.status === 'running') statusBadge = { color: 'bg-indigo-50 text-indigo-700', label: '测评中' };
                      else if (task.status === 'failed') statusBadge = { color: 'bg-red-50 text-red-700', label: '失败' };
                      else if (task.status === 'pending') statusBadge = { color: 'bg-blue-50 text-blue-700', label: '等待中' };
                      else if (task.status === 'stopped') statusBadge = { color: 'bg-orange-50 text-orange-700', label: '已停止' };

                      return (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate pr-4" title={task.model_name}>
                              {task.model_name} <span className="text-slate-400 font-normal text-sm ml-1">模型测评</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(task.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 sm:min-w-[140px] sm:justify-end shrink-0">
                            <Badge className={`${statusBadge.color} border-0 whitespace-nowrap`}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                        </div>
                      )
                  })}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
