import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

import re
pattern = r'<TabsList[^>]*>[\s\S]*?</TabsList>'
replacement = """<TabsList className="mb-6 bg-slate-100/80 p-1 w-full sm:w-auto inline-flex flex-wrap h-auto">
          <TabsTrigger value="eval-ladder" className="flex-1 sm:flex-none px-6 py-2">测评天梯榜</TabsTrigger>
          <TabsTrigger value="perf-dragon" className="flex-1 sm:flex-none px-6 py-2">性能龙虎榜</TabsTrigger>
          <TabsTrigger value="eval" className="flex-1 sm:flex-none px-6 py-2">测评榜单</TabsTrigger>
          <TabsTrigger value="perf" className="flex-1 sm:flex-none px-6 py-2">性能榜单</TabsTrigger>
          <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6 py-2">交互跑分面板</TabsTrigger>
        </TabsList>"""

content = re.sub(pattern, replacement, content)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Tabs fixed.")
