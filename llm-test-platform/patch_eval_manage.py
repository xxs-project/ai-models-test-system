import re

with open('llm-test-platform/src/pages/EvalManage.tsx', 'r') as f:
    content = f.read()

# 1. Modify the Log button condition so it appears for all tasks that have a PID (or always)
# Currently it is inside {task.status === 'running' && (...)}
# Let's decouple it.
old_buttons = """                        {(task.status === 'pending' || task.status === 'failed' || task.status === 'stopped') && (
                          <Button variant="default" size="sm" className="h-8 text-xs bg-blue-600" onClick={() => handleStartEval(task)}>
                            <Play size={14} className="mr-1" /> 启动
                          </Button>
                        )}

                        {task.status === 'running' && (
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

new_buttons = """                        {(task.status === 'pending' || task.status === 'failed' || task.status === 'stopped') && (
                          <Button variant="default" size="sm" className="h-8 text-xs bg-blue-600" onClick={() => handleStartEval(task)}>
                            <Play size={14} className="mr-1" /> 启动
                          </Button>
                        )}

                        {task.status === 'running' && (
                          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleStopEval(task)}>
                            <StopCircle size={14} className="mr-1" /> 停止
                          </Button>
                        )}
                        
                        {(task.status === 'running' || task.status === 'completed' || task.status === 'failed') && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => viewLogs(task)}>
                            <Terminal size={14} className="mr-1" /> 日志
                          </Button>
                        )}
                        
                        {task.status !== 'running' && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteTask(task)}>
                            <Trash2 size={14} className="mr-1" /> 删除
                          </Button>
                        )}"""

content = content.replace(old_buttons, new_buttons)

# 2. Update viewLogs to fetch immediately
old_viewlogs = """  const viewLogs = (task: any) => {
    setActiveTask(task)
    setView('logs')
    if (task.pid) {
      startLogPolling(task.pid)
    }
  }"""

new_viewlogs = """  const viewLogs = (task: any) => {
    setActiveTask(task)
    setView('logs')
    if (task.pid) {
      startLogPolling(task.pid)
    } else {
      // If no pid, maybe just fetch logs once
      startLogPolling(0) 
    }
  }"""
content = content.replace(old_viewlogs, new_viewlogs)


# 3. Update startLogPolling to fetch immediately and handle completed status gracefully
old_polling = """  const startLogPolling = (pid: number) => {
    let lastLineCount = 0;
    setLogs([]);
    setProgress(0);
    
    pollInterval = setInterval(async () => {"""

new_polling = """  const startLogPolling = (pid: number) => {
    let lastLineCount = 0;
    setLogs([]);
    setProgress(0);
    
    const fetchLogData = async () => {
      try {
        const logsRes = await fetch("/api/eval/logs");
        let hasError = false;
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const newLines = logsData.logs || [];
          if (newLines.length > lastLineCount) {
            const formattedLogs = newLines.slice(lastLineCount).map((line: string) => {
              const now = new Date();
              const isError = line.toLowerCase().includes("error") || line.toLowerCase().includes("traceback") || line.toLowerCase().includes("exception");
              if (isError) hasError = true;
              return {
                time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
                step: isError ? "[Exec] 错误异常" : "[Exec] 运行日志",
                detail: line
              };
            });
            setLogs(prev => [...prev, ...formattedLogs]);
            lastLineCount = newLines.length;
            setProgress(prev => Math.min(prev + Math.floor(Math.random() * 10) + 5, 95));
          }
        }
        
        if (pid === 0) return; // Not running

        const statusRes = await fetch(`/api/eval/status?pid=${pid}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setProgress(100);
            
            // Check if there was actually an error in the logs
            if (hasError) {
              toast.error("评测进程已退出，但日志中检测到异常，请检查环境！");
            } else {
              toast.success("评测执行完毕，报告已生成！");
            }
            fetchTasks();
          }
        }
      } catch (e) {
        console.error("Error polling logs:", e);
      }
    };
    
    // Fetch immediately once
    fetchLogData();
    
    if (pid !== 0) {
      pollInterval = setInterval(fetchLogData, 1500);
    }
  }"""
  
content = re.sub(r'  const startLogPolling = \(pid: number\) => \{\n    let lastLineCount = 0;\n    setLogs\(\[\]\);\n    setProgress\(0\);\n    \n    pollInterval = setInterval\(async \(\) => \{[\s\S]*?\}, 1500\);\n  \}', new_polling, content)

# 4. Auto open logs on start
old_start = """  const handleStartEval = async (task: any) => {

    try {
      const res = await fetch(`/api/eval/tasks/${task.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success('测评已启动')
        fetchTasks()
      } else {"""

new_start = """  const handleStartEval = async (task: any) => {

    try {
      const res = await fetch(`/api/eval/tasks/${task.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success('测评已启动')
        task.pid = data.pid; // update locally to view logs
        task.status = 'running';
        fetchTasks()
        viewLogs(task)
      } else {"""

content = content.replace(old_start, new_start)

# 5. Fix UI bug where status says "评测运行中" even if completed
content = content.replace("""              <Badge variant="outline" className={`font-mono px-3 py-1 text-sm border-gray-700 text-blue-400 border-blue-500/30 bg-blue-500/10`}>
                🔵 评测运行中 (Running)
              </Badge>""", """              <Badge variant="outline" className={`font-mono px-3 py-1 text-sm border-gray-700 ${progress === 100 ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>
                {progress === 100 ? '✅ 评测已结束 (Finished)' : '🔵 评测运行中 (Running)'}
              </Badge>""")


with open('llm-test-platform/src/pages/EvalManage.tsx', 'w') as f:
    f.write(content)
    
