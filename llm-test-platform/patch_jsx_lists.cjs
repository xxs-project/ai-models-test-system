const fs = require('fs');

let content = fs.readFileSync('src/pages/EvalResults.tsx', 'utf-8');

// Fix the single report lists section
content = content.replace(
  `                      <div className="space-y-4 mt-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 模型各个维度的测评结果列表</h4>
                        <Table className="border rounded-md bg-white">
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead>评测维度 (测试集)</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>{singleReport.type === 'IPD' ? '得分' : '得分 / 满分'}</TableHead>
                              {singleReport.type !== 'IPD' && <TableHead>得分率</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {singleReport.packs.map((pack: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium text-gray-700">{pack.name}</TableCell>
                                <TableCell>
                                  <span className={\`px-2 py-1 rounded text-xs font-medium \${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                    {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'}
                                  </span>
                                </TableCell>
                                <TableCell>{singleReport.type === 'IPD' ? pack.score : \`\${pack.score} / \${pack.maxScore}\`}</TableCell>
                                {singleReport.type !== 'IPD' && <TableCell className="font-semibold text-gray-900">{pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : 0}%</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="space-y-4 mt-8 pb-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">
                          {singleReport.type !== 'IPD' ? '4. 分项能力详情' : '模型各个维度的测评结果列表'}
                        </h4>`,
  `                      {singleReport.type !== 'IPD' && (
                        <div className="space-y-4 mt-8">
                          <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">3. 模型各个维度的测评结果列表</h4>
                          <Table className="border rounded-md bg-white">
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>评测维度 (测试集)</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>得分 / 满分</TableHead>
                                <TableHead>得分率</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {singleReport.packs.map((pack: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium text-gray-700">{pack.name}</TableCell>
                                  <TableCell>
                                    <span className={\`px-2 py-1 rounded text-xs font-medium \${pack.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                      {pack.status === 'SUCCESS' ? '✅ 完成' : '❌ 失败'}
                                    </span>
                                  </TableCell>
                                  <TableCell>{\`\${pack.score} / \${pack.maxScore}\`}</TableCell>
                                  <TableCell className="font-semibold text-gray-900">{pack.maxScore > 0 ? ((pack.score / pack.maxScore) * 100).toFixed(2) : 0}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="space-y-4 mt-8 pb-8">
                        <h4 className="font-bold text-md text-gray-800 border-l-4 border-blue-500 pl-2">
                          {singleReport.type !== 'IPD' ? '4. 分项能力详情' : '3. 模型各个维度的测评结果列表'}
                        </h4>`
);

fs.writeFileSync('src/pages/EvalResults.tsx', content);
