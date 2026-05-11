import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Settings as SettingsIcon } from 'lucide-react'

export function SystemSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-3xl font-bold">系统设置</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>常规设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input id="siteName" defaultValue="大模型测试平台" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">语言</Label>
              <Select defaultValue="zh-CN">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>监控设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monitorInterval">设备监控间隔（秒）</Label>
              <Input id="monitorInterval" type="number" defaultValue="60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoRefresh">自动刷新</Label>
              <div className="flex items-center space-x-2">
                <Switch id="autoRefresh" defaultChecked />
                <Label htmlFor="autoRefresh">启用</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>任务完成通知</Label>
              <p className="text-sm text-gray-500">测试任务完成时发送通知</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>设备离线通知</Label>
              <p className="text-sm text-gray-500">设备离线时发送通知</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>失败告警通知</Label>
              <p className="text-sm text-gray-500">任务失败时发送告警</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">重置</Button>
        <Button>保存设置</Button>
      </div>
    </div>
  )
}
