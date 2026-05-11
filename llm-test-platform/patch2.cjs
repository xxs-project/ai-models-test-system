const fs = require('fs');
let code = fs.readFileSync('src/pages/EvalResults.tsx', 'utf8');

code = code.replace(
  /\{activeComparisonReports\[0\]\.type !== 'IPD' && \(\s*<>\s*(<div className="space-y-4 mt-8">)/g,
  `$1`
);
code = code.replace(
  /\{activeComparisonReports\[0\]\?\.type !== 'IPD' && \(\s*<>\s*(<div className="space-y-4 mt-8">)/g,
  `$1`
);

code = code.replace(
  /const pct = pack\.maxScore > 0 \? \(\(pack\.score \/ pack\.maxScore\) \* 100\)\.toFixed\(2\) : '0\.00';/g,
  `const pct = pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : '0.00';
                                        const isIpd = activeComparisonReports[0]?.type === 'IPD';`
);

code = code.replace(
  /<span className="font-semibold text-gray-900">\{pct\}%<\/span>/g,
  `<span className="font-semibold text-gray-900">{isIpd ? pack.score : \`\${pct}%\`}</span>`
);

code = code.replace(
  /<span className="text-xs text-gray-500">\{pack\.score\} \/ \{pack\.maxScore\}<\/span>/g,
  `{!isIpd && <span className="text-xs text-gray-500">{pack.score} / {pack.maxScore}</span>}`
);

code = code.replace(
  /<h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3\. 各维度得分率对比图<\/h4>/g,
  `<h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. {activeComparisonReports[0]?.type === 'IPD' ? '各维度得分对比图' : '各维度得分率对比图'}</h4>`
);

// We need to fix the closing tags that we opened with <> in the original code, but we removed the `{condition && (<>`
// The original had `</>\n                      )}`
code = code.replace(
  /<\/div>\n\s*<\/>\n\s*\)}/g,
  `</div>`
);


fs.writeFileSync('src/pages/EvalResults.tsx', code);
