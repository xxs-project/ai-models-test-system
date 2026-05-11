import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Task, TaskStatusLabels } from '@/lib/types'
import { FlaskConical, Clock, Calendar, User } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onClick?: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const statusConfig: Record<number, { color: string; icon: string }> = {
    0: { color: 'bg-gray-100 text-gray-800', icon: '待执行' },
    1: { color: 'bg-blue-100 text-blue-800', icon: '队列中' },
    2: { color: 'bg-yellow-100 text-yellow-800', icon: '准备中' },
    3: { color: 'bg-orange-100 text-orange-800', icon: '执行中' },
    4: { color: 'bg-green-100 text-green-800', icon: '已完成' },
    5: { color: 'bg-red-100 text-red-800', icon: '失败' },
    6: { color: 'bg-gray-100 text-gray-800', icon: '已取消' },
    7: { color: 'bg-red-100 text-red-800', icon: '超时' },
  }

  const priorityLabels = ['低', '中', '高']
  const priorityColors = ['bg-gray-100 text-gray-800', 'bg-yellow-100 text-yellow-800', 'bg-red-100 text-red-800']

  const typeLabels: Record<number, string> = { 1: '单模型', 2: '全套' }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg truncate max-w-[200px]">{task.task_name}</CardTitle>
          </div>
          <Badge className={statusConfig[task.status]?.color}>
            {statusConfig[task.status]?.icon || '未知'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {task.created_by}
          </span>
          <Badge variant="outline">{typeLabels[task.test_type] || '未知'}</Badge>
          <Badge className={priorityColors[task.priority]}>
            优先级: {priorityLabels[task.priority]}
          </Badge>
        </div>

        {task.model_name && (
          <div className="text-sm">
            <span className="text-gray-600">模型: </span>
            <span className="font-medium">{task.model_name}</span>
          </div>
        )}

        {task.inference_framework && (
          <div className="text-sm">
            <span className="text-gray-600">框架: </span>
            <span className="font-medium">
              {task.inference_framework} {task.framework_version}
            </span>
          </div>
        )}

        {(task.status === 3 || task.status === 2) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">进度</span>
              <span className="font-medium">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.created_at).toLocaleDateString()}
          </span>
          {task.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              开始: {new Date(task.start_time).toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
