const fs = require('fs');
let code = fs.readFileSync('src/pages/EvalResults.tsx', 'utf8');

code = code.replace(
  /                          <\/div>\n\n                      <div className="space-y-4 mt-8 pb-8">/g,
  `                          </div>
                        </>
                      )}

                      <div className="space-y-4 mt-8 pb-8">`
);

fs.writeFileSync('src/pages/EvalResults.tsx', code);
