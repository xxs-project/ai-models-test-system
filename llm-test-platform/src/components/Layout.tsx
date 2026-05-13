import { useState, useEffect } from 'react'
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
  LayoutDashboard,
  ClipboardList,
  PieChart,
  ChevronDown,
  ChevronRight,
  ListTodo
} from 'lucide-react'

const navigation = [
  { name: '仪表板', href: '/', icon: Home },
  { name: '测评看板', href: '/board', icon: LayoutDashboard },
  { 
    name: '测评管理', 
    icon: ListTodo,
    children: [
      { name: '设备管理', href: '/devices', icon: Server },
      { name: '资源测算', href: '/resource-calc', icon: Layers },
      { name: '性能测试', href: '/tests', icon: FlaskConical },
      { name: '性能结果', href: '/results', icon: BarChart3 },
      { name: '模型自评', href: '/eval-manage', icon: ClipboardList },
      { name: '测评结果', href: '/eval-results', icon: PieChart },
    ]
  },
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

  // Check if current path is under eval management to auto open
  const isEvalManageActive = navigation[2].children?.some(child => location.pathname === child.href) || false
  const [evalManageOpen, setEvalManageOpen] = useState(isEvalManageActive || false)

  // Ensure it stays open if we navigate to a child
  useEffect(() => {
    if (isEvalManageActive) {
      setEvalManageOpen(true)
    }
  }, [isEvalManageActive])

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white border-r">
        <div className="flex items-center h-16 px-4 border-b">
          <Cpu className="w-8 h-8 mr-2 text-blue-600" />
          <span className="text-lg font-semibold">大模型测评平台</span>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-2 space-y-1">
            {navigation.map((item) => {
              if (item.children) {
                const isActive = item.children.some(child => location.pathname === child.href)
                return (
                  <div key={item.name} className="space-y-1">
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-between',
                        isActive && 'bg-blue-50 text-blue-600'
                      )}
                      onClick={() => setEvalManageOpen(!evalManageOpen)}
                    >
                      <div className="flex items-center">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </div>
                      {evalManageOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                    {evalManageOpen && (
                      <div className="pl-4 space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = location.pathname === child.href
                          return (
                            <Link key={child.name} to={child.href}>
                              <Button
                                variant={isChildActive ? 'secondary' : 'ghost'}
                                className={cn(
                                  'w-full justify-start',
                                  isChildActive && 'bg-blue-50 text-blue-600'
                                )}
                              >
                                <child.icon className="w-4 h-4 mr-2" />
                                {child.name}
                              </Button>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive = location.pathname === item.href
              return (
                <Link key={item.name} to={item.href!}>
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
