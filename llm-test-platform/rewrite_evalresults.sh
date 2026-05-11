cat << 'TSX' > src/pages/EvalResults.tsx
import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, Share2, Info, Bug, Terminal, Code, Layers } from 'lucide-react';

export default function EvalResults() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchReports = () => {
      fetch('/api/eval/results')
        .then(res => res.json())
        .then(data => {
            setReports(data.reports || []);
            if (data.reports && data.reports.length > 0 && selectedReportIds.length === 0) {
                setSelectedReportIds([data.reports[0].id]);
            }
        })
        .catch(console.error);
    };
    
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleReport = (reportId: string) => {
    setSelectedReportIds(prev => 
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const selectedReports = useMemo(() => {
    return reports.filter(r => selectedReportIds.includes(r.id));
  }, [reports, selectedReportIds]);

  const singleReport = selectedReports.length === 1 ? selectedReports[0] : null;

  // Single report radar chart
  const radarOptions = singleReport ? {
    title: { text: '能力评测雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    radar: {
      indicator: singleReport.packs.map((p: any) => ({ name: p.name, max: p.maxScore || 100 })),
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: singleReport.packs.map((p: any) => p.score),
        name: singleReport.model_name,
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      }]
    }]
  } : null;

  // Compare multiple reports bar chart
  const compareOptions = selectedReports.length > 1 ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 10, type: 'scroll' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: Array.from(new Set(selectedReports.flatMap(r => r.packs.map((p: any) => p.name)))) 
    },
    yAxis: { type: 'value', max: 100 },
    series: selectedReports.map(r => ({
      name: `${r.model_name} (${r.time})`,
      type: 'bar',
      data: Array.from(new Set(selectedReports.flatMap(rx => rx.packs.map((p: any) => p.name)))).map(packName => {
        const pack = r.packs.find((p: any) => p.name === packName);
        return pack ? (pack.maxScore > 0 ? (pack.score / pack.maxScore * 100).toFixed(2) : 0) : 0;
      })
    }))
  } : null;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="shrink-0 border-gray-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <Search size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">评测结果总览</h2>
              <p className="text-xs text-gray-500">查看和对比历次大模型自动评测的数据报告</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9"><Share2 size={16} className="mr-2" /> 分享报表</Button>
            <Button variant="outline" size="sm" className="h-9"><Download size={16} className="mr-2" /> 导出数据</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        <Card className="w-full md:w-[350px] shrink-0 border-gray-200 shadow-sm flex flex-col min-h-0">
          <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-3 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              报告列表 ({reports.length})
              <span className="text-xs font-normal text-gray-500">勾选进行对比</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            <div className="divide-y divide-gray-100">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className={`p-3 hover:bg-blue-50/50 transition-colors flex items-start gap-3 ${selectedReportIds.includes(report.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <Checkbox 
                    checked={selectedReportIds.includes(report.id)} 
                    onCheckedChange={() => handleToggleReport(report.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleToggleReport(report.id)}>
                    <div className="font-medium text-sm text-gray-900 truncate">{report.model_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">{report.time}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                        {report.percent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">暂无评测报告</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 border-gray-200 shadow-sm flex flex-col min-h-0">
          <CardContent className="p-0 flex flex-col h-full">
            {selectedReports.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p>请在左侧勾选评测报告</p>
                <p className="text-xs mt-2">支持勾选多个报告进行横向对比分析</p>
              </div>
            ) : selectedReports.length === 1 && singleReport ? (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{singleReport.model_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">测试时间: {singleReport.time}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{singleReport.percent}%</div>
                      <p className="text-xs text-gray-500">综合胜率 ({singleReport.score})</p>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    {radarOptions && <ReactECharts option={radarOptions} style={{ height: '100%', width: '100%' }} />}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-md text-gray-800">分项能力详情</h4>
                    {singleReport.packs.map((pack: any, i: number) => (
                      <Card key={i} className="shadow-sm border-gray-200">
                        <CardHeader className="py-3 bg-gray-50/80 border-b">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-semibold">{pack.name}</CardTitle>
                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'} | {pack.score}/{pack.maxScore}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">用例 ID</TableHead>
                                <TableHead className="w-[60px]">状态</TableHead>
                                <TableHead className="w-[80px]">得分</TableHead>
                                <TableHead>失败原因 / 备注</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pack.cases.map((c: any, j: number) => (
                                <TableRow key={j}>
                                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                                  <TableCell>{c.pass ? '✅' : '❌'}</TableCell>
                                  <TableCell className="text-xs">{c.score}</TableCell>
                                  <TableCell className="text-xs text-gray-500">{c.error}</TableCell>
                                </TableRow>
                              ))}
                              {pack.cases.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-gray-400 py-4">无用例详情</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">模型横向对比 ({selectedReports.length}款)</h3>
                  <p className="text-sm text-gray-500">对比多个大模型在各个维度的得分率 (百分比)</p>
                </div>
                <div className="flex-1 min-h-[400px]">
                  {compareOptions && <ReactECharts option={compareOptions} style={{ height: '100%', width: '100%' }} />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
TSX
