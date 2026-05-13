const fs = require('fs');
let code = fs.readFileSync('src/pages/Board.tsx', 'utf8');

const oldGetPackScore = `  const getPackScore = (report: any, packName: string) => {
    const pack = report.packs.find((p: any) => p.name === packName)
    return pack ? pack.score : '-'
  }`;
const newGetPackScore = `  const getPackScore = (report: any, packName: string) => {
    const pack = report.packs.find((p: any) => p.name && p.name.includes(packName))
    return pack ? pack.score : '-'
  }`;
code = code.replace(oldGetPackScore, newGetPackScore);

const oldSortPackScore = `const packA = a.packs.find((p: any) => p.name === sortConfig.key || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))
        const packB = b.packs.find((p: any) => p.name === sortConfig.key || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))`;
const newSortPackScore = `const packA = a.packs.find((p: any) => (p.name && p.name.includes(sortConfig.key)) || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))
        const packB = b.packs.find((p: any) => (p.name && p.name.includes(sortConfig.key)) || (activeTab === 'IPD' && p.cases && p.cases.some((c: any) => c.id.includes(sortConfig.key))))`;
code = code.replace(oldSortPackScore, newSortPackScore);

fs.writeFileSync('src/pages/Board.tsx', code);
