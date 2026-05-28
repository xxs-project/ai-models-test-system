import os

file_path = "../../src/pages/Board.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rename 测评榜单 -> 测评总榜单
content = content.replace(
    '<TabsTrigger value="eval" className="flex-1 sm:flex-none px-6 py-2">测评榜单</TabsTrigger>',
    '<TabsTrigger value="eval" className="flex-1 sm:flex-none px-6 py-2">测评总榜单</TabsTrigger>'
)

# 2. Rename 性能榜单 -> 性能总榜单
content = content.replace(
    '<TabsTrigger value="perf" className="flex-1 sm:flex-none px-6 py-2">性能榜单</TabsTrigger>',
    '<TabsTrigger value="perf" className="flex-1 sm:flex-none px-6 py-2">性能总榜单</TabsTrigger>'
)

# 3. Comment out 交互跑分面板 TabsTrigger
content = content.replace(
    '<TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6 py-2">交互跑分面板</TabsTrigger>',
    '{/* <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6 py-2">交互跑分面板</TabsTrigger> */}'
)

# 4. Comment out 交互跑分面板 TabsContent
tabs_content_interactive = """        <TabsContent value="interactive" className="space-y-4 focus-visible:outline-none">
          <InteractiveBoard />
        </TabsContent>"""
tabs_content_interactive_commented = """        {/* <TabsContent value="interactive" className="space-y-4 focus-visible:outline-none">
          <InteractiveBoard />
        </TabsContent> */}"""

content = content.replace(tabs_content_interactive, tabs_content_interactive_commented)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")