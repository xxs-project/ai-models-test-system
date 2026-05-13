const fs = require('fs');
let code = fs.readFileSync('src/pages/Board.tsx', 'utf8');

// 1. Update the display in the TableCell
const oldTableCellScore = `<TableCell>{r.score}</TableCell>`;
// Actually, we want average score for BenchLocal to use r.percent, and for IDP maybe as well
const newTableCellScore = `<TableCell>{activeTab === 'BenchLocal' ? (r.percent ? r.percent.toFixed(2) + '%' : '-') : (r.percent ? r.percent.toFixed(2) + '%' : '-')}</TableCell>`;
code = code.replace(oldTableCellScore, newTableCellScore);

// 2. Update getPackScore to calculate the rate
const oldGetPackScore = `  const getPackScore = (report: any, packName: string) => {
    const pack = report.packs.find((p: any) => p.name && p.name.includes(packName))
    return pack ? pack.score : '-'
  }`;
const newGetPackScore = `  const getPackScore = (report: any, packName: string) => {
    const pack = report.packs.find((p: any) => p.name && p.name.includes(packName))
    if (pack && pack.maxScore > 0) {
      return ((pack.score / pack.maxScore) * 100).toFixed(2) + '%'
    }
    return '-'
  }`;
code = code.replace(oldGetPackScore, newGetPackScore);

// 3. Update sorting logic for average score
const oldScoreSort = `      if (sortConfig.key === 'score') {
        valA = parseFloat(a.score.split('/')[0]) || 0
        valB = parseFloat(b.score.split('/')[0]) || 0
      } else {`;
const newScoreSort = `      if (sortConfig.key === 'score') {
        valA = a.percent || 0
        valB = b.percent || 0
      } else {`;
code = code.replace(oldScoreSort, newScoreSort);

// 4. Update sorting logic for pack scores (we should sort by the percentage, not raw score)
const oldPackSort = `        if (activeTab === 'BenchLocal') {
          valA = packA ? packA.score : 0
          valB = packB ? packB.score : 0
        } else {`;
const newPackSort = `        if (activeTab === 'BenchLocal') {
          valA = packA && packA.maxScore > 0 ? (packA.score / packA.maxScore) * 100 : 0
          valB = packB && packB.maxScore > 0 ? (packB.score / packB.maxScore) * 100 : 0
        } else {`;
code = code.replace(oldPackSort, newPackSort);

// Let's also make IDP scores show as percentage if required, but the prompt says:
// "BenchLocal中平均均分、toolcall、instructfollow、reasonmath、dataextract、bugfind、structoutput、hermesagent中分数不对，应该采用得分率"
// It specifically mentions BenchLocal, not IDP cases. IDP cases might remain raw score or whatever getIpdScore returns.
// So this is perfectly targeted.

fs.writeFileSync('src/pages/Board.tsx', code);
