import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Device } from '@/lib/types'
import { Server, Cpu, HardDrive, Activity } from 'lucide-react'

interface DeviceCardProps {
  device: Device
  onClick?: () => void
}

export function DeviceCard({ device, onClick }: DeviceCardProps) {
  const statusColors = {
    Online: 'bg-green-100 text-green-800',
    Offline: 'bg-red-100 text-red-800',
    Unknown: 'bg-gray-100 text-gray-800',
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">{device.ip}</CardTitle>
          </div>
          <Badge className={statusColors[device.status]}>
            {device.status === 'Online' ? '在线' : device.status === 'Offline' ? '离线' : '未知'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Cpu className="w-4 h-4 mr-2" />
          <span>{device.os_info || '未知系统'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <HardDrive className="w-4 h-4 mr-2" />
          <span>
            {device.accelerator_type || '无加速卡'} × {device.accelerator_count}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600">
            闲置: {device.idle_count}
          </span>
          <span className="text-yellow-600">
            忙碌: {device.busy_count}
          </span>
          <span className="text-red-600">
            异常: {device.warning_count}
          </span>
        </div>
        {device.last_updated && (
          <div className="text-xs text-gray-400 flex items-center">
            <Activity className="w-3 h-3 mr-1" />
            更新: {new Date(device.last_updated).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
