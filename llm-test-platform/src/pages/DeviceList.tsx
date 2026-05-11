import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  useRefreshDevice,
} from '@/hooks/use-devices'
import { Device } from '@/lib/types'
import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Server,
  Activity,
  Eye,
  EyeOff,
  Copy,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle,
  Upload,
  Download,
  FileDown,
} from 'lucide-react'
import { toast } from 'sonner'

export function DeviceList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [archFilter, setArchFilter] = useState<string>('all')
  const [accTypeFilter, setAccTypeFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const [formData, setFormData] = useState({
    ip: '',
    port: 22,
    username: '',
    password: '',
    remark: '',
  })

  const { data, isLoading } = useDevices({
    page,
    size: 20,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    arch: archFilter === 'all' ? undefined : archFilter,
    acc_type: accTypeFilter === 'all' ? undefined : accTypeFilter,
  })

  const createDevice = useCreateDevice()
  const updateDevice = useUpdateDevice()
  const deleteDevice = useDeleteDevice()
  const refreshDevice = useRefreshDevice()

  const handleSubmit = async () => {
    try {
      if (editingDevice) {
        await updateDevice.mutateAsync({ id: editingDevice.id, ...formData })
        toast.success('设备更新成功')
      } else {
        const deviceData = {
          ip: formData.ip,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          remark: formData.remark || '',
        }
        await createDevice.mutateAsync(deviceData)
        toast.success('设备添加成功')
      }
      setIsDialogOpen(false)
      setEditingDevice(null)
      setFormData({ ip: '', port: 22, username: '', password: '', remark: '' })
    } catch (error: any) {
      let errorMsg = '操作失败'
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail
      } else if (error?.response?.status === 404) {
        errorMsg = '请求的资源不存在'
      } else if (error?.response?.status === 400) {
        errorMsg = error?.response?.data?.detail || '请求参数错误'
      } else if (error?.message) {
        errorMsg = error.message
      } else if (error?.toString) {
        errorMsg = error.toString()
      }
      toast.error(`操作失败: ${errorMsg}`)
    }
  }

  const handleDelete = async () => {
    if (deviceToDelete) {
      try {
        await deleteDevice.mutateAsync(deviceToDelete)
        toast.success('设备删除成功')
        setDeleteConfirmOpen(false)
        setDeviceToDelete(null)
      } catch (error) {
        toast.error('删除失败')
      }
    }
  }

  const handleRefresh = async (id: number) => {
    try {
      await refreshDevice.mutateAsync(id)
      toast.success('设备状态已刷新')
    } catch (error) {
      toast.error('刷新失败')
    }
  }

  const togglePassword = (id: number) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyPassword = async (password: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(password)
        toast.success('密码已复制到剪贴板')
      } else {
        // Fallback for environments where clipboard API is not available
        const textArea = document.createElement('textarea')
        textArea.value = password
        
        // Ensure textarea is not visible but part of DOM
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '0'
        document.body.appendChild(textArea)
        
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            toast.success('密码已复制到剪贴板')
          } else {
            throw new Error('复制命令执行失败')
          }
        } catch (err) {
          throw new Error('无法执行复制操作')
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('复制失败，请手动复制')
    }
  }

  const viewDeviceDetail = (device: Device) => {
    setSelectedDevice(device)
    setDetailDialogOpen(true)
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('请选择要导入的文件')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/devices/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `导入失败 (HTTP ${response.status})`)
      }

      const result = await response.json()

      if (result.success) {
        toast.success(`导入成功: ${result.imported_count} 个设备, 失败: ${result.failed_count} 个`)
        if (result.failed_rows && result.failed_rows.length > 0) {
          console.warn('导入失败的行:', result.failed_rows)
          toast.warning(`部分设备导入失败，请检查控制台了解详情`)
        }

        await queryClient.invalidateQueries({ queryKey: ['devices'] })

        const refreshResult = await queryClient.refetchQueries({ queryKey: ['devices'] })

        if (refreshResult && typeof refreshResult === 'object') {
          if ('data' in refreshResult) {
            const data = (refreshResult as any).data
            if (data && data.items?.length === 0 && data.total > 0) {
              toast.info('数据已导入，正在刷新列表...')
            }
          }
        }

        setImportDialogOpen(false)
        setImportFile(null)
      } else {
        throw new Error(result.detail || '导入失败')
      }
    } catch (error: any) {
      toast.error(`导入失败: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/devices/export')

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devices_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('设备导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/devices/template')
      if (!response.ok) {
        throw new Error('下载失败')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'device_template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('模板下载成功')
    } catch (error) {
      toast.error('模板下载失败')
    }
  }

  const openEditDialog = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      ip: device.ip,
      port: device.port,
      username: device.username,
      password: '',
      remark: device.remark || '',
    })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingDevice(null)
    setFormData({ ip: '', port: 22, username: '', password: '', remark: '' })
    setIsDialogOpen(true)
  }

  const devices = data?.items || []
  const totalPages = data ? Math.ceil(data.total / data.size) : 0

  const statusColors: Record<string, string> = {
    Online: 'bg-green-100 text-green-800',
    Offline: 'bg-red-100 text-red-800',
    Unknown: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">设备管理</h1>
          <p className="text-gray-500 mt-1">管理测试设备，监控设备状态</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <FileDown className="w-4 h-4 mr-2" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            添加设备
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索 IP、用户名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="Online">在线</SelectItem>
            <SelectItem value="Offline">离线</SelectItem>
            <SelectItem value="Unknown">未知</SelectItem>
          </SelectContent>
        </Select>
        <Select value={archFilter} onValueChange={setArchFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="架构" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="x86_64">x86_64</SelectItem>
            <SelectItem value="aarch64">aarch64</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accTypeFilter} onValueChange={setAccTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="加速卡状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="HasAcc">有加速卡</SelectItem>
            <SelectItem value="NoAcc">无加速卡</SelectItem>
            <SelectItem value="Idle">有闲置卡</SelectItem>
            <SelectItem value="Busy">有忙碌卡</SelectItem>
            <SelectItem value="Warning">有异常卡</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['devices'] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>IP地址</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>密码</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作系统</TableHead>
              <TableHead>架构</TableHead>
              <TableHead>加速卡</TableHead>
              <TableHead>卡状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={10} />
                ))}
              </>
            ) : devices.length === 0 ? (
              <TableRow>
                   <TableCell colSpan={10} className="text-center py-8">
                  暂无设备
                </TableCell>
              </TableRow>
            ) : (
              devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.id}</TableCell>
                  <TableCell className="font-medium">{device.ip}</TableCell>
                  <TableCell>{device.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono">
                        {visiblePasswords.has(device.id) ? device.password : '••••••••'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => togglePassword(device.id)}
                      >
                        {visiblePasswords.has(device.id) ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyPassword(device.password)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[device.status]}>
                      {device.status === 'Online' ? '在线' : device.status === 'Offline' ? '离线' : '未知'}
                    </Badge>
                  </TableCell>
                  <TableCell>{device.os_info || '-'}</TableCell>
                  <TableCell>{device.arch || '-'}</TableCell>
                  <TableCell>
                    {device.accelerator_type || '无'} × {device.accelerator_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {device.idle_count > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {device.idle_count} 闲置
                        </Badge>
                      )}
                      {device.busy_count > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          <Activity className="w-3 h-3 mr-1" />
                          {device.busy_count} 忙碌
                        </Badge>
                      )}
                      {device.warning_count > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {device.warning_count} 异常
                        </Badge>
                      )}
                      {device.accelerator_count === 0 && <span className="text-gray-400 text-xs">-</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={device.remark || ''}>
                    {device.remark || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => viewDeviceDetail(device)}
                        title="查看详情"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRefresh(device.id)}
                        title="刷新状态"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(device)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setDeviceToDelete(device.id)
                          setDeleteConfirmOpen(true)
                        }}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              第 {page} / {totalPages} 页，共 {data?.total || 0} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white border-2 border-slate-300 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingDevice ? '编辑设备' : '添加设备'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="ip" className="text-sm font-semibold text-slate-800">
                IP地址 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ip"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                placeholder="192.168.1.100"
                className="bg-slate-50 border-slate-300 focus:bg-white"
                readOnly={false}
                disabled={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port" className="text-sm font-semibold text-slate-800">
                端口 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                className="bg-slate-50 border-slate-300 focus:bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-800">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="root"
                className="bg-slate-50 border-slate-300 focus:bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                密码 {editingDevice && <span className="text-slate-500 font-normal">(留空则不修改)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingDevice ? '不修改请留空' : '请输入密码'}
                className="bg-slate-50 border-slate-300 focus:bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remark" className="text-sm font-semibold text-slate-800">
                备注
              </Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选，例如：生产环境服务器"
                className="bg-slate-50 border-slate-300 focus:bg-white"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="px-6">
              取消
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createDevice.isPending || updateDevice.isPending || !formData.ip || !formData.username}
              className="px-6"
            >
              {createDevice.isPending || updateDevice.isPending ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white border-2 border-red-200 shadow-2xl">
          <DialogHeader className="border-b border-red-100 pb-4">
            <DialogTitle className="text-xl font-bold text-red-600">确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700">确定要删除此设备吗？此操作不可恢复。</p>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="px-6">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDevice.isPending} className="px-6">
              {deleteDevice.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-white border-2 border-slate-300 shadow-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              设备详情 - {selectedDevice?.ip}
            </DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">ID</span>
                  <p className="font-medium">{selectedDevice.id}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">状态</span>
                  <p className="font-medium">
                    <Badge className={statusColors[selectedDevice.status]}>
                      {selectedDevice.status === 'Online' ? '在线' : selectedDevice.status === 'Offline' ? '离线' : '未知'}
                    </Badge>
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">IP地址</span>
                  <p className="font-medium">{selectedDevice.ip}:{selectedDevice.port}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">用户名</span>
                  <p className="font-medium">{selectedDevice.username}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">操作系统</span>
                  <p className="font-medium">{selectedDevice.os_info || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">架构</span>
                  <p className="font-medium">{selectedDevice.arch || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">加速卡类型</span>
                  <p className="font-medium">{selectedDevice.accelerator_type || '无'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">加速卡数量</span>
                  <p className="font-medium">{selectedDevice.accelerator_count}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded">
                <span className="text-slate-500 text-sm">卡状态统计</span>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    闲置: {selectedDevice.idle_count}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Activity className="w-3 h-3 mr-1" />
                    忙碌: {selectedDevice.busy_count}
                  </Badge>
                  {selectedDevice.warning_count > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      异常: {selectedDevice.warning_count}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedDevice.accelerator_status && (
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">加速卡详情</span>
                  <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedDevice.accelerator_status, null, 2)}
                  </pre>
                </div>
              )}

              {selectedDevice.remark && (
                <div className="bg-slate-50 p-3 rounded">
                  <span className="text-slate-500 text-sm">备注</span>
                  <p className="font-medium">{selectedDevice.remark}</p>
                </div>
              )}

              {selectedDevice.error_message && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <span className="text-red-500 text-sm">错误信息</span>
                  <p className="font-medium text-red-700">{selectedDevice.error_message}</p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded">
                <span className="text-slate-500 text-sm">最后更新</span>
                <p className="font-medium">
                  {selectedDevice.last_updated 
                    ? new Date(selectedDevice.last_updated).toLocaleString('zh-CN')
                    : '-'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button onClick={() => setDetailDialogOpen(false)} className="px-6">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white border-2 border-slate-300 shadow-2xl max-w-lg">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              导入设备
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                <strong>导入说明：</strong>
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>支持 CSV 格式文件</li>
                <li>文件编码建议使用 UTF-8</li>
                <li>必填字段：IP地址、端口、用户名、密码</li>
                <li>可选字段：备注</li>
                <li>重复IP将被跳过</li>
              </ul>
              <p className="text-sm text-blue-600 mt-2">
                <strong>提示：</strong>请先使用"下载模板"按钮获取标准模板文件
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-800">
                选择文件
              </Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="bg-slate-50 border-slate-300"
              />
              {importFile && (
                <p className="text-sm text-slate-600">
                  已选择: {importFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="px-6">
              取消
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="px-6"
            >
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
