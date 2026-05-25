import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

old_button = """<button
                key={opt}
                onClick={() => {
                  if (isMulti) {
                    onChange(isSelected ? value.filter((v: string) => v !== opt) : [...value, opt])
                  } else {
                    onChange(isSelected ? '' : opt)
                  }
                }}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {displayLabel}
              </button>"""

new_button = """<button
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
              </button>"""

content = content.replace(old_button, new_button)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Button Group patched.")
