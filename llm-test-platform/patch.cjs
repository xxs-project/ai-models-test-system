const fs = require('fs');
let code = fs.readFileSync('src/pages/EvalResults.tsx', 'utf8');

// Replace compareOptions
code = code.replace(
  /const compareOptions = activeComparisonReports\.length > 1 \? \{[\s\S]*?\} : null;/g,
  `const isIpdComparison = activeComparisonReports.length > 0 && activeComparisonReports[0].type === 'IPD';

  const compareOptions = activeComparisonReports.length > 1 ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 10, type: 'scroll' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name)))) 
    },
    yAxis: { type: 'value', ...(isIpdComparison ? {} : { max: 100 }) },
    series: activeComparisonReports.map(r => ({
      name: \`\${r.model_name} (\${r.time})\`,
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        formatter: isIpdComparison ? '{c}' : '{c}%',
        fontSize: 10,
        color: '#666'
      },
      data: Array.from(new Set(activeComparisonReports.flatMap(rx => rx.packs.map((p: any) => p.name)))).map(packName => {
        const pack = r.packs.find((p: any) => p.name === packName);
        if (!pack) return 0;
        return isIpdComparison ? pack.score : (pack.maxScore > 0 ? (pack.score / pack.maxScore * 100).toFixed(2) : 0);
      })
    }))
  } : null;`
);

fs.writeFileSync('src/pages/EvalResults.tsx', code);
