import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

wrong_tabs = """<TabsList className="mb-6 bg-slate-100/80 p-1 w-full sm:w-auto inline-flex flex-wrap h-auto">
          <TabsTrigger value="eval-ladder" className="flex-1 sm:flex-none px-6 py-2">测评天梯榜</TabsTrigger>
          <TabsTrigger value="perf-dragon" className="flex-1 sm:flex-none px-6 py-2">性能龙虎榜</TabsTrigger>
          <TabsTrigger value="eval" className="flex-1 sm:flex-none px-6 py-2">测评榜单</TabsTrigger>
          <TabsTrigger value="perf" className="flex-1 sm:flex-none px-6 py-2">性能榜单</TabsTrigger>
          <TabsTrigger value="interactive" className="flex-1 sm:flex-none px-6 py-2">交互跑分面板</TabsTrigger>
        </TabsList>"""

correct_evalboard_tabs = """<TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="BenchLocal">BenchLocal 测试集</TabsTrigger>
              <TabsTrigger value="IPD">IPD 测试集</TabsTrigger>
            </TabsList>"""

# Find the second occurrence of wrong_tabs and replace it with correct_evalboard_tabs
# or just do a string find.
parts = content.split(wrong_tabs)
if len(parts) >= 3:
    # First one is the main board tabs, second one is the EvalBoard tabs
    # Reconstruct the string
    new_content = parts[0] + wrong_tabs + parts[1] + correct_evalboard_tabs + parts[2]
    
    # Just to be sure, check if there are more
    for i in range(3, len(parts)):
        new_content += wrong_tabs + parts[i]
        
    with open('src/pages/Board.tsx', 'w') as f:
        f.write(new_content)
    print("Fixed EvalBoard tabs.")
else:
    print("Could not find multiple occurrences.")
