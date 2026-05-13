const fs = require('fs');
const glob = require('glob'); // Not available? We can just manually list files.

const files = [
  'src/lib/utils.ts',
  'src/components/MultiVersionTrendCharts.tsx',
  'src/components/BenchmarkViewOnlyDialog.tsx',
  'src/components/BenchmarkDetailDialog.tsx',
  'src/components/ComparisonPanel.tsx',
  'src/components/PerformanceTrendCharts.tsx' // Add this just in case
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Rename function
  content = content.replace(/parseGpuCount/g, 'parseCardCount');
  
  // 2. Rename variables 
  content = content.replace(/gpuCount/g, 'cardCount');
  content = content.replace(/gpuCount1/g, 'cardCount1');
  content = content.replace(/gpuCount2/g, 'cardCount2');
  content = content.replace(/displayGpuCount/g, 'displayCardCount');
  content = content.replace(/tpsPerGpu/g, 'tpsPerCard');
  
  fs.writeFileSync(file, content);
}
console.log("Renamed parseGpuCount -> parseCardCount and related variables.");
