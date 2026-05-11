import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, Share2, Trash2, Save, Link as LinkIcon, BarChart2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function EvalResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const compParam = searchParams.get('comp');

  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(compParam ? 'comparisons' : 'list');
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(compParam);
  
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'list') {
      searchParams.delete('comp');
      setSearchParams(searchParams);
    }
  };

  const handleComparisonSelect = (compId: string) => {
    setSelectedComparisonId(compId);
    setSearchParams({ comp: compId });
  };

  const fetchReports = () => {
    fetch('/api/eval/results')
      .then(res => res.json())
      .then(data => {
          setReports(data.reports || []);
      })
      .catch(console.error);
  };

  const fetchComparisons = () => {
    fetch('/api/eval/comparisons')
      .then(res => res.json())
      .then(data => setComparisons(data.comparisons || []))
      .catch(console.error);
  };

  useEffect(() => {
    if (compParam) {
      setActiveTab('comparisons');
      setSelectedComparisonId(compParam);
    }
  }, [compParam]);

  useEffect(() => {
    fetchReports();
    fetchComparisons();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleReport = (reportId: string) => {
    setSelectedReportIds(prev => {
      const isSelecting = !prev.includes(reportId);
      let newSelected = [];
      if (isSelecting) {
        // check type
        const newReport = reports.find(r => r.id === reportId);
        if (prev.length > 0) {
          const firstSelected = reports.find(r => r.id === prev[0]);
          if (firstSelected && newReport && firstSelected.type !== newReport.type) {
            toast.error('只能勾选相同类别的模型进行对比，比如勾选测评类别为BenchLocal，勾选其他模型测评类别也必须是BenchLocal，不能是IDP');
            return prev;
          }
        }
        newSelected = [...prev, reportId];
      } else {
        newSelected = prev.filter(id => id !== reportId);
      }
      
      return newSelected;
    });
  };

  const handleViewSingleReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReportIds([reportId]);
    setActiveTab('single');
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这份评测报告吗？')) return;
    try {
      const res = await fetch(`/api/eval/results/${encodeURIComponent(reportId)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('报告删除成功');
        setSelectedReportIds(prev => prev.filter(id => id !== reportId));
        fetchReports();
      } else {
        toast.error('删除失败');
      }
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleSaveComparison = async () => {
    if (selectedReportIds.length < 2) {
      toast.error('请至少勾选2个报告进行对比保存');
      return;
    }
    const name = prompt('请输入对比报告名称:', `对比报告 ${new Date().toLocaleString()}`);
    if (!name) return;

    try {
      const res = await fetch('/api/eval/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, report_ids: selectedReportIds })
      });
      if (res.ok) {
        toast.success('对比报告保存成功');
        fetchComparisons();
        setActiveTab('comparisons');
      } else {
        toast.error('保存失败');
      }
    } catch (err) {
      toast.error('保存失败');
    }
  };

  const handleDeleteComparison = async (compId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这份对比报告吗？')) return;
    try {
      const res = await fetch(`/api/eval/comparisons/${encodeURIComponent(compId)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('对比报告删除成功');
        if (selectedComparisonId === compId) setSelectedComparisonId(null);
        fetchComparisons();
      } else {
        toast.error('删除失败');
      }
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const copyToClipboard = (text: string, successMsg: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(successMsg);
      }).catch(() => {
        toast.error('复制失败，请检查浏览器权限');
      });
    } else {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast.success(successMsg);
      } catch (err) {
        toast.error('复制失败，您的浏览器不支持此功能');
      }
    }
  };

  const handleCopyLink = (comp: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = `${window.location.origin}/eval-results?comp=${comp.id}`;
    copyToClipboard(link, '链接已复制到剪贴板！');
  };

  const selectedReports = useMemo(() => {
    return reports.filter(r => selectedReportIds.includes(r.id));
  }, [reports, selectedReportIds]);

  const activeComparisonReports = useMemo(() => {
    if (activeTab === 'multi' || activeTab === 'single') return selectedReports;
    if (activeTab === 'comparisons' && selectedComparisonId) {
      const comp = comparisons.find(c => c.id === selectedComparisonId);
      if (comp) {
        return reports.filter(r => comp.report_ids.includes(r.id));
      }
    }
    return [];
  }, [activeTab, selectedReports, selectedComparisonId, comparisons, reports]);

  const singleReport = selectedReports.length === 1 ? selectedReports[0] : null;

  // Single report radar chart
  const radarOptions = singleReport ? {
    title: { text: '能力评测雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    radar: {
      indicator: singleReport.type === 'IPD' && singleReport.packs.length > 0 
        ? singleReport.packs[0].cases.map((c: any) => ({ name: c.id.split(' - ')[1] || c.id, max: 100 }))
        : singleReport.packs.map((p: any) => ({ name: p.name, max: p.maxScore || 100 })),
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: singleReport.type === 'IPD' && singleReport.packs.length > 0
          ? singleReport.packs[0].cases.map((c: any) => parseFloat(c.score))
          : singleReport.packs.map((p: any) => p.score),
        name: singleReport.model_name,
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      }]
    }]
  } : null;

  // Single report bar chart
  const singleBarOptions = singleReport ? {
    title: { text: singleReport.type === 'IPD' ? '各测评包得分' : '各测评包得分率 (%)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: singleReport.type === 'IPD' && singleReport.packs.length > 0
        ? singleReport.packs[0].cases.map((c: any) => c.id.split(' - ')[1] || c.id)
        : singleReport.packs.map((p: any) => p.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value', ...(singleReport.type === 'IPD' ? {} : { max: 100 }) },
    series: [{
      name: singleReport.type === 'IPD' ? '得分' : '得分率',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: 'top',
        formatter: singleReport.type === 'IPD' ? '{c}' : (params: any) => `${params.data.value}%`,
        color: '#374151',
        fontWeight: 'bold'
      },
      data: singleReport.type === 'IPD' && singleReport.packs.length > 0
        ? singleReport.packs[0].cases.map((c: any) => ({
            value: parseFloat(c.score),
            score: parseFloat(c.score)
          }))
        : singleReport.packs.map((p: any) => ({
            value: p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0,
            score: p.score
          }))
    }]
  } : null;

  // Compare multiple reports bar chart
  const isIpdComparison = activeComparisonReports.length > 0 && activeComparisonReports[0].type === 'IPD';

  const multiRadarOptions = activeComparisonReports.length > 1 ? {
    title: { text: '能力测评对比雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, type: 'scroll', data: activeComparisonReports.map(r => `${r.model_name} (${r.time})`) },
    radar: {
      indicator: isIpdComparison
        ? (activeComparisonReports[0].packs[0]?.cases || []).map((c: any) => ({ name: c.id.split(' - ')[1] || c.id, max: 100 }))
        : Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name)))).map(name => ({ name, max: 100 })),
      radius: '50%'
    },
    series: [{
      type: 'radar',
      data: activeComparisonReports.map(r => ({
        value: isIpdComparison
          ? (r.packs[0]?.cases || []).map((c: any) => parseFloat(c.score))
          : Array.from(new Set(activeComparisonReports.flatMap(rx => rx.packs.map((p: any) => p.name)))).map(packName => {
              const pack = r.packs.find((p: any) => p.name === packName);
              if (!pack) return 0;
              return (pack.maxScore > 0 ? (pack.score / pack.maxScore * 100).toFixed(2) : 0);
            }),
        name: `${r.model_name} (${r.time})`
      }))
    }]
  } : null;

  const compareOptions = activeComparisonReports.length > 1 ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 10, type: 'scroll' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: isIpdComparison
        ? (activeComparisonReports[0].packs[0]?.cases || []).map((c: any) => c.id.split(' - ')[1] || c.id)
        : Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name)))) 
    },
    yAxis: { type: 'value', ...(isIpdComparison ? {} : { max: 100 }) },
    series: activeComparisonReports.map(r => ({
      name: `${r.model_name} (${r.time})`,
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        formatter: isIpdComparison ? '{c}' : '{c}%',
        fontSize: 10,
        color: '#666'
      },
      data: isIpdComparison
        ? (r.packs[0]?.cases || []).map((c: any) => parseFloat(c.score))
        : Array.from(new Set(activeComparisonReports.flatMap(rx => rx.packs.map((p: any) => p.name)))).map(packName => {
            const pack = r.packs.find((p: any) => p.name === packName);
            if (!pack) return 0;
            return (pack.maxScore > 0 ? (pack.score / pack.maxScore * 100).toFixed(2) : 0);
          })
    }))
  } : null;

  const handleExport = () => {
    if (activeComparisonReports.length === 0 && !singleReport) {
      toast.error('没有可导出的数据');
      return;
    }
    const targetReports = activeTab === 'single' ? [singleReport] : activeComparisonReports;
    if (targetReports.length === 1 && targetReports[0]) {
      const report = targetReports[0];
      const blob = new Blob([report.raw_md || JSON.stringify(report, null, 2)], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.id;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } else {
      const blob = new Blob([JSON.stringify(targetReports, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eval_reports_compare_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('批量导出成功，已保存为JSON文件');
    }
  };

  const handleShare = () => {
    if (activeTab === 'comparisons' && selectedComparisonId) {
       const comp = comparisons.find(c => c.id === selectedComparisonId);
       if (comp) handleCopyLink(comp);
       return;
    }
    const targetReports = activeTab === 'single' ? (singleReport ? [singleReport] : []) : activeComparisonReports;
    if (targetReports.length === 0) {
      toast.error('没有可分享的数据');
      return;
    }
    let shareText = '';
    if (targetReports.length === 1) {
       shareText = targetReports[0].raw_md || `【单模型评测报告】\n模型: ${targetReports[0].model_name}\n得分: ${targetReports[0].score}`;
    } else {
       shareText = `【模型横向对比报告】\n` + targetReports.map(r => `- ${r.model_name}: 综合得分 ${r.score}`).join('\n');
    }
    
    copyToClipboard(shareText, '分享内容已复制到剪贴板，可直接粘贴给其他人！');
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="shrink-0 border-gray-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">评测结果总览</h2>
              <p className="text-xs text-gray-500">查看和对比历次大模型自动评测的数据报告</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(activeTab === 'list' || activeTab === 'multi') && selectedReportIds.length > 1 && (
                <Button variant="default" size="sm" className="h-9" onClick={handleSaveComparison}>
                  <Save size={16} className="mr-2" /> 保存对比报告
                </Button>
            )}
            <Button variant="outline" size="sm" className="h-9" onClick={handleShare}>
              {activeTab === 'comparisons' ? <LinkIcon size={16} className="mr-2" /> : <Share2 size={16} className="mr-2" />}
              {activeTab === 'comparisons' ? '复制链接' : '分享报表'}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
              <Download size={16} className="mr-2" /> 导出数据
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full md:w-[600px] grid-cols-4 mb-4 shrink-0">
          <TabsTrigger value="list">测评列表</TabsTrigger>
          <TabsTrigger value="single">单模型测评结果</TabsTrigger>
          <TabsTrigger value="multi">多模型测评对比</TabsTrigger>
          <TabsTrigger value="comparisons">对比报告</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          
          {/* Tab 1: 测评列表 */}
          {activeTab === 'list' && (
            <Card className="h-full border-gray-200 shadow-sm flex flex-col">
              <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-4 shrink-0">
                <CardTitle className="text-md font-semibold flex items-center justify-between">
                  <div>
                    评测历史记录 ({reports.length})
                    <span className="text-xs font-normal text-gray-500 ml-2">勾选并使用右侧操作，或直接点击上方页签进行查看</span>
                  </div>
                  {selectedReportIds.length > 1 && (
                    <Button 
                      size="sm" 
                      onClick={() => setActiveTab('multi')}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                    >
                      <BarChart2 size={14} className="mr-1" />
                      开始横向对比 ({selectedReportIds.length})
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead>模型名称</TableHead>
                      <TableHead>测评类别</TableHead>
                      <TableHead>测评时间</TableHead>
                      <TableHead>综合得分</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow 
                        key={report.id} 
                        className={`cursor-pointer transition-colors ${selectedReportIds.includes(report.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                        onClick={() => handleToggleReport(report.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedReportIds.includes(report.id)} 
                            onCheckedChange={() => handleToggleReport(report.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{report.model_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${report.type === 'IPD' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {report.type === 'IPD' ? 'IDP' : 'BenchLocal'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500">{report.time}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${report.type === 'IPD' ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700'}`}>
                            {`${report.score} (${report.percent}%)`}
                          </span>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50" 
                              onClick={(e) => handleViewSingleReport(report.id, e)}
                              title="查看单模型报告"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:bg-red-50" 
                              onClick={(e) => handleDeleteReport(report.id, e)}
                              title="删除报告"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-12">暂无评测报告</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: 单模型测评结果 */}
          {activeTab === 'single' && (
            <Card className="h-full border-gray-200 shadow-sm flex flex-col min-h-0">
              <CardContent className="p-0 flex flex-col h-full">
                {!singleReport ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p>请在“测评列表”页签勾选1个模型查看单模型结果</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{singleReport.model_name}</h3>
                          <p className="text-sm text-gray-500 mt-1">测试时间: {singleReport.time}</p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${singleReport.type === 'IPD' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            测评类别: {singleReport.type === 'IPD' ? 'IDP' : 'BenchLocal'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600">{singleReport.type === 'IPD' ? singleReport.score : `${singleReport.percent}%`}</div>
                          <p className="text-xs text-gray-500">综合得分 ({singleReport.score})</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">1. 能力测评雷达图</h4>
                        <div className="bg-white rounded-lg border border-gray-100 p-4 h-[400px]">
                          {radarOptions && <ReactECharts option={radarOptions} style={{ height: '100%', width: '100%' }} />}
                        </div>
                      </div>

                      <div className="space-y-4 mt-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">2. 各维度的测评结果柱状图</h4>
                        <div className="bg-white rounded-lg border border-gray-100 p-4 h-[350px]">
                          {singleBarOptions && <ReactECharts option={singleBarOptions} style={{ height: '100%', width: '100%' }} />}
                        </div>
                      </div>

                      {singleReport.type !== 'IPD' && (
                        <div className="space-y-4 mt-8">
                          <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 模型各个维度的测评结果列表</h4>
                          <Table className="border rounded-md bg-white">
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>评测维度 (测试集)</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>得分 / 满分</TableHead>
                                <TableHead>得分率</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {singleReport.packs.map((pack: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium text-gray-700">{pack.name}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'}
                                    </span>
                                  </TableCell>
                                  <TableCell>{`${pack.score} / ${pack.maxScore}`}</TableCell>
                                  <TableCell className="font-semibold text-gray-900">{pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : 0}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="space-y-4 mt-8 pb-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">
                          {singleReport.type !== 'IPD' ? '4. 分项能力详情' : '3. 模型各个维度的测评结果列表'}
                        </h4>
                        {singleReport.packs.map((pack: any, i: number) => (
                          <Card key={i} className="shadow-sm border-gray-200">
                            <CardHeader className="py-3 bg-gray-50/80 border-b">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-sm font-semibold">{pack.name}</CardTitle>
                                <span className={`text-xs font-mono px-2 py-1 rounded ${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'} 
                                  {singleReport.type !== 'IPD' && ` | ${pack.score}/${pack.maxScore}`}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[180px]">{singleReport.type !== 'IPD' ? '用例 ID' : '评测维度'}</TableHead>
                                    <TableHead className="w-[80px]">状态</TableHead>
                                    <TableHead className="w-[100px]">得分</TableHead>
                                    <TableHead>失败原因 / 备注</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pack.cases.map((c: any, j: number) => (
                                    <TableRow key={j}>
                                      <TableCell className="font-mono text-xs">{c.id}</TableCell>
                                      <TableCell>{c.pass ? '✅ 通关' : '❌ 失败'}</TableCell>
                                      <TableCell className="text-xs font-medium">{c.score}</TableCell>
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
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 3: 多模型测评对比 */}
          {activeTab === 'multi' && (
            <Card className="h-full border-gray-200 shadow-sm flex flex-col min-h-0">
              <CardContent className="p-0 flex flex-col h-full">
                {activeComparisonReports.length < 2 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p>请在“测评列表”页签勾选多个相同类别的模型进行横向对比</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="p-6 h-full flex flex-col">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                          模型横向对比 ({activeComparisonReports.length}款)
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          对比类别: {activeComparisonReports[0].type === 'IPD' ? 'IDP' : 'BenchLocal'}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">1. 模型综合评分对比</h4>
                        <Table className="border rounded-md bg-white">
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead>模型名称</TableHead>
                              <TableHead>测试时间</TableHead>
                              <TableHead>总得分</TableHead>
                              {activeComparisonReports[0].type !== 'IPD' && <TableHead>综合胜率</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeComparisonReports.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{r.model_name}</TableCell>
                                <TableCell className="text-gray-500">{r.time}</TableCell>
                                <TableCell>{r.score}</TableCell>
                                {r.type !== 'IPD' && <TableCell className="font-bold text-blue-600">{r.percent}%</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="space-y-4 mt-8">
                            <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">2. 模型各维度的对比</h4>
                            <div className="overflow-x-auto pb-4">
                              <Table className="border rounded-md bg-white whitespace-nowrap">
                                <TableHeader className="bg-gray-50">
                                  <TableRow>
                                    <TableHead className="min-w-[150px]">评测维度 (测试集)</TableHead>
                                    {activeComparisonReports.map((r, i) => (
                                      <TableHead key={i}>{r.model_name}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(activeComparisonReports[0]?.type === 'IPD'
                                    ? (activeComparisonReports[0].packs[0]?.cases || []).map((c: any) => c.id.split(' - ')[1] || c.id)
                                    : Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name))))
                                  ).map((rowName, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium text-gray-700">{rowName as string}</TableCell>
                                      {activeComparisonReports.map((r, j) => {
                                        const isIpd = r.type === 'IPD';
                                        if (isIpd) {
                                          const caseItem = (r.packs[0]?.cases || []).find((c: any) => (c.id.split(' - ')[1] || c.id) === rowName);
                                          if (!caseItem) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                          return (
                                            <TableCell key={j}>
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{parseFloat(caseItem.score)}</span>
                                              </div>
                                            </TableCell>
                                          );
                                        } else {
                                          const pack = r.packs.find((p: any) => p.name === rowName);
                                          if (!pack) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                          const pct = pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : '0.00';
                                          return (
                                            <TableCell key={j}>
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{pct + '%'}</span>
                                                <span className="text-xs text-gray-500">{pack.score} / {pack.maxScore}</span>
                                              </div>
                                            </TableCell>
                                          );
                                        }
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          <div className="space-y-4 mt-8">
                            <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 能力测评对比雷达图</h4>
                            <div className="h-[450px] w-full border rounded-md p-4 bg-white mt-2">
                              {multiRadarOptions && <ReactECharts option={multiRadarOptions} style={{ height: '100%', width: '100%' }} />}
                            </div>
                          </div>

                          <div className="space-y-4 mt-8 pb-8">
                            <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">4. {activeComparisonReports[0]?.type === 'IPD' ? '各维度得分对比图' : '各维度得分率对比图'}</h4>
                            <div className="h-[450px] w-full border rounded-md p-4 bg-white mt-2">
                              {compareOptions && <ReactECharts option={compareOptions} style={{ height: '100%', width: '100%' }} />}
                            </div>
                          </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 4: 对比报告 (Saved Comparisons) */}
          {activeTab === 'comparisons' && (
            <div className="flex flex-col md:flex-row gap-4 h-full">
              <Card className="w-full md:w-[350px] shrink-0 border-gray-200 shadow-sm flex flex-col min-h-0">
                <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-3 shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    已保存的对比 ({comparisons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto flex-1">
                  <div className="divide-y divide-gray-100">
                    {comparisons.map((comp) => (
                      <div 
                        key={comp.id} 
                        className={`p-3 hover:bg-blue-50/50 transition-colors flex items-start gap-3 group cursor-pointer ${selectedComparisonId === comp.id ? 'bg-blue-50/50 border-l-2 border-blue-500' : ''}`}
                        onClick={() => handleComparisonSelect(comp.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">{comp.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500">{new Date(comp.created_at).toLocaleString()}</span>
                            <span className="text-[10px] text-blue-600 bg-blue-100 px-1 rounded">{comp.report_ids.length} 款模型</span>
                          </div>
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-500" 
                              onClick={(e) => handleCopyLink(comp, e)}
                              title="复制分享链接"
                          >
                              <LinkIcon size={16} />
                          </Button>
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500" 
                              onClick={(e) => handleDeleteComparison(comp.id, e)}
                              title="删除对比"
                          >
                              <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {comparisons.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-sm">暂无保存的对比报告</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 border-gray-200 shadow-sm flex flex-col min-h-0">
                <CardContent className="p-0 flex flex-col h-full">
                  {!selectedComparisonId || activeComparisonReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p>请选择一个对比报告查看详情</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="p-6 h-full flex flex-col">
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-gray-800">
                            {comparisons.find(c => c.id === selectedComparisonId)?.name}
                          </h3>
                          <p className="text-sm text-gray-500">对比多个大模型在各个维度的表现</p>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">1. 模型综合评分对比</h4>
                          <Table className="border rounded-md bg-white">
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>模型名称</TableHead>
                                <TableHead>测试时间</TableHead>
                                <TableHead>总得分</TableHead>
                                {activeComparisonReports[0]?.type !== 'IPD' && <TableHead>综合胜率</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeComparisonReports.map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{r.model_name}</TableCell>
                                  <TableCell className="text-gray-500">{r.time}</TableCell>
                                  <TableCell>{r.score}</TableCell>
                                  {r.type !== 'IPD' && <TableCell className="font-bold text-blue-600">{r.percent}%</TableCell>}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-4 mt-8">
                              <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">2. 模型各维度的对比</h4>
                              <div className="overflow-x-auto pb-4">
                                <Table className="border rounded-md bg-white whitespace-nowrap">
                                  <TableHeader className="bg-gray-50">
                                    <TableRow>
                                      <TableHead className="min-w-[150px]">评测维度 (测试集)</TableHead>
                                      {activeComparisonReports.map((r, i) => (
                                        <TableHead key={i}>{r.model_name}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(activeComparisonReports[0]?.type === 'IPD'
                                      ? (activeComparisonReports[0].packs[0]?.cases || []).map((c: any) => c.id.split(' - ')[1] || c.id)
                                      : Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name))))
                                    ).map((rowName, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="font-medium text-gray-700">{rowName as string}</TableCell>
                                        {activeComparisonReports.map((r, j) => {
                                          const isIpd = r.type === 'IPD';
                                          if (isIpd) {
                                            const caseItem = (r.packs[0]?.cases || []).find((c: any) => (c.id.split(' - ')[1] || c.id) === rowName);
                                            if (!caseItem) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                            return (
                                              <TableCell key={j}>
                                                <div className="flex flex-col">
                                                  <span className="font-semibold text-gray-900">{parseFloat(caseItem.score)}</span>
                                                </div>
                                              </TableCell>
                                            );
                                          } else {
                                            const pack = r.packs.find((p: any) => p.name === rowName);
                                            if (!pack) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                            const pct = pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : '0.00';
                                            return (
                                              <TableCell key={j}>
                                                <div className="flex flex-col">
                                                  <span className="font-semibold text-gray-900">{pct + '%'}</span>
                                                  <span className="text-xs text-gray-500">{pack.score} / {pack.maxScore}</span>
                                                </div>
                                              </TableCell>
                                            );
                                          }
                                        })}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="space-y-4 mt-8">
                              <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 能力测评对比雷达图</h4>
                              <div className="h-[450px] w-full border rounded-md p-4 bg-white mt-2">
                                {multiRadarOptions && <ReactECharts option={multiRadarOptions} style={{ height: '100%', width: '100%' }} />}
                              </div>
                            </div>

                            <div className="space-y-4 mt-8 pb-8">
                              <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">4. {activeComparisonReports[0]?.type === 'IPD' ? '各维度得分对比图' : '各维度得分率对比图'}</h4>
                              <div className="h-[450px] w-full border rounded-md p-4 bg-white mt-2">
                                {compareOptions && <ReactECharts option={compareOptions} style={{ height: '100%', width: '100%' }} />}
                              </div>
                            </div>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </Tabs>
    </div>
  );
}
