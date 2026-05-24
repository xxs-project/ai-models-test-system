const fs = require('fs');

const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Add new chart imports
code = code.replace(
  "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'",
  "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'"
);

const newChartDataLogic = `
  // Chart Data: Top Models by Dataset (Top 3)
  const topDatasetChartData = useMemo(() => {
    if (!evalResults || evalResults.length === 0) return []
    
    const packMap: Record<string, { model: string, score: number }[]> = {}
    
    evalResults.forEach((r: any) => {
      if (!r.packs || !Array.isArray(r.packs)) return;
      r.packs.forEach((p: any) => {
        if (!p.name) return;
        if (!packMap[p.name]) packMap[p.name] = [];
        const score = p.maxScore > 0 ? (p.score / p.maxScore) * 100 : parseFloat(p.score || '0');
        if (!isNaN(score)) {
          packMap[p.name].push({ model: r.model_name, score });
        }
      });
    });

    const sortedDatasets = Object.keys(packMap).sort((a, b) => packMap[b].length - packMap[a].length).slice(0, 4);
    
    return sortedDatasets.map(dataset => {
      const models = packMap[dataset].sort((a, b) => b.score - a.score);
      return {
        name: dataset.length > 12 ? dataset.substring(0, 10) + '...' : dataset,
        fullName: dataset,
        top1Model: models[0]?.model || '无',
        top1Score: parseFloat((models[0]?.score || 0).toFixed(1)),
        top2Model: models[1]?.model || '无',
        top2Score: parseFloat((models[1]?.score || 0).toFixed(1)),
        top3Model: models[2]?.model || '无',
        top3Score: parseFloat((models[2]?.score || 0).toFixed(1)),
      }
    });
  }, [evalResults])

  // Chart Data: Device Node Utilization
  const deviceNodeData = useMemo(() => {
    return [...devices]
      .filter(d => d.accelerator_count > 0)
      .sort((a, b) => b.accelerator_count - a.accelerator_count)
      .slice(0, 5)
      .map(d => ({
        ip: d.ip.split('.').slice(-2).join('.'), 
        fullIp: d.ip,
        busy: d.busy_count,
        idle: d.idle_count,
      }))
  }, [devices])

  // Chart Data: Task Distribution
  const taskDistributionData = useMemo(() => {
    const data = [
      { name: '压测-执行中', value: runningPerfTasks, color: '#3b82f6' },
      { name: '压测-已完成', value: completedPerfTasks, color: '#93c5fd' },
      { name: '测评-执行中', value: runningEvalTasks, color: '#8b5cf6' },
      { name: '测评-已完成', value: completedEvalTasks, color: '#c4b5fd' },
    ].filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: '暂无任务', value: 1, color: '#e2e8f0' }];
  }, [runningPerfTasks, completedPerfTasks, runningEvalTasks, completedEvalTasks])
`;

code = code.replace(
  /\/\/ Chart Data: Top Models by Score[\s\S]*?(?=\s*const \[activeTaskTab)/,
  newChartDataLogic
);

const newChartsSection = `
      {/* Chart & Analytics Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Models by Dataset */}
        <Card className="rounded-[16px] border-border shadow-sm bg-gradient-to-br from-cardBg to-cardBg/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold">主流数据集测评榜单 (Top 3)</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/board')} className="text-textSec hover:text-primary h-8 px-3">
              完整榜单 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center"><Skeleton className="w-full h-full rounded-lg" /></div>
            ) : topDatasetChartData.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDatasetChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        const payload = props.payload;
                        let modelName = '';
                        if (name === 'TOP 1') modelName = payload.top1Model;
                        if (name === 'TOP 2') modelName = payload.top2Model;
                        if (name === 'TOP 3') modelName = payload.top3Model;
                        return [\`\${value} 分\`, \`\${name}: \${modelName}\`];
                      }}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="top1Score" name="TOP 1" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="top2Score" name="TOP 2" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="top3Score" name="TOP 3" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-textMuted border border-dashed border-border rounded-lg bg-pageBg/30">
                <BarChart3 className="w-10 h-10 mb-2 opacity-50" />
                <p>暂无测评数据集评分记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task & Device Status Container */}
        <div className="grid grid-rows-2 gap-6">
          {/* Device Nodes Stacked Bar */}
          <Card className="rounded-[16px] border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                <CardTitle className="text-base font-bold">算力节点分布与负载</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {isLoading ? (
                 <div className="h-[100px] flex items-center justify-center"><Skeleton className="w-full h-full rounded-lg" /></div>
              ) : deviceNodeData.length > 0 ? (
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={deviceNodeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="ip" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <RechartsTooltip 
                         cursor={{ fill: '#f1f5f9' }}
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                         labelFormatter={(label, payload) => payload?.[0]?.payload?.fullIp || label}
                      />
                      <Bar dataKey="busy" name="计算中" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={12} />
                      <Bar dataKey="idle" name="空闲卡" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[120px] flex flex-col items-center justify-center text-textMuted text-sm">
                   暂无算力节点
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Distribution Pie */}
          <Card className="rounded-[16px] border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base font-bold">任务流水线分布</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
               {isLoading ? (
                 <div className="h-[120px] flex items-center justify-center"><Skeleton className="w-[80px] h-[80px] rounded-full" /></div>
              ) : (
                <div className="h-[120px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {taskDistributionData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [\`\${value} 个\`, '任务数']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute right-4 flex flex-col gap-1.5 justify-center">
                     {taskDistributionData.map((entry, index) => (
                       entry.name !== '暂无任务' && (
                         <div key={index} className="flex items-center gap-1.5 text-xs">
                           <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }}></span>
                           <span className="text-textSec truncate max-w-[80px]">{entry.name}</span>
                           <span className="text-textMain font-medium ml-auto">{entry.value}</span>
                         </div>
                       )
                     ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
`;

code = code.replace(
  /\{\/\* Chart & Analytics Section \*\/\}[\s\S]*?(?=\{\/\* Lists Area \*\/\})/,
  newChartsSection + '\n      '
);

fs.writeFileSync(file, code);
console.log('Dashboard updated successfully');
