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
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 shadow-sm z-10 flex flex-col">
        <div className="flex items-center h-16 px-6 border-b border-slate-100 shrink-0">
          <div className="p-1.5 bg-blue-600 rounded-lg mr-3 shadow-sm">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-tight">开源大模型测评平台</span>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1.5">
            {navigation.map((item) => {
              if (item.children) {
                const isActive = item.children.some(child => location.pathname === child.href)
                return (
                  <div key={item.name} className="space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-between h-10 px-3 hover:bg-slate-100 hover:text-slate-900 transition-colors',
                        isActive ? 'bg-blue-50/50 text-blue-700 font-semibold' : 'text-slate-600'
                      )}
                      onClick={() => setEvalManageOpen(!evalManageOpen)}
                    >
                      <div className="flex items-center">
                        <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-blue-600" : "text-slate-400")} />
                        {item.name}
                      </div>
                      {evalManageOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </Button>
                    {evalManageOpen && (
                      <div className="pl-4 space-y-1 pt-1">
                        {item.children.map((child) => {
                          const isChildActive = location.pathname === child.href
                          return (
                            <Link key={child.name} to={child.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  'w-full justify-start h-9 px-3 hover:bg-slate-100 hover:text-slate-900 transition-colors text-sm',
                                  isChildActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500'
                                )}
                              >
                                <child.icon className={cn("w-3.5 h-3.5 mr-3", isChildActive ? "text-blue-600" : "text-slate-400")} />
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
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-10 px-3 hover:bg-slate-100 hover:text-slate-900 transition-colors',
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-blue-600" : "text-slate-400")} />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-0">
          <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <Monitor className="w-4 h-4 mr-2 text-slate-500" />
            <span>设备在线状态:</span>
            <span className="ml-2 text-emerald-600 font-bold">{onlineDevices}</span>
            <span className="mx-1 text-slate-400">/</span>
            <span className="text-slate-600">{devices.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm font-medium text-slate-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 animate-pulse" />
              <span>任务执行中:</span>
              <span className="ml-2 text-orange-700 font-bold">{runningTasks}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
