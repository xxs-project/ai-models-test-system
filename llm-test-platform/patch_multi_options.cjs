const fs = require('fs');

let content = fs.readFileSync('src/pages/EvalResults.tsx', 'utf-8');

// Fix multiRadarOptions
content = content.replace(
  `  const multiRadarOptions = activeComparisonReports.length > 1 ? {
    title: { text: '能力测评对比雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, type: 'scroll', data: activeComparisonReports.map(r => \`\${r.model_name} (\${r.time})\`) },
    radar: {
      indicator: Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name)))).map(name => {
        let max = 100;
        if (isIpdComparison) {
           const packs = activeComparisonReports.flatMap(r => r.packs).filter((p: any) => p.name === name);
           max = Math.max(...packs.map((p: any) => p.score), 10);
        }
        return { name, max: isIpdComparison ? max : 100 };
      }),
      radius: '50%'
    },
    series: [{
      type: 'radar',
      data: activeComparisonReports.map(r => ({
        value: Array.from(new Set(activeComparisonReports.flatMap(rx => rx.packs.map((p: any) => p.name)))).map(packName => {
          const pack = r.packs.find((p: any) => p.name === packName);
          if (!pack) return 0;
          return isIpdComparison ? pack.score : (pack.maxScore > 0 ? (pack.score / pack.maxScore * 100).toFixed(2) : 0);
        }),
        name: \`\${r.model_name} (\${r.time})\`
      }))
    }]
  } : null;`,
  `  const multiRadarOptions = activeComparisonReports.length > 1 ? {
    title: { text: '能力测评对比雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, type: 'scroll', data: activeComparisonReports.map(r => \`\${r.model_name} (\${r.time})\`) },
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
        name: \`\${r.model_name} (\${r.time})\`
      }))
    }]
  } : null;`
);

// Fix compareOptions
content = content.replace(
  `  const compareOptions = activeComparisonReports.length > 1 ? {
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
  } : null;`,
  `  const compareOptions = activeComparisonReports.length > 1 ? {
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
      name: \`\${r.model_name} (\${r.time})\`,
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
  } : null;`
);

fs.writeFileSync('src/pages/EvalResults.tsx', content);
