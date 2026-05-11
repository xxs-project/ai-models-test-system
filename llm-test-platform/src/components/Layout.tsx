import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDevices } from '@/hooks/use-devices'
import { useTasks } from '@/hooks/use-tasks'
import {
  Server,
  FlaskConical,
  BarChart3,
  Settings,
  Cpu,
  Layers,
  Monitor,
  Home,
  ClipboardList,
  PieChart,
} from 'lucide-react'

const navigation = [
  { name: '仪表板', href: '/', icon: Home },
  { name: '设备管理', href: '/devices', icon: Server },
  { name: '资源测算', href: '/resource-calc', icon: Layers },
  { name: '性能测试', href: '/tests', icon: FlaskConical },
  { name: '性能结果', href: '/results', icon: BarChart3 },
  { name: '模型测评', href: '/eval-manage', icon: ClipboardList },
  { name: '测评结果', href: '/eval-results', icon: PieChart },
  { name: '系统设置', href: '/settings', icon: Settings },
]

export function Layout() {
  const location = useLocation()
  const { data: devicesData } = useDevices({ size: 100 })
  const { data: tasksData } = useTasks({ size: 100 })

  const devices = devicesData?.items || []
  const tasks = tasksData?.items || []

  const onlineDevices = devices.filter((d) => d.status === 'Online').length
  const runningTasks = tasks.filter((t) => t.status === 3).length

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white border-r">
        <div className="flex items-center h-16 px-4 border-b">
          <Cpu className="w-8 h-8 mr-2 text-blue-600" />
          <span className="text-lg font-semibold">大模型测试平台</span>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isActive && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center text-sm text-gray-500">
            <Monitor className="w-4 h-4 mr-2" />
            <span>设备状态: </span>
            <span className="ml-1 text-green-600">{onlineDevices} 在线 / {devices.length} 总数</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">测试任务: {runningTasks} 执行中</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
