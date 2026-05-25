import re
import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

# 1. Change default tab and add new tabs
content = content.replace(
    "const [activeMainTab, setActiveMainTab] = useState('eval')",
    "const [activeMainTab, setActiveMainTab] = useState('eval-ladder')"
)

tabs_list_old = """<TabsTrigger value="eval" className="flex-1 sm:flex-none px-6">测评榜单</TabsTrigger>
            <TabsTrigger value="perf" className="flex-1 sm:flex-none px-6">性能榜单</TabsTrigger>
            <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6">交互跑分面板</TabsTrigger>"""

tabs_list_new = """<TabsTrigger value="eval-ladder" className="flex-1 sm:flex-none px-6">测评天梯榜</TabsTrigger>
            <TabsTrigger value="perf-dragon" className="flex-1 sm:flex-none px-6">性能龙虎榜</TabsTrigger>
            <TabsTrigger value="eval" className="flex-1 sm:flex-none px-6">测评榜单</TabsTrigger>
            <TabsTrigger value="perf" className="flex-1 sm:flex-none px-6">性能榜单</TabsTrigger>
            <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6">交互跑分面板</TabsTrigger>"""

content = content.replace(tabs_list_old, tabs_list_new)

# 2. Add TabsContent for new boards
tabs_content_old = """<TabsContent value="eval" className="space-y-4 focus-visible:outline-none">
          <EvalBoard />
        </TabsContent>"""

tabs_content_new = """<TabsContent value="eval-ladder" className="space-y-4 focus-visible:outline-none">
          <EvalLadderBoard />
        </TabsContent>
        
        <TabsContent value="perf-dragon" className="space-y-4 focus-visible:outline-none">
          <PerfDragonTigerBoard />
        </TabsContent>

        <TabsContent value="eval" className="space-y-4 focus-visible:outline-none">
          <EvalBoard />
        </TabsContent>"""

content = content.replace(tabs_content_old, tabs_content_new)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Replaced basic tabs structure.")
