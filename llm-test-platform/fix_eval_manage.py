import re

with open("src/pages/EvalManage.tsx", "r") as f:
    content = f.read()

# Add Trash2 import
content = content.replace("StopCircle, Info, RefreshCw", "StopCircle, Info, RefreshCw, Trash2")

# Update eval_type rendering in list
old_eval_type_list = """<Badge variant="outline" className={task.eval_type === 'IPD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                        {task.eval_type === 'IPD' ? 'IDP' : 'BenchLocal'}
                      </Badge>"""

new_eval_type_list = """<Badge variant="outline" className={task.eval_type?.includes('IPD') && task.eval_type?.includes('BenchLocal') ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 border-gray-200' : task.eval_type === 'IPD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                        {task.eval_type?.split(',').map((t: string) => t === 'IPD' ? 'IDP' : t).join(',')}
                      </Badge>"""

content = content.replace(old_eval_type_list, new_eval_type_list)

# Update eval_type rendering in details
old_eval_type_detail = """<div className="font-medium mt-1 text-blue-600">{activeTask.eval_type === 'IPD' ? 'IDP' : 'BenchLocal'}</div>"""

new_eval_type_detail = """<div className="font-medium mt-1 text-blue-600">{activeTask.eval_type?.split(',').map((t: string) => t === 'IPD' ? 'IDP' : t).join(',')}</div>"""

content = content.replace(old_eval_type_detail, new_eval_type_detail)

# Add handleDeleteTask method
handle_delete_func = """
  const handleDeleteTask = async (task: any) => {
    if (!confirm('确定要删除任务 #' + task.id + ' 吗？')) return
    try {
      const res = await fetch('/api/eval/tasks/' + task.id, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        fetchTasks()
      } else {
        const err = await res.json()
        toast.error('删除失败: ' + (err.detail || '未知错误'))
      }
    } catch (e: any) {
      toast.error('删除失败: ' + e.message)
    }
  }

  const handleStartEval = async (task: any) => {
"""
content = content.replace("  const handleStartEval = async (task: any) => {", handle_delete_func)

# Add delete button
buttons_block = """                        {task.status === 'running' && (
                          <>
                            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleStopEval(task)}>
                              <StopCircle size={14} className="mr-1" /> 停止
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => viewLogs(task)}>
                              <Terminal size={14} className="mr-1" /> 日志
                            </Button>
                          </>
                        )}"""

new_buttons_block = """                        {task.status === 'running' && (
                          <>
                            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleStopEval(task)}>
                              <StopCircle size={14} className="mr-1" /> 停止
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => viewLogs(task)}>
                              <Terminal size={14} className="mr-1" /> 日志
                            </Button>
                          </>
                        )}
                        
                        {task.status !== 'running' && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteTask(task)}>
                            <Trash2 size={14} className="mr-1" /> 删除
                          </Button>
                        )}"""

content = content.replace(buttons_block, new_buttons_block)

with open("src/pages/EvalManage.tsx", "w") as f:
    f.write(content)
