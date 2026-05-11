with open("src/pages/EvalResults.tsx", "r") as f:
    content = f.read()

old_series = """    series: [{
      name: '得分率',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      data: singleReport.packs.map((p: any) => p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0)
    }]"""

new_series = """    series: [{
      name: '得分率',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => `${params.data.score}分`,
        color: '#374151',
        fontWeight: 'bold'
      },
      data: singleReport.packs.map((p: any) => ({
        value: p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0,
        score: p.score
      }))
    }]"""

content = content.replace(old_series, new_series)

with open("src/pages/EvalResults.tsx", "w") as f:
    f.write(content)
