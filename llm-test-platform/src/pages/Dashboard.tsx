import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
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
  Activity,
  Clock,
  ArrowRight,
  TrendingUp,
  ClipboardList,
  PlayCircle,
  PlusCircle,
  Zap,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Cpu,
  Crown,
  Medal,
  Award
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell } from 'recharts'

export function Dashboard() {
  const navigate = useNavigate()
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
  
  const { data: evalResultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['eval-results-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/eval/results')
      if (!res.ok) return []
      return res.json()
    }
  })

  const devices = devicesData?.items || []
  const tasks = tasksData?.items || []
  const evalTasks = evalData?.tasks || []
  const evalResults = evalResultsData?.reports || (Array.isArray(evalResultsData) ? evalResultsData : [])

  const isLoading = devicesLoading || tasksLoading || evalLoading || resultsLoading

  const onlineDevices = devices.filter((d) => d.status === 'Online').length
  const totalAccelerators = devices.reduce((sum, d) => sum + d.accelerator_count, 0)
  const busyAccelerators = devices.reduce((sum, d) => sum + d.busy_count, 0)
  
  const runningPerfTasks = tasks.filter((t) => t.status === 3).length
  const completedPerfTasks = tasks.filter((t) => t.status === 4).length
  
  const runningEvalTasks = evalTasks.filter((t: any) => t.status === 'running').length
  const completedEvalTasks = evalTasks.filter((t: any) => t.status === 'completed').length

  const totalRunningTasks = runningPerfTasks + runningEvalTasks
  const totalCompletedTasks = completedPerfTasks + completedEvalTasks

  const recentPerfTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [tasks])
    
  const recentEvalTasks = useMemo(() => {
    return [...evalTasks]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [evalTasks])

  
  // Chart Data: Top Models by Dataset (Top 3)
  const topDatasetChartData = useMemo(() => {
    if (!evalResults || evalResults.length === 0) return []
    
    const getTop3ForType = (type: string) => {
      const byType = evalResults.filter((r: any) => r.type === type);
      const bestScores = new Map<string, any>();
      byType.forEach((r: any) => {
        const existing = bestScores.get(r.model_name);
        if (!existing || (r.percent || 0) > (existing.percent || 0)) {
          bestScores.set(r.model_name, r);
        }
      });
      return Array.from(bestScores.values()).sort((a, b) => (b.percent || 0) - (a.percent || 0)).slice(0, 3);
    }

    const benchLocalTop3 = getTop3ForType('BenchLocal');
    const ipdTop3 = getTop3ForType('IPD');

    return [
      {
        name: 'BenchLocal',
        fullName: 'BenchLocal 测评集',
        top1Model: benchLocalTop3[0]?.model_name || '无',
        top1Score: parseFloat((benchLocalTop3[0]?.percent || 0).toFixed(1)),
        top2Model: benchLocalTop3[1]?.model_name || '无',
        top2Score: parseFloat((benchLocalTop3[1]?.percent || 0).toFixed(1)),
        top3Model: benchLocalTop3[2]?.model_name || '无',
        top3Score: parseFloat((benchLocalTop3[2]?.percent || 0).toFixed(1)),
      },
      {
        name: 'IPD',
        fullName: 'IPD测评集',
        top1Model: ipdTop3[0]?.model_name || '无',
        top1Score: parseFloat((ipdTop3[0]?.percent || 0).toFixed(1)),
        top2Model: ipdTop3[1]?.model_name || '无',
        top2Score: parseFloat((ipdTop3[1]?.percent || 0).toFixed(1)),
        top3Model: ipdTop3[2]?.model_name || '无',
        top3Score: parseFloat((ipdTop3[2]?.percent || 0).toFixed(1)),
      }
    ].filter(d => d.top1Score > 0 || d.top2Score > 0 || d.top3Score > 0);
  }, [evalResults])




  const [activeTaskTab, setActiveTaskTab] = useState('eval')

  const statusConfig: Record<number, { color: string; label: string; icon: any }> = {
    0: { color: 'bg-pageBg text-textMain border-border', label: '待执行', icon: Clock },
    1: { color: 'bg-primary/10 text-primary border-primary/20', label: '队列中', icon: Clock },
    2: { color: 'bg-pageBg text-textSec border-border', label: '准备中', icon: Activity },
    3: { color: 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(22,93,255,0.3)]', label: '执行中', icon: PlayCircle },
    4: { color: 'bg-accent/10 text-accent border-accent/20', label: '已完成', icon: CheckCircle2 },
    5: { color: 'bg-danger/10 text-danger border-danger/20', label: '失败', icon: AlertCircle },
    6: { color: 'bg-pageBg text-textSec border-border', label: '已取消', icon: AlertCircle },
    7: { color: 'bg-danger/10 text-danger border-danger/20', label: '超时', icon: AlertCircle },
  }

  const currentDate = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto animate-in fade-in duration-500 pb-12 pt-4 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Hero Header Area - Tech & Business Feel */}
      <div className="relative overflow-hidden bg-white border border-slate-200/60 p-6 md:p-8 rounded-[16px] shadow-sm">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/80 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-[0.02] pointer-events-none">
          <Server className="w-72 h-72 text-slate-900" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/60 text-slate-600 text-xs font-semibold backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              系统运行健康 | {currentDate}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              大模型综合评测平台
            </h1>
            <p className="text-slate-500 max-w-[650px] text-sm md:text-base leading-relaxed font-medium">
              实时监控物理算力集群运行状态，自动化调度模型能力评测与性能压测流水线，多维度生成专业评测报告。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Button onClick={() => navigate('/tests')} variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm h-12 px-6 rounded-xl transition-all font-semibold">
              <FlaskConical className="w-4 h-4 mr-2 text-blue-600" />
              发起性能压测
            </Button>
            <Button onClick={() => navigate('/eval-manage')} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 h-12 px-6 rounded-xl transition-all font-semibold border-0">
              <PlusCircle className="w-4 h-4 mr-2" />
              新建模型评测
            </Button>
          </div>
        </div>
      </div>

      {/* Core Metrics Cards */}
      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="rounded-[24px] border border-slate-200/60 shadow-sm hover:shadow-md transition-all bg-white group">
              <CardContent className="p-6 md:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-blue-50/80 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Server className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200/60 shadow-sm px-2.5 py-0.5 rounded-lg font-semibold">
                    {onlineDevices} 在线
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-2">接入设备总数</div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">{devices.length}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-slate-200/60 shadow-sm hover:shadow-md transition-all bg-white group">
              <CardContent className="p-6 md:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-indigo-50/80 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm px-2.5 py-0.5 rounded-lg font-semibold">
                    {busyAccelerators} 运行中
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-2">集群算力规模 (卡)</div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">{totalAccelerators}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-slate-200/60 shadow-sm hover:shadow-md transition-all bg-white group relative overflow-hidden">
              {totalRunningTasks > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 bg-[length:200%_100%] animate-gradient"></div>}
              <CardContent className="p-6 md:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-orange-50/80 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                  {totalRunningTasks > 0 && (
                    <span className="flex h-3 w-3 relative mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-2">活跃流水线任务</div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">{totalRunningTasks}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-slate-200/60 shadow-sm hover:shadow-md transition-all bg-white group">
              <CardContent className="p-6 md:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-emerald-50/80 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-2">累计完成测评</div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">{totalCompletedTasks}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      
      {/* Main Layout Section */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        
        {/* ROW 1: Leaderboard (Left) + Pipeline Health (Right) */}
        {/* Top Models by Dataset Integrated View */}
        <Card className="xl:col-span-2 rounded-[24px] border border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-slate-900">核心评测大盘 (Top 3)</CardTitle>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate('/board')} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 px-3 rounded-lg hidden sm:flex transition-all">
                完整榜单 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="h-full flex items-center justify-center"><Skeleton className="w-full h-[250px] rounded-2xl" /></div>
            ) : topDatasetChartData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[300px]">
                {topDatasetChartData.map((data, idx) => {
                  const chartData = [
                    { name: 'TOP 1', model: data.top1Model, score: data.top1Score, fill: '#f59e0b' },
                    { name: 'TOP 2', model: data.top2Model, score: data.top2Score, fill: '#94a3b8' },
                    { name: 'TOP 3', model: data.top3Model, score: data.top3Score, fill: '#fb923c' },
                  ].filter(d => d.score > 0);
                  
                  return (
                    <div key={idx} className="flex flex-col h-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100/80 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <h3 className="font-bold text-slate-800 text-sm tracking-wider uppercase">{data.fullName}</h3>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                            <RechartsTooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', fontWeight: 500 }}
                              formatter={(value: number, name: string, props: any) => [`${value} 分`, `${props.payload.model}`]}
                              labelFormatter={(label) => label}
                            />
                            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                              <LabelList dataKey="score" position="top" content={(props: any) => {
                                const { x, y, width, value, index } = props;
                                if (!value || value <= 0) return null;
                                const modelName = chartData[index]?.model || '';
                                const displayModel = modelName.length > 12 ? modelName.substring(0, 10) + '...' : modelName;
                                return (
                                  <g transform={`translate(${x + width / 2}, ${y - 20})`}>
                                    <text x={0} y={0} fill="#475569" textAnchor="middle" fontSize="10" fontWeight="600">{displayModel}</text>
                                    <text x={0} y={14} fill={chartData[index].fill} textAnchor="middle" fontSize="12" fontWeight="800">{value}</text>
                                  </g>
                                );
                              }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 min-h-[250px]">
                <BarChart3 className="w-12 h-12 mb-3 opacity-20 text-slate-600" />
                <p className="font-medium text-sm">暂无测评评分记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Health */}
        <Card className="xl:col-span-1 rounded-[24px] border border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <CardTitle className="text-lg font-bold text-slate-900">流水线健康度</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
            {isLoading ? (
              <div className="space-y-6 h-full flex flex-col justify-center">
                <div className="flex flex-col items-center justify-center gap-3"><Skeleton className="h-24 w-24 rounded-full" /></div>
                <div className="flex flex-col items-center justify-center gap-3"><Skeleton className="h-24 w-24 rounded-full" /></div>
              </div>
            ) : (
              <>
                {/* Performance Tasks Chart */}
                {(() => {
                  const success = tasks.filter(t => t.status === 4).length;
                  const running = tasks.filter(t => t.status === 3).length;
                  const failed = tasks.filter(t => t.status === 5 || t.status === 7).length;
                  const total = success + running + failed || 1;
                  const data = [
                    { name: '成功', value: success, fill: '#10b981' },
                    { name: '运行', value: running, fill: '#3b82f6' },
                    { name: '异常', value: failed, fill: '#ef4444' }
                  ].filter(d => d.value > 0);
                  
                  return (
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80 shadow-sm flex-1 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="w-[100px] h-[100px] shrink-0 relative">
                        {data.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={data} innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', padding: '4px 8px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full rounded-full border-4 border-slate-100 flex items-center justify-center"><span className="text-xs text-slate-400">暂无</span></div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <FlaskConical className="w-5 h-5 text-blue-500 opacity-80" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">性能压测 <span className="text-xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">{tasks.length} 总计</span></div>
                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>成功</span><span className="font-bold text-slate-700">{success}</span></div>
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span>运行</span><span className="font-bold text-slate-700">{running}</span></div>
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-red-500"></span>异常</span><span className="font-bold text-slate-700">{failed}</span></div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Evaluation Tasks Chart */}
                {(() => {
                  const success = evalTasks.filter((t: any) => t.status === 'completed').length;
                  const running = evalTasks.filter((t: any) => t.status === 'running').length;
                  const failed = evalTasks.filter((t: any) => t.status === 'failed' || t.status === 'stopped').length;
                  const total = success + running + failed || 1;
                  const data = [
                    { name: '成功', value: success, fill: '#10b981' },
                    { name: '运行', value: running, fill: '#a855f7' },
                    { name: '异常', value: failed, fill: '#ef4444' }
                  ].filter(d => d.value > 0);
                  
                  return (
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80 shadow-sm flex-1 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="w-[100px] h-[100px] shrink-0 relative">
                        {data.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={data} innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', padding: '4px 8px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full rounded-full border-4 border-slate-100 flex items-center justify-center"><span className="text-xs text-slate-400">暂无</span></div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <PieChartIcon className="w-5 h-5 text-purple-500 opacity-80" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">模型评测 <span className="text-xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">{evalTasks.length} 总计</span></div>
                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>成功</span><span className="font-bold text-slate-700">{success}</span></div>
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span>运行</span><span className="font-bold text-slate-700">{running}</span></div>
                          <div className="flex justify-between items-center text-xs"><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-red-500"></span>异常</span><span className="font-bold text-slate-700">{failed}</span></div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </CardContent>
        </Card>

        {/* ROW 2: Task Lists (Left) + Device Cluster (Right) */}
        {/* Task Pipeline (More Focus on Evaluation) */}
        <Card className="xl:col-span-2 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col bg-white overflow-hidden">
          <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab} className="flex-1 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-3 px-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-bold text-slate-900">任务执行看板</CardTitle>
                <TabsList className="h-9 p-1 bg-slate-200/50 rounded-lg">
                  <TabsTrigger value="eval" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-semibold text-slate-600 data-[state=active]:text-blue-700">模型测评</TabsTrigger>
                  <TabsTrigger value="perf" className="text-xs px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-semibold text-slate-600 data-[state=active]:text-blue-700">性能压测</TabsTrigger>
                </TabsList>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(activeTaskTab === 'perf' ? "/tests" : "/eval-manage")} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 px-3 rounded-lg transition-all">
                更多 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <TabsContent value="eval" className="m-0 border-none outline-none h-full">
                <div className="divide-y divide-slate-100 h-full">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-5 flex items-center justify-between"><Skeleton className="h-10 w-full" /></div>
                    ))
                  ) : recentEvalTasks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" /><p className="font-medium text-sm">暂无记录</p></div>
                  ) : recentEvalTasks.map((task: any) => {
                      let statusBadge = { color: 'bg-slate-100 text-slate-500 border-slate-200', label: '未知', icon: Clock };
                      if (task.status === 'completed') statusBadge = { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm', label: '已完成', icon: CheckCircle2 };
                      else if (task.status === 'running') statusBadge = { color: 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20', label: '测评中', icon: PlayCircle };
                      else if (task.status === 'failed') statusBadge = { color: 'bg-red-50 text-red-700 border-red-200/60 shadow-sm', label: '失败', icon: AlertCircle };
                      else if (task.status === 'pending') statusBadge = { color: 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm', label: '队列中', icon: Clock };
                      else if (task.status === 'stopped') statusBadge = { color: 'bg-slate-100 text-slate-600 border-slate-200/60 shadow-sm', label: '已停止', icon: AlertCircle };

                      const StatusIcon = statusBadge.icon;

                      return (
                        <div key={task.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors group">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="font-semibold text-slate-800 text-sm truncate flex items-center gap-2 group-hover:text-blue-600 transition-colors" title={task.model_name}>
                              {task.model_name}
                              {task.eval_type?.includes('IPD') && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100">IPD流程</Badge>}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 font-medium">
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">ID:{task.id}</span>
                              <span>{new Date(task.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <Badge className={`border flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold shadow-sm ${statusBadge.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusBadge.label}
                          </Badge>
                        </div>
                      )
                  })}
                </div>
              </TabsContent>
              <TabsContent value="perf" className="m-0 border-none outline-none h-full">
                 <div className="divide-y divide-slate-100 h-full">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-5 flex items-center justify-between"><Skeleton className="h-10 w-full" /></div>
                    ))
                  ) : recentPerfTasks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400"><FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" /><p className="font-medium text-sm">暂无记录</p></div>
                  ) : recentPerfTasks.map((task) => {
                      const status = statusConfig[task.status] || statusConfig[0];
                      const StatusIcon = status.icon;
                      return (
                        <div key={task.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors group">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors" title={task.task_name}>
                              {task.task_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 font-medium">
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">ID:{task.id}</span>
                              <span>{new Date(task.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 shrink-0">
                            {task.progress > 0 && task.status === 3 && (
                              <div className="w-24 hidden sm:block">
                                <div className="flex justify-between text-[10px] font-bold text-blue-600 mb-1.5">
                                  <span>进度</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <Progress value={task.progress} className="h-1.5 bg-blue-100 [&>div]:bg-blue-600" />
                              </div>
                            )}
                            <Badge className={`border flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold shadow-sm ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
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

        {/* Device Cluster Overview */}
        <Card className="xl:col-span-1 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col bg-white overflow-hidden h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-4 px-6 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">算力节点概览</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/devices')} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 px-3 rounded-lg transition-all">
              管理集群 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-100 h-full">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between"><Skeleton className="h-10 w-full" /></div>
                ))
              ) : devices.length === 0 ? (
                <div className="py-16 text-center text-slate-400"><Server className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" /><p className="font-medium text-sm">暂无设备接入</p></div>
              ) : devices.slice(0, 5).map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-3 w-3 shrink-0">
                        {device.status === 'Online' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${device.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : device.status === 'Offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-400'}`}></span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-mono tracking-tight group-hover:text-blue-600 transition-colors">{device.ip}</div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>{device.accelerator_type || '通用计算节点'} ({device.accelerator_count}卡)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {device.busy_count > 0 ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-bold shadow-sm">
                          <Activity className="w-3.5 h-3.5 animate-pulse" /> {device.busy_count} 卡运行中
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                          {device.idle_count} 卡闲置
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
