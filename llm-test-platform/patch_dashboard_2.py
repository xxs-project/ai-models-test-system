import os

file_path = "../../src/pages/Board.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract ButtonGroup
button_group_def = """  const ButtonGroup = ({ label, options, value, onChange, isMulti = false, optionLabels }: any) => {
    if (!options || options.length === 0) return null;
    return (
      <div className="flex flex-col gap-4 py-5 border-b border-slate-200 border-dashed last:border-0 relative">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-blue-400 rounded-full"></div>
          <Label className="text-sm font-bold text-slate-700">{label}</Label>
        </div>
        <div className="flex flex-wrap gap-3 pl-3">
          {options.map((opt: string) => {
            const isSelected = isMulti ? value.includes(opt) : value === opt;
            const displayLabel = optionLabels ? (optionLabels[opt] || opt) : opt;
            return (
              <button
                key={opt}
                title={displayLabel}
                onClick={() => {
                  if (isMulti) {
                    onChange(isSelected ? value.filter((v: string) => v !== opt) : [...value, opt])
                  } else {
                    onChange(isSelected ? '' : opt)
                  }
                }}
                className={`w-[150px] px-3 py-2 rounded-xl text-sm font-medium transition-all truncate ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {displayLabel}
              </button>
            )
          })}
        </div>
      </div>
    )
  }"""

# Check if ButtonGroup is in PerfDragonTigerBoard
perf_start = content.find("function PerfDragonTigerBoard()")
if perf_start != -1:
    bg_idx = content.find(button_group_def, perf_start)
    if bg_idx != -1:
        # Remove it from inside PerfDragonTigerBoard
        content = content[:bg_idx] + content[bg_idx + len(button_group_def):]
        # Insert it before PerfDragonTigerBoard
        content = content[:perf_start] + button_group_def + "\n\n" + content[perf_start:]
    else:
        print("Could not find ButtonGroup exactly as defined.")
else:
    print("Could not find PerfDragonTigerBoard.")

# 2. Move "重置所有条件" and rename to "重置条件"
old_reset_button = """          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800" onClick={() => {
            setScenario(''); setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
          }}>重置所有条件</Button>"""

new_reset_button = """          <div className="pt-4 flex justify-end">
            <Button variant="outline" className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0" onClick={() => {
              setScenario(''); setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
            }}>重置条件</Button>
          </div>"""

# Remove old button from header
content = content.replace(old_reset_button, "")

# Insert new button after the last ButtonGroup
last_button_group = """<ButtonGroup label="特性列表" options={featuresOptions} value={features} onChange={setFeatures} isMulti={true} />"""

content = content.replace(last_button_group, last_button_group + "\n" + new_reset_button)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")