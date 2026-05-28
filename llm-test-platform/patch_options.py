import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

old_opt = "Array.from(new Set(benchmarks.map(b => b.config.scenario).filter(Boolean)))"
new_opt = "Array.from(new Set([...benchmarks.map(b => b.config.scenario), '对话', 'Agent', 'AI Coding', 'Openclaw', '文档写作', '通用'].filter(Boolean)))"

content = content.replace(old_opt, new_opt)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Options patched.")
