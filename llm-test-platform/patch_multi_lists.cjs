const fs = require('fs');

let content = fs.readFileSync('src/pages/EvalResults.tsx', 'utf-8');

// Replace the table building logic for the multi comparison view (activeTab === 'multi')
content = content.replace(
  `                                <TableBody>
                                  {Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name)))).map((packName, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium text-gray-700">{packName as string}</TableCell>
                                      {activeComparisonReports.map((r, j) => {
                                        const pack = r.packs.find((p: any) => p.name === packName);
                                        if (!pack) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                        const pct = pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : '0.00';
                                        const isIpd = activeComparisonReports[0]?.type === 'IPD';
                                        return (
                                          <TableCell key={j}>
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-gray-900">{isIpd ? pack.score : pct + '%'}</span>
                                              {!isIpd && <span className="text-xs text-gray-500">{pack.score} / {pack.maxScore}</span>}
                                            </div>
                                          </TableCell>
                                        );
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>`,
  `                                <TableBody>
                                  {(activeComparisonReports[0]?.type === 'IPD'
                                    ? (activeComparisonReports[0].packs[0]?.cases || []).map((c: any) => c.id.split(' - ')[1] || c.id)
                                    : Array.from(new Set(activeComparisonReports.flatMap(r => r.packs.map((p: any) => p.name))))
                                  ).map((rowName, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium text-gray-700">{rowName as string}</TableCell>
                                      {activeComparisonReports.map((r, j) => {
                                        const isIpd = r.type === 'IPD';
                                        if (isIpd) {
                                          const caseItem = (r.packs[0]?.cases || []).find((c: any) => (c.id.split(' - ')[1] || c.id) === rowName);
                                          if (!caseItem) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                          return (
                                            <TableCell key={j}>
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{parseFloat(caseItem.score)}</span>
                                              </div>
                                            </TableCell>
                                          );
                                        } else {
                                          const pack = r.packs.find((p: any) => p.name === rowName);
                                          if (!pack) return <TableCell key={j} className="text-gray-400">-</TableCell>;
                                          const pct = pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : '0.00';
                                          return (
                                            <TableCell key={j}>
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{pct + '%'}</span>
                                                <span className="text-xs text-gray-500">{pack.score} / {pack.maxScore}</span>
                                              </div>
                                            </TableCell>
                                          );
                                        }
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>`
);

fs.writeFileSync('src/pages/EvalResults.tsx', content);
