import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useExecuteTask,
  useCancelTask,
  useAutoImportTask,
} from '@/hooks/use-tasks'
import { useDevices } from '@/hooks/use-devices'
import { Task, TaskStatusLabels, TestTypeLabels, PriorityLabels } from '@/lib/types'
import {
  Plus,
  Search,
  RefreshCw,
  Play,
  XCircle,
  Trash2,
  Eye,
  Edit,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

const formSchema = z.object({
  task_name: z.string().min(1, '必填').max(100, '最多100字符'),
  priority: z.coerce.number(),
  task_description: z.string().max(500, '最多500字符').optional(),
  test_type: z.coerce.number(),
  test_mode: z.coerce.number(),
  startup_mode: z.enum(['api', 'container']).default('api'),

  // API mode specific fields
  base_url: z.string().optional(),
  api_key: z.string().optional(),
  parameter_combination: z.string().optional(),
  parameter_combinations: z.array(z.object({
    input_len: z.string(),
    output_len: z.string(),
    num_prompts: z.string(),
    max_concurrency: z.string()
  })).optional(),
  processor_type: z.string().optional(),
  server_model: z.string().optional(),
  framework_startup_args: z.string().optional(),
  accelerator_card: z.string().optional(),

  // Device Selection
  device_selection_mode: z.enum(['list', 'manual']),
  device_id: z.string().optional(),
  device_ip: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  save_device: z.boolean().default(false),

  // Config
  inference_framework: z.string().min(1, '必选'),
  framework_version: z.string().min(1, '必填'),
  
  // Dynamic fields
  model_name: z.string().optional(),
  npu_count: z.coerce.number().int().min(1).max(128).optional(),
  graph_mode: z.string().optional(),
  model_path: z.string().min(1, '必填'),
  test_path: z.string().min(1, '必填'),
  execution_id: z.coerce.number(),
  dataset_name: z.string().optional(),
  
  // New UI fields
  scenario: z.string().optional(),
  features: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  // Device Validation
  if (data.startup_mode === 'container') {
    if (data.device_selection_mode === 'list') {
    if (!data.device_id) {
       ctx.addIssue({ path: ['device_id'], code: z.ZodIssueCode.custom, message: '请选择设备' })
    }
  } else {
    if (!data.device_ip || !z.string().ip({ version: 'v4' }).safeParse(data.device_ip).success) {
       ctx.addIssue({ path: ['device_ip'], code: z.ZodIssueCode.custom, message: '请输入有效IP' })
    }
    if (!data.username) ctx.addIssue({ path: ['username'], code: z.ZodIssueCode.custom, message: '必填' })
    if (!data.password) ctx.addIssue({ path: ['password'], code: z.ZodIssueCode.custom, message: '必填' })
    }
  }

  // Single Model Validation (test_mode = 1)
  // Ensure strict number comparison as select values might be strings
  if (Number(data.test_mode) === 1) { 
     if (!data.model_name) ctx.addIssue({ path: ['model_name'], code: z.ZodIssueCode.custom, message: '必填' })
     if (!data.npu_count) ctx.addIssue({ path: ['npu_count'], code: z.ZodIssueCode.custom, message: '必填' })
     if (!data.graph_mode) ctx.addIssue({ path: ['graph_mode'], code: z.ZodIssueCode.custom, message: '必填' })
  }
  
  // Accuracy Validation (test_type = 2) + Single Model
  if (Number(data.test_type) === 2 && Number(data.test_mode) === 1) {
      if (!data.dataset_name) {
          ctx.addIssue({ path: ['dataset_name'], code: z.ZodIssueCode.custom, message: '必填' })
      }
  }
})

type FormValues = z.infer<typeof formSchema>

export function TaskList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewTask, setViewTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)

  const { data, isLoading } = useTasks({
    page,
    size: 20,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const { data: devicesData } = useDevices({ size: 100 })
  const devices = devicesData?.items || []

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const executeTask = useExecuteTask()
  const cancelTask = useCancelTask()
  const autoImportTask = useAutoImportTask()

  // Form Setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: '',
      priority: 1,
      task_description: '',
      test_type: 1, // 性能测试
      test_mode: 1, // 单模型
      startup_mode: 'api',
      base_url: '',
      api_key: '',
      parameter_combination: '',
      parameter_combinations: [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }],
      processor_type: 'NPU',
      server_model: '',
      framework_startup_args: '',
      accelerator_card: '',
      device_selection_mode: 'list',
      device_id: '',
      save_device: false,
      inference_framework: 'MindIE',
      framework_version: 'v1.0.1',
      model_path: '',
      test_path: '',
      execution_id: 1,
      npu_count: 1,
      graph_mode: 'aclgraph',
      model_name: '',
      dataset_name: '',
      scenario: '对话',
      features: [],
      device_ip: '',
      username: '',
      password: '',
    },
  })

    const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({
    control: form.control,
    name: "parameter_combinations"
  })

  // Watchers for conditional logic
  const testType = form.watch('test_type')
  const testMode = form.watch('test_mode')
  const startupMode = form.watch('startup_mode')
  const inferenceFramework = form.watch('inference_framework')
  const deviceSelectionMode = form.watch('device_selection_mode')
  const selectedDeviceId = form.watch('device_id')

  // Auto-fill Logic
  useEffect(() => {
    if (inferenceFramework === 'MindIE') {
      form.setValue('graph_mode', 'aclgraph')
    }
  }, [inferenceFramework, form])

  useEffect(() => {
    if (deviceSelectionMode === 'list' && selectedDeviceId) {
      const device = devices.find(d => d.id.toString() === selectedDeviceId)
      if (device) {
        form.setValue('npu_count', device.accelerator_count || 1)
        // model_name is not available on device object, skipping
      }
    }
  }, [selectedDeviceId, deviceSelectionMode, devices, form])


  const onSubmit = async (values: FormValues) => {
    try {
      // Map frontend fields to backend fields
      // Convert inference_framework from string to number
      const frameworkValue = values.inference_framework === '1' ? 1 : 
                           values.inference_framework === '2' ? 2 : 1
      
      const taskData: any = {
        task_name: values.task_name,
        task_description: values.task_description,
        priority: values.priority,
        test_type: values.test_type,
        test_mode: values.test_mode,
        startup_mode: values.startup_mode,
        base_url: values.base_url,
        api_key: values.api_key,
        parameter_combination: values.parameter_combinations && values.parameter_combinations.length > 0 ? JSON.stringify(values.parameter_combinations) : '',
        processor_type: values.processor_type,
        server_model: values.server_model,
        framework_startup_args: values.framework_startup_args,
        accelerator_card: values.accelerator_card,
        device_id: values.device_selection_mode === 'list' && values.device_id ? parseInt(values.device_id) : undefined,
        device_ip: values.device_ip,
        device_username: values.username,  // Map username to device_username
        device_password: values.password,  // Map password to device_password
        script_path: values.test_path,     // Map test_path to script_path
        model_name: values.model_name,
        npu_count: values.npu_count,
        graph_mode: values.graph_mode,
        model_path: values.model_path,
        inference_framework: frameworkValue,  // Convert to number
        framework_version: values.framework_version,
        execution_flag: values.execution_id?.toString(),  // Map execution_id to execution_flag
        scenario: values.scenario,
        features: values.features ? values.features.join(',') : '',
        // Common fields update
        updated_at: new Date().toISOString(),
      }

      if (editingTask) {
        await updateTask.mutateAsync({
          id: editingTask.id,
          ...taskData,
        })
        toast.success('任务更新成功')
      } else {
        // Create specific fields
        taskData.status = 0
        taskData.progress = 0
        taskData.created_at = new Date().toISOString()
        taskData.created_by = 'admin'
        // Default values for fields removed from form but maybe needed by backend
        taskData.context_lengths = '1024,2048,4096'
        taskData.concurrencies = '1,8,16,32,64'
        
        const createdTask = await createTask.mutateAsync(taskData)
        toast.success('任务创建成功')
        
        // 自动发起测试
        if (createdTask?.id) {
          try {
            await executeTask.mutateAsync(createdTask.id)
            toast.success('任务已开始执行')
          } catch (execError) {
            toast.error('任务创建成功，但执行失败，请手动执行')
            console.error('执行任务失败:', execError)
          }
        }
      }
      
      setIsDialogOpen(false)
      setEditingTask(null)
      form.reset()
    } catch (error) {
      toast.error(editingTask ? '更新失败' : '创建失败')
      console.error(error)
    }
  }

  const handleEdit = (task: Task) => {
    let parsedCombinations = [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }];
    if (task.parameter_combination) {
      try {
        const parsed = JSON.parse(task.parameter_combination);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedCombinations = parsed;
        } else if (typeof parsed === 'object') {
           // Handle old format if it was a single object
           parsedCombinations = [ { input_len: String(parsed.input_len || ''), output_len: String(parsed.output_len || ''), num_prompts: String(parsed.num_prompts || ''), max_concurrency: String(parsed.max_concurrency || '') } ];
        }
      } catch (e) {
        console.error("Failed to parse parameter_combination", e);
      }
    }
    setEditingTask(task)
    form.reset({
      task_name: task.task_name || '',
      priority: task.priority ?? 1,
      task_description: task.task_description || '',
      test_type: task.test_type ?? 1,
      test_mode: task.test_mode ?? 1,
      startup_mode: task.startup_mode || 'container',
      base_url: task.base_url || '',
      api_key: task.api_key || '',
      parameter_combination: task.parameter_combination || '',
      parameter_combinations: parsedCombinations,
      processor_type: task.processor_type || 'NPU',
      server_model: task.server_model || '',
      framework_startup_args: task.framework_startup_args || '',
      accelerator_card: task.accelerator_card || '',
      device_selection_mode: task.device_id ? 'list' : 'manual',
      device_id: task.device_id?.toString() || '',
      device_ip: task.device_ip || '',
      username: '',
      password: '',
      save_device: false,
      inference_framework: String(task.inference_framework ?? 1),
      framework_version: task.framework_version || '',
      model_path: task.model_path || '',
      test_path: task.test_path || '',
      execution_id: task.execution_id || 1,
      npu_count: task.npu_count || 1,
      graph_mode: task.graph_mode || 'aclgraph',
      model_name: task.model_name || '',
      dataset_name: task.dataset_name || '',
      scenario: task.scenario || '对话',
      features: Array.isArray(task.features) ? task.features : (typeof task.features === 'string' && task.features ? task.features.split(',') : []),
    })
    setIsDialogOpen(true)
  }

  const handleView = (task: Task) => {
    setViewTask(task)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask.mutateAsync(taskToDelete)
        toast.success('任务删除成功')
        setDeleteConfirmOpen(false)
        setTaskToDelete(null)
        if (tasks.length === 1 && page > 1) {
          setPage((p) => p - 1)
        }
      } catch (error) {
        toast.error('删除失败')
      }
    }
  }

  const handleExecute = async (id: number) => {
    try {
      await executeTask.mutateAsync(id)
      toast.success('任务已开始执行')
    } catch (error) {
      toast.error('执行失败')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await cancelTask.mutateAsync(id)
      toast.success('任务已取消')
    } catch (error) {
      toast.error('取消失败')
    }
  }

  const handleAutoImport = async (id: number) => {
    try {
      const result = await autoImportTask.mutateAsync(id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || '导入失败')
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || '导入失败'
      toast.error(errorMessage)
    }
  }

  const tasks = data?.items || []
  const totalPages = data ? Math.ceil(data.total / data.size) : 0
  
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">性能测试</h1>
          <p className="text-gray-500 mt-1">管理测试任务，监控执行状态</p>
        </div>
        <Button onClick={() => {
          setEditingTask(null)
          form.reset({
            task_name: '',
            priority: 1,
            task_description: '',
            test_type: 1,
            test_mode: 1,
            startup_mode: 'api',
            base_url: '',
            api_key: '',
            parameter_combination: '',
            parameter_combinations: [{ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' }],
            processor_type: 'NPU',
            server_model: '',
            framework_startup_args: '',
      accelerator_card: '',
            device_selection_mode: 'list',
            device_id: '',
            save_device: false,
      inference_framework: '1',  // Default to vLLM
            framework_version: 'v1.0.1',
            model_path: '',
            test_path: '',
            execution_id: 1,
            npu_count: 1,
            graph_mode: 'aclgraph',
            model_name: '',
            dataset_name: '',
            scenario: '对话',
            features: [],
            device_ip: '',
            username: '',
            password: '',
          })
          setIsDialogOpen(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          创建任务
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索任务名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" aria-label="状态">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="0">待执行</SelectItem>
            <SelectItem value="3">执行中</SelectItem>
            <SelectItem value="4">已完成</SelectItem>
            <SelectItem value="5">失败</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>任务名称</TableHead>
              <TableHead>测试类型</TableHead>
              <TableHead>测试模式</TableHead>
              <TableHead>模型</TableHead>
              <TableHead>推理框架</TableHead>
              <TableHead>推理框架版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
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
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  暂无任务
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.id}</TableCell>
                  <TableCell className="font-medium">{task.task_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.test_type === 1 ? '性能测试' : '精度测试'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.test_mode === 1 ? '单模型测试' : '全套模型'}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.test_mode === 2 ? '' : (task.model_name || '-')}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.inference_framework === 1 ? 'vLLM' : 'MindIE'}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.framework_version}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[task.status]?.color || 'bg-gray-100 text-gray-800'}>
                      {statusConfig[task.status]?.label || '未知'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(task.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="查看详情"
                        onClick={() => handleView(task)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="编辑"
                        onClick={() => handleEdit(task)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {(task.status === 0 || task.status === 1) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExecute(task.id)}
                          title="执行"
                        >
                          <Play className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {task.status === 3 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(task.id)}
                          title="取消"
                        >
                          <XCircle className="w-4 h-4 text-yellow-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTaskToDelete(task.id)
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">{editingTask ? '编辑测试任务' : '创建测试任务'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              
              {/* 基础信息 */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="task_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>任务名称 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Qwen-14B性能测试" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>优先级 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择优先级" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2">高</SelectItem>
                            <SelectItem value="1">中</SelectItem>
                            <SelectItem value="0">低</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="task_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务描述</FormLabel>
                      <FormControl>
                        <Textarea placeholder="测试任务详细描述..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 测试配置 */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">测试配置</h3>
                <div className="grid grid-cols-3 gap-4">

                  <FormField
                    control={form.control}
                    name="test_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>测试类型 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">性能测试</SelectItem>
                            <SelectItem value="2">精度测试</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="test_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>测试模式 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">单模型测试</SelectItem>
                            <SelectItem value="2">全套模型测试</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {Number(testType) === 1 && Number(testMode) === 1 && (
                  <FormField
                    control={form.control}
                    name="startup_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>启动模式 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="api">直连API</SelectItem>
                            <SelectItem value="container">容器化启动</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                </div>
              </div>

              {startupMode === 'api' && (
                <>
                  <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="font-semibold text-slate-900">性能测试配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="base_url" render={({ field }) => (
                        <FormItem><FormLabel>接口地址 (BASE_URL) <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="http://api..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="model_name" render={({ field }) => (
                        <FormItem><FormLabel>模型名称 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="Qwen-14B" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="api_key" render={({ field }) => (
                        <FormItem><FormLabel>鉴权密钥</FormLabel><FormControl><Input placeholder="Bearer token..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="model_path" render={({ field }) => (
                        <FormItem><FormLabel>模型路径 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="/data/models/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="col-span-2 space-y-2 border p-4 rounded-lg bg-gray-50/50">
                        <FormLabel>参数组合</FormLabel>
                        <div className="space-y-2 mt-1">
                          <div className="flex gap-2 items-center px-1">
                            <div className="flex-1 grid grid-cols-4 gap-4 text-xs font-semibold text-slate-500 text-left">
                              <div>input_len</div>
                              <div>output_len</div>
                              <div>num_prompts</div>
                              <div>max_concurrency</div>
                            </div>
                            <div className="w-[80px]"></div>
                          </div>
                          {paramFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-start">
                              <div className="flex-1 grid grid-cols-4 gap-4">
                                <FormField control={form.control} name={`parameter_combinations.${index}.input_len`} render={({field}) => <FormItem><FormControl><Input placeholder="1024" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={`parameter_combinations.${index}.output_len`} render={({field}) => <FormItem><FormControl><Input placeholder="1024" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={`parameter_combinations.${index}.num_prompts`} render={({field}) => <FormItem><FormControl><Input placeholder="1" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={`parameter_combinations.${index}.max_concurrency`} render={({field}) => <FormItem><FormControl><Input placeholder="1" {...field} /></FormControl></FormItem>} />
                              </div>
                              <div className="flex items-center gap-1 w-[80px] mt-1">
                                {index === paramFields.length - 1 && (
                                  <Button type="button" variant="outline" size="icon" onClick={() => appendParam({ input_len: '', output_len: '', num_prompts: '', max_concurrency: '' })}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                                {paramFields.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeParam(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <FormField control={form.control} name="test_path" render={({ field }) => (
                        <FormItem><FormLabel>测试路径 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="/data/scripts/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="processor_type" render={({ field }) => (
                        <FormItem><FormLabel>处理器类型 <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="NPU">NPU</SelectItem><SelectItem value="GPU">GPU</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="graph_mode" render={({ field }) => (
                        <FormItem><FormLabel>图模式</FormLabel><FormControl><Input placeholder="aclgraph" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4 pb-6">
                    <h3 className="font-semibold text-slate-900">推理配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="server_model" render={({ field }) => (
                        <FormItem><FormLabel>机型</FormLabel><FormControl><Input placeholder="Atlas 800T A2" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="accelerator_card" render={({ field }) => (
                        <FormItem><FormLabel>加速卡</FormLabel><FormControl><Input placeholder="比如910B等" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="npu_count" render={({ field }) => (
                        <FormItem><FormLabel>卡数 <span className="text-red-500">*</span></FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="scenario" render={({ field }) => (
                        <FormItem><FormLabel>场景</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="对话">对话</SelectItem><SelectItem value="Agent">Agent</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <div className="col-span-2">
                        <FormField control={form.control} name="features" render={({ field }) => (
                          <FormItem>
                            <FormLabel>特性</FormLabel>
                            <div className="flex flex-wrap gap-4 mt-2">
                              {['FP4', 'FP8', '投机推理', 'KV Cache卸载', 'KV稀疏'].map((feat) => (
                                <label key={feat} className="flex items-center space-x-2 cursor-pointer">
                                  <Checkbox 
                                    checked={field.value?.includes(feat)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, feat]);
                                      } else {
                                        field.onChange(current.filter((f) => f !== feat));
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-slate-700">{feat}</span>
                                </label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="inference_framework" render={({ field }) => (
                        <FormItem><FormLabel>推理框架 <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="1">vLLM</SelectItem><SelectItem value="2">MindIE</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="framework_version" render={({ field }) => (
                        <FormItem><FormLabel>推理框架版本 <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="v1.0.1" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="col-span-2">
                        <FormField control={form.control} name="framework_startup_args" render={({ field }) => (
                          <FormItem><FormLabel>启动参数</FormLabel><FormControl><Input placeholder="--tensor-parallel-size 1" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {startupMode === 'container' && (
                <>
              {/* 设备配置 */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                 <h3 className="font-semibold text-slate-900">设备配置</h3>
                 <FormField
                    control={form.control}
                    name="device_selection_mode"
                    render={({ field }) => (
                      <FormItem>
                        <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="list">从设备列表选择</TabsTrigger>
                            <TabsTrigger value="manual">手动添加设备</TabsTrigger>
                          </TabsList>
                          <TabsContent value="list" className="pt-4">
                             <FormField
                              control={form.control}
                              name="device_id"
                              render={({ field: subField }) => (
                                <FormItem>
                                  <FormLabel>选择设备 <span className="text-red-500">*</span></FormLabel>
                                  <Select onValueChange={subField.onChange} value={subField.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="选择设备" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {devices.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500 text-center">暂无可用设备</div>
                                      ) : (
                                        devices.map((device) => (
                                          <SelectItem key={device.id} value={device.id.toString()}>
                                            {device.ip} ({device.status})
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          <TabsContent value="manual" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="device_ip"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>设备IP <span className="text-red-500">*</span></FormLabel>
                                      <FormControl>
                                        <Input placeholder="192.168.1.100" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="username"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>用户名 <span className="text-red-500">*</span></FormLabel>
                                      <FormControl>
                                        <Input placeholder="root" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="password"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>密码 <span className="text-red-500">*</span></FormLabel>
                                      <FormControl>
                                        <Input type="password" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                            <FormField
                              control={form.control}
                              name="save_device"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      保存到设备管理
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                        </Tabs>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* 模型配置 */}
              <div className="space-y-4 pb-6">
                <h3 className="font-semibold text-slate-900">模型配置</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inference_framework"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>推理框架 <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择推理框架" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">vLLM</SelectItem>
                            <SelectItem value="2">MindIE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="framework_version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>框架版本 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="v1.0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                   />
                   <FormField
                    control={form.control}
                    name="model_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>模型路径 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="/data/models/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                   />

                   {/* 模型配置字段 - 按指定顺序排列 */}
                   {/* 4. 测试路径 */}
                   <FormField
                    control={form.control}
                    name="test_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>测试路径 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="/data/scripts/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                   />
                    {/* 5. 模型名称 */}
                    {Number(testMode) === 1 && (
                    <FormField
                     control={form.control}
                     name="model_name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>模型名称 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input placeholder="Qwen-14B" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}
                    {/* 处理器 - 仅性能测试显示 */}
                    {Number(testType) === 1 && (
                    <FormField
                     control={form.control}
                     name="processor_type"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>处理器类型 <span className="text-red-500">*</span></FormLabel>
                         <Select onValueChange={field.onChange} value={field.value || 'NPU'}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="选择处理器类型" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="NPU">NPU</SelectItem>
                             <SelectItem value="GPU">GPU</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}
                    {/* 6. 加速卡数量 */}
                    {Number(testMode) === 1 && (
                    <FormField
                     control={form.control}
                     name="npu_count"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>加速卡数量 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input type="number" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}
                    
                    {/* 7. 图模式 */}
                    {Number(testMode) === 1 && Number(inferenceFramework) === 1 && (
                    <FormField
                     control={form.control}
                     name="graph_mode"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>图模式 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input placeholder="eager" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}
                    {/* 8. 执行标识 */}
                    {Number(testMode) === 1 && Number(inferenceFramework) === 1 && (
                    <FormField
                     control={form.control}
                     name="execution_id"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>执行标识 <span className="text-red-500">*</span></FormLabel>
                         <Select onValueChange={field.onChange} value={String(field.value)}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="1">自定义性能脚本</SelectItem>
                             <SelectItem value="2">VLLM基准测试脚本</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}

                    {/* Dataset Name - 仅精度测试且单模型测试显示 */}
                    {Number(testType) === 2 && Number(testMode) === 1 && (
                    <FormField
                     control={form.control}
                     name="dataset_name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>数据集名称 <span className="text-red-500">*</span></FormLabel>
                         <FormControl>
                           <Input placeholder="MMLU" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                    />
                    )}
                  </div>
               </div>
              </>
              )}

              <DialogFooter className="gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                  {createTask.isPending || updateTask.isPending ? (editingTask ? '保存中...' : '创建中...') : (editingTask ? '保存修改' : '创建任务')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">任务详情</DialogTitle>
          </DialogHeader>
          {viewTask && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">任务名称</h4>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{viewTask.task_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">优先级</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={viewTask.priority === 2 ? 'destructive' : viewTask.priority === 1 ? 'default' : 'secondary'}>
                      {PriorityLabels[viewTask.priority]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">任务状态</h4>
                  <p className="mt-1">
                    <Badge className={statusConfig[viewTask.status]?.color || 'bg-gray-100 text-gray-800'}>
                      {statusConfig[viewTask.status]?.label || '未知'}
                    </Badge>
                  </p>
                </div>
                 <div>
                  <h4 className="text-sm font-medium text-gray-500">测试类型</h4>
                  <p className="mt-1 text-sm text-gray-900">{TestTypeLabels[viewTask.test_type]}</p>
                </div>
                 <div>
                  <h4 className="text-sm font-medium text-gray-500">测试模式</h4>
                  <p className="mt-1 text-sm text-gray-900">{viewTask.test_mode === 1 ? '单模型测试' : '全套模型测试'}</p>
                </div>
                {viewTask.test_type === 1 && viewTask.test_mode === 1 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">启动模式</h4>
                  <p className="mt-1 text-sm text-gray-900">{viewTask.startup_mode === 'api' ? '直连API' : '容器化启动'}</p>
                </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500">创建人</h4>
                  <p className="mt-1 text-sm text-gray-900">{viewTask.created_by}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">创建时间</h4>
                  <p className="mt-1 text-sm text-gray-900">{new Date(viewTask.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">最后更新</h4>
                  <p className="mt-1 text-sm text-gray-900">{new Date(viewTask.updated_at).toLocaleString()}</p>
                </div>
              </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">配置详情</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                      <div>
                       <span className="text-xs text-gray-500 block">推理框架</span>
                       <span className="text-sm">{viewTask.inference_framework === 1 ? 'vLLM' : 'MindIE'}</span>
                      </div>
                     <div>
                      <span className="text-xs text-gray-500 block">框架版本</span>
                      <span className="text-sm">{viewTask.framework_version}</span>
                     </div>
                     <div>
                      <span className="text-xs text-gray-500 block">模型路径</span>
                      <span className="text-sm break-all">{viewTask.model_path}</span>
                     </div>
                     <div>
                       <span className="text-xs text-gray-500 block">测试路径</span>
                       <span className="text-sm break-all">{viewTask.script_path || '-'}</span>
                     </div>
                                          {/* 仅性能测试显示处理器 */}
                     {viewTask.test_type === 1 && (
                       <div>
                         <span className="text-xs text-gray-500 block">处理器类型</span>
                         <span className="text-sm">{viewTask.processor_type || '-'}</span>
                       </div>
                     )}
                     {viewTask.test_mode === 1 && (
                       <>
                         <div>
                           <span className="text-xs text-gray-500 block">模型名称</span>
                           <span className="text-sm">{viewTask.model_name || '-'}</span>
                         </div>
                         <div>
                           <span className="text-xs text-gray-500 block">卡数</span>
                           <span className="text-sm">{viewTask.npu_count || '-'}</span>
                         </div>
                         {/* 图模式 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">图模式</span>
                             <span className="text-sm">{viewTask.graph_mode || '-'}</span>
                           </div>
                         )}
                         {/* 执行标识 - 仅vLLM显示 */}
                         {viewTask.inference_framework === 1 && (
                           <div>
                             <span className="text-xs text-gray-500 block">执行标识</span>
                             <span className="text-sm">
                               {viewTask.execution_flag === '1' ? '自定义性能脚本' : 
                                viewTask.execution_flag === '2' ? 'VLLM基准测试脚本' : 
                                viewTask.execution_flag || '-'}
                             </span>
                           </div>
                         )}
                       </>
                     )}
                     {viewTask.test_type === 2 && viewTask.test_mode === 1 && (
                       <div>
                         <span className="text-xs text-gray-500 block">数据集名称</span>
                         <span className="text-sm">{viewTask.dataset_name || '-'}</span>
                       </div>
                     )}
                       {viewTask.test_mode === 1 && (
                         <>
                           {viewTask.startup_mode === 'api' && (
                             <>
                               <div>
                                 <span className="text-xs text-gray-500 block">接口地址</span>
                                 <span className="text-sm break-all">{viewTask.base_url || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">鉴权密钥</span>
                                 <span className="text-sm">{viewTask.api_key ? '***' : '-'}</span>
                               </div>

                               <div>
                                 <span className="text-xs text-gray-500 block">机型</span>
                                 <span className="text-sm">{viewTask.server_model || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">加速卡</span>
                                 <span className="text-sm">{viewTask.accelerator_card || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">场景</span>
                                 <span className="text-sm">{viewTask.scenario || '-'}</span>
                               </div>
                               <div>
                                 <span className="text-xs text-gray-500 block">特性</span>
                                 <span className="text-sm">{Array.isArray(viewTask.features) ? viewTask.features.join(', ') : viewTask.features || '-'}</span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-xs text-gray-500 block">启动参数</span>
                                 <span className="text-sm break-all">{viewTask.framework_startup_args || '-'}</span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-xs text-gray-500 block mb-1">参数组合</span>
                                 <div className="text-sm bg-white p-2 border rounded">
                                   {viewTask.parameter_combination ? (
                                     <pre className="whitespace-pre-wrap">
                                       {(() => {
                                         try {
                                           return JSON.stringify(JSON.parse(viewTask.parameter_combination), null, 2);
                                         } catch (e) {
                                           return viewTask.parameter_combination;
                                         }
                                       })()}
                                     </pre>
                                   ) : '-'}
                                 </div>
                               </div>
                             </>
                           )}
                         </>
                       )}
                      {viewTask.device_ip && (
                        <div>
                          <span className="text-xs text-gray-500 block">设备IP</span>
                          <span className="text-sm">{viewTask.device_ip}</span>
                        </div>
                      )}
                  </div>
                </div>

              {viewTask.task_description && (
                 <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500">任务描述</h4>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {viewTask.task_description}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white border-2 border-red-200 shadow-2xl">
          <DialogHeader className="border-b border-red-100 pb-4">
            <DialogTitle className="text-xl font-bold text-red-600">确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700">确定要删除此任务吗？此操作不可恢复。</p>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="px-6">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending} className="px-6">
              {deleteTask.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
