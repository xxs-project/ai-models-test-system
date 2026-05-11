with open("src/pages/EvalResults.tsx", "r") as f:
    content = f.read()

single_bar_opts = """
  // Single report bar chart
  const singleBarOptions = singleReport ? {
    title: { text: '各测评包得分率 (%)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: singleReport.packs.map((p: any) => p.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value', max: 100 },
    series: [{
      name: '得分率',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      data: singleReport.packs.map((p: any) => p.maxScore > 0 ? (p.score / p.maxScore * 100).toFixed(2) : 0)
    }]
  } : null;
"""

content = content.replace("  // Compare multiple reports bar chart", single_bar_opts + "\n  // Compare multiple reports bar chart")

old_jsx = """                  <div className="h-[300px] w-full">
                    {radarOptions && <ReactECharts option={radarOptions} style={{ height: '100%', width: '100%' }} />}
                  </div>"""

new_jsx = """                  <div className="flex flex-col lg:flex-row h-[350px] w-full gap-4">
                    <div className="flex-1 bg-white rounded-lg border border-gray-100 p-2">
                      {radarOptions && <ReactECharts option={radarOptions} style={{ height: '100%', width: '100%' }} />}
                    </div>
                    <div className="flex-1 bg-white rounded-lg border border-gray-100 p-2">
                      {singleBarOptions && <ReactECharts option={singleBarOptions} style={{ height: '100%', width: '100%' }} />}
                    </div>
                  </div>"""

content = content.replace(old_jsx, new_jsx)

with open("src/pages/EvalResults.tsx", "w") as f:
    f.write(content)
