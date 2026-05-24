const fs = require('fs');

const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Fix evalResults parsing
code = code.replace(
  "const evalResults = Array.isArray(evalResultsData) ? evalResultsData : []",
  "const evalResults = evalResultsData?.reports || (Array.isArray(evalResultsData) ? evalResultsData : [])"
);

// Replace deviceNodeData and taskDistributionData logic
const newTaskStatusLogic = `
  // Chart Data: Task Status Distribution
  const perfStatusData = useMemo(() => {
    const running = tasks.filter(t => t.status === 3).length;
    const success = tasks.filter(t => t.status === 4).length;
    const failed = tasks.filter(t => t.status === 5 || t.status === 7).length;
    
    // If all are 0, return a dummy data point to show empty state
    if (running === 0 && success === 0 && failed === 0) {
      return [{ name: '暂无任务', value: 1, color: '#e2e8f0', actualValue: 0 }];
    }
    
    return [
      { name: '执行中', value: running, color: '#3b82f6', actualValue: running },
      { name: '成功', value: success, color: '#10b981', actualValue: success },
      { name: '失败/超时', value: failed, color: '#ef4444', actualValue: failed },
    ].filter(d => d.value > 0);
  }, [tasks])

  const evalStatusData = useMemo(() => {
    const running = evalTasks.filter((t: any) => t.status === 'running').length;
    const success = evalTasks.filter((t: any) => t.status === 'completed').length;
    const failed = evalTasks.filter((t: any) => t.status === 'failed' || t.status === 'stopped').length;

    if (running === 0 && success === 0 && failed === 0) {
      return [{ name: '暂无任务', value: 1, color: '#e2e8f0', actualValue: 0 }];
    }

    return [
      { name: '执行中', value: running, color: '#8b5cf6', actualValue: running },
      { name: '成功', value: success, color: '#10b981', actualValue: success },
      { name: '失败/终止', value: failed, color: '#ef4444', actualValue: failed },
    ].filter(d => d.value > 0);
  }, [evalTasks])
`;

// Replace the block containing deviceNodeData and taskDistributionData
code = code.replace(
  /\/\/ Chart Data: Device Node Utilization[\s\S]*?(?=const \[activeTaskTab\])/,
  newTaskStatusLogic + '\n  '
);


// Now replace the JSX corresponding to the charts.
// We need to find the `Task & Device Status Container` block and replace it.
const newChartsJSX = `
        {/* Task Pipeline Status Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Perf Tasks Status Pie */}
          <Card className="rounded-[16px] border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base font-bold">压测任务状态分布</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
               {isLoading ? (
                 <div className="h-[150px] flex items-center justify-center"><Skeleton className="w-[100px] h-[100px] rounded-full" /></div>
              ) : (
                <div className="h-[180px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={perfStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {perfStatusData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.actualValue + ' 个', name === '暂无任务' ? '数量' : name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute right-2 flex flex-col gap-2 justify-center">
                     {perfStatusData.map((entry, index) => (
                       entry.name !== '暂无任务' && (
                         <div key={index} className="flex items-center gap-2 text-xs">
                           <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }}></span>
                           <span className="text-textSec w-16">{entry.name}</span>
                           <span className="text-textMain font-bold ml-auto">{entry.actualValue}</span>
                         </div>
                       )
                     ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eval Tasks Status Pie */}
          <Card className="rounded-[16px] border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base font-bold">评测任务状态分布</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
               {isLoading ? (
                 <div className="h-[150px] flex items-center justify-center"><Skeleton className="w-[100px] h-[100px] rounded-full" /></div>
              ) : (
                <div className="h-[180px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={evalStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {evalStatusData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.actualValue + ' 个', name === '暂无任务' ? '数量' : name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute right-2 flex flex-col gap-2 justify-center">
                     {evalStatusData.map((entry, index) => (
                       entry.name !== '暂无任务' && (
                         <div key={index} className="flex items-center gap-2 text-xs">
                           <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }}></span>
                           <span className="text-textSec w-16">{entry.name}</span>
                           <span className="text-textMain font-bold ml-auto">{entry.actualValue}</span>
                         </div>
                       )
                     ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
`;

code = code.replace(
  /\{\/\* Task & Device Status Container \*\/\}[\s\S]*?(?=\{\/\* Lists Area \*\/\})/,
  newChartsJSX + '\n      '
);

fs.writeFileSync(file, code);
console.log('Dashboard updated successfully');
