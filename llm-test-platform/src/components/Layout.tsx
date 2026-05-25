import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDevices } from '@/hooks/use-devices'
import { useTasks } from '@/hooks/use-tasks'
import { TopNavGroup } from '@/components/ui/TopNavGroup'
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
  User,
  LogOut,
  Menu,
  Activity
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const navGroups = [
  {
    label: '总览看板',
    items: [
      { name: '仪表盘', href: '/', icon: Home, desc: '全局资源与任务运行概览' },
      { name: '测评看板', href: '/board', icon: LayoutDashboard, desc: '多维测评数据汇总视图' },
    ]
  },
  {
    label: '资源底座',
    items: [
      { name: '设备集群', href: '/devices', icon: Server, desc: '物理节点与加速卡管理' },
      { name: '算力规划', href: '/resource-calc', icon: Layers, desc: '模型部署资源容量预估' },
    ]
  },
  {
    label: '性能压测',
    items: [
      { name: '压测任务', href: '/tests', icon: FlaskConical, desc: '大模型并发吞吐与延迟压测' },
      { name: '压测报告', href: '/results', icon: BarChart3, desc: '性能压测数据多维分析' },
    ]
  },
  {
    label: '模型评估',
    items: [
      { name: '发起评测', href: '/eval-manage', icon: ClipboardList, desc: '精度与客观能力多维测评' },
      { name: '评测报告', href: '/eval-results', icon: PieChart, desc: '能力雷达图与打分明细' },
    ]
  }
]

export function Layout() {
  const location = useLocation()
  const { data: devicesData } = useDevices({ size: 100 })
  const { data: tasksData } = useTasks({ size: 100 })
  const { data: evalData } = useQuery({
    queryKey: ['eval-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/eval/tasks')
      if (!res.ok) throw new Error('Failed to fetch eval tasks')
      return res.json()
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const devices = devicesData?.items || []
  const tasks = tasksData?.items || []
  const evalTasks = evalData?.tasks || []

  const onlineDevices = devices.filter((d) => d.status === 'Online').length
  const runningPerfTasks = tasks.filter((t) => t.status === 3).length
  const runningEvalTasks = evalTasks.filter((t: any) => t.status === 'running').length
  const runningTasks = runningPerfTasks + runningEvalTasks

  return (
    <div className="flex flex-col min-h-screen bg-pageBg font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-14 bg-cardBg/95 backdrop-blur-md border-b border-border shadow-sm flex items-center justify-between px-4 md:px-6 transition-all duration-200">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 md:w-48 shrink-0">
          <div className="p-1.5 bg-primary rounded-md shadow-[0_2px_8px_rgba(22,93,255,0.25)]">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-[16px] font-bold text-textMain tracking-tight hidden sm:block">大模型测评平台</span>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-2">
          {navGroups.map((group) => (
            <TopNavGroup key={group.label} label={group.label} items={group.items} />
          ))}
        </nav>

        {/* Right: User & Status */}
        <div className="flex items-center gap-3 md:gap-5 shrink-0 md:w-48 justify-end">
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 cursor-default group" title="在线设备数">
              <div className="p-1 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
                <Monitor className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-[13px] font-bold text-textMain">{onlineDevices}<span className="text-textMuted font-normal">/{devices.length}</span></span>
            </div>
            <div className="w-[1px] h-3 bg-border"></div>
            <div className="flex items-center gap-1.5 cursor-default group" title="运行中任务">
              <div className="p-1 bg-danger/10 rounded-full group-hover:bg-danger/20 transition-colors relative">
                {runningTasks > 0 && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-danger rounded-full animate-ping"></span>}
                <Activity className="w-3.5 h-3.5 text-danger" />
              </div>
              <span className="text-[13px] font-bold text-textMain">{runningTasks}</span>
            </div>
          </div>

          {/* User Profile / Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border bg-pageBg hover:bg-border transition-colors hover:shadow-sm">
                <User className="w-4 h-4 text-textSec" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-[8px] border-border shadow-lg p-1">
              <Link to="/settings">
                <DropdownMenuItem className="cursor-pointer text-[13px] text-textMain focus:bg-primary/5 focus:text-primary rounded-md mb-1">
                  <Settings className="w-4 h-4 mr-2 text-textMuted" />
                  系统设置
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer text-[13px] text-danger focus:bg-danger/10 focus:text-danger rounded-md">
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5 text-textSec" />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-cardBg border-b border-border shadow-md p-2 absolute top-14 w-full z-40 flex flex-col gap-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-3 py-1.5 text-[12px] font-bold text-textMuted uppercase tracking-wider">{group.label}</div>
              {group.items.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-10 px-4 rounded-[6px] transition-colors text-[14px]',
                        isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-textMain'
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-textMuted")} />
                      {item.name}
                    </Button>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
