import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton, StatsCardSkeleton } from '@/components/ui/skeleton'
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

  const devices = devicesData?.items || []
  const tasks = tasksData?.items || []

  const isLoading = devicesLoading || tasksLoading

  const onlineDevices = devices.filter((d) => d.status === 'Online').length
  const totalAccelerators = devices.reduce((sum, d) => sum + d.accelerator_count, 0)
  const runningTasks = tasks.filter((t) => t.status === 3).length
  const completedTasks = tasks.filter((t) => t.status === 4).length

  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仪表板</h1>
          <p className="text-gray-500 mt-1">大模型测试平台概览</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">设备总数</CardTitle>
                <Server className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{devices.length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-600">{onlineDevices} 在线</span> /{' '}
                  <span className="text-gray-500">{devices.length - onlineDevices} 离线</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">加速卡总数</CardTitle>
                <Cpu className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAccelerators}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {devices.reduce((sum, d) => sum + d.idle_count, 0)} 闲置 /{' '}
                  {devices.reduce((sum, d) => sum + d.busy_count, 0)} 忙碌
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">执行中任务</CardTitle>
                <Activity className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{runningTasks}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {tasks.filter((t) => t.status === 1).length} 队列中
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">已完成任务</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTasks}</div>
                <p className="text-xs text-gray-500 mt-1">
                  成功率{' '}
                  {tasks.length > 0
                    ? Math.round(
                        (completedTasks / (tasks.filter((t) => t.status !== 6).length)) * 100
                      )
                    : 0}
                  %
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              设备状态
            </CardTitle>
            <Link to="/devices">
              <Button variant="ghost" size="sm">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                ))
              ) : devices.slice(0, 5).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          device.status === 'Online'
                            ? 'bg-green-500'
                            : device.status === 'Offline'
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }`}
                      />
                      <div>
                        <div className="font-medium">{device.ip}</div>
                        <div className="text-xs text-gray-500">
                          {device.accelerator_type || '无加速卡'} × {device.accelerator_count}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        闲置: {device.idle_count}
                      </Badge>
                      <Badge variant="outline">
                        忙碌: {device.busy_count}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              最近任务
            </CardTitle>
            <Link to="/tests">
              <Button variant="ghost" size="sm">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium truncate max-w-[200px]">{task.task_name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(task.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig[task.status]?.color}>
                        {statusConfig[task.status]?.label}
                      </Badge>
                      {task.progress > 0 && task.status === 3 && (
                        <div className="w-12">
                          <Progress value={task.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Link to="/devices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Server className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="text-md font-semibold mb-1">设备管理</h3>
            </CardContent>
          </Card>
        </Link>

        <Link to="/resource-calc">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Layers className="w-10 h-10 text-orange-500 mb-3" />
              <h3 className="text-md font-semibold mb-1">资源测算</h3>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tests">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <FlaskConical className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="text-md font-semibold mb-1">性能测试</h3>
            </CardContent>
          </Card>
        </Link>

        <Link to="/results">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <BarChart3 className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="text-md font-semibold mb-1">性能结果</h3>
            </CardContent>
          </Card>
        </Link>

        <Link to="/eval-manage">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <ClipboardList className="w-10 h-10 text-indigo-600 mb-3" />
              <h3 className="text-md font-semibold mb-1">模型测评</h3>
            </CardContent>
          </Card>
        </Link>

        <Link to="/eval-results">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <PieChart className="w-10 h-10 text-teal-600 mb-3" />
              <h3 className="text-md font-semibold mb-1">测评结果</h3>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
