const fs = require('fs');

let content = fs.readFileSync('src/pages/EvalResults.tsx', 'utf-8');

// Fix radarOptions
content = content.replace(
  `  const radarOptions = singleReport ? {
    title: { text: '能力评测雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    radar: {
      indicator: singleReport.packs.map((p: any) => ({ 
        name: p.name, 
        max: singleReport.type === 'IPD' ? Math.max(...singleReport.packs.map((px: any) => px.score), 10) : (p.maxScore || 100) 
      })),
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
  } : null;`,
  `  const radarOptions = singleReport ? {
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
  } : null;`
);

// Fix singleBarOptions
content = content.replace(
  `  const singleBarOptions = singleReport ? {
    title: { text: singleReport.type === 'IPD' ? '各测评包得分' : '各测评包得分率 (%)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: singleReport.packs.map((p: any) => p.name),
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
        formatter: singleReport.type === 'IPD' ? '{c}' : (params: any) => \`\${params.data.value}%\`,
        color: '#374151',
        fontWeight: 'bold'
      },
      data: singleReport.packs.map((p: any) => ({
        value: singleReport.type === 'IPD' ? p.score : (p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0),
        score: p.score
      }))
    }]
  } : null;`,
  `  const singleBarOptions = singleReport ? {
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
        formatter: singleReport.type === 'IPD' ? '{c}' : (params: any) => \`\${params.data.value}%\`,
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
  } : null;`
);

fs.writeFileSync('src/pages/EvalResults.tsx', content);
