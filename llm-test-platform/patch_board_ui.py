import os

file_path = "../../src/pages/Board.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adjust ButtonGroup padding and gap
old_bg = 'className="flex flex-col gap-4 py-5 border-b border-slate-200 border-dashed last:border-0 relative"'
new_bg = 'className="flex flex-col gap-3 py-3 border-b border-slate-200 border-dashed last:border-0 relative"'
content = content.replace(old_bg, new_bg)

# 2. Adjust CardContent padding in PerfDragonTigerBoard
old_cc = '<CardContent className="p-6 bg-slate-50/30">'
new_cc = '<CardContent className="p-4 sm:p-5 bg-slate-50/30">'
content = content.replace(old_cc, new_cc)

# 3. Adjust Reset Button location and style
old_reset = """          <div className="pt-4 flex justify-end">
            <Button variant="outline" className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0" onClick={() => {
              setScenario(''); setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
            }}>重置条件</Button>
          </div>
        </CardContent>
      </Card>"""

new_reset = """        </CardContent>
        <div className="bg-slate-50/80 border-t border-slate-200 p-3 sm:p-4 flex justify-center">
          <Button variant="outline" className="min-w-[120px] bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={() => {
            setScenario(''); setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
          }}>
            重置条件
          </Button>
        </div>
      </Card>"""

content = content.replace(old_reset, new_reset)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")