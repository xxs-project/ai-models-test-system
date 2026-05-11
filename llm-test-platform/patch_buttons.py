with open("src/pages/EvalResults.tsx", "r") as f:
    content = f.read()

# 1. Import toast
if "import { toast }" not in content:
    content = content.replace("import { Search, Download, Share2, Info, Bug, Terminal, Code, Layers } from 'lucide-react';", 
    "import { Search, Download, Share2, Info, Bug, Terminal, Code, Layers } from 'lucide-react';\nimport { toast } from 'sonner';")

# 2. Add handleShare and handleExport functions inside EvalResults component
funcs = """
  const handleExport = () => {
    if (selectedReports.length === 0) {
      toast.error('请先勾选需要导出的报告');
      return;
    }
    if (selectedReports.length === 1) {
      const report = selectedReports[0];
      const blob = new Blob([report.raw_md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.id;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('导出成功，已保存为Markdown文件');
    } else {
      const blob = new Blob([JSON.stringify(selectedReports, null, 2)], { type: 'application/json;charset=utf-8' });
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
    if (selectedReports.length === 0) {
      toast.error('请先勾选需要分享的报告');
      return;
    }
    let shareText = '';
    if (selectedReports.length === 1) {
       shareText = selectedReports[0].raw_md;
    } else {
       shareText = `【模型横向对比报告】\\n` + selectedReports.map(r => `- ${r.model_name}: 综合胜率 ${r.percent}% (${r.score})`).join('\\n');
    }
    
    navigator.clipboard.writeText(shareText).then(() => {
      toast.success('分享内容已复制到剪贴板，可直接粘贴给其他人！');
    }).catch(() => {
      toast.error('复制失败，请检查浏览器权限');
    });
  };

  return ("""

content = content.replace("  return (", funcs)

# 3. Attach onClick handlers to the buttons
old_buttons = """          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9"><Share2 size={16} className="mr-2" /> 分享报表</Button>
            <Button variant="outline" size="sm" className="h-9"><Download size={16} className="mr-2" /> 导出数据</Button>
          </div>"""

new_buttons = """          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={handleShare}><Share2 size={16} className="mr-2" /> 分享报表</Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExport}><Download size={16} className="mr-2" /> 导出数据</Button>
          </div>"""

content = content.replace(old_buttons, new_buttons)

with open("src/pages/EvalResults.tsx", "w") as f:
    f.write(content)
