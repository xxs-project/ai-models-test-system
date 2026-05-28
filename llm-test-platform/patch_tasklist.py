import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# 1. Change form layout
content = content.replace(
    '<form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-6 py-6 h-[70vh]">',
    '<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 py-6 h-[70vh]">'
)

# 2. Remove left sidebar
left_sidebar = """{/* Left sidebar */}
              <div className="w-48 shrink-0 flex flex-col gap-2 border-r border-slate-100 pr-4">
                <div className="px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm cursor-pointer">基本信息</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">测试配置</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">性能参数</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">设备配置</div>
              </div>"""

content = content.replace(left_sidebar, '')

# 3. Modify "Right content" wrapper to remove "Right content" comment
# and adjust padding if necessary
content = content.replace(
    '{/* Right content */}\n              <div className="flex-1 overflow-y-auto pr-4 space-y-8">',
    '<div className="flex-1 overflow-y-auto px-2 space-y-8">'
)

# 4. DialogFooter changes
# DialogFooter is already flex items-center justify-end by default probably,
# but we can check if we need to modify its classes.
old_footer = """<DialogFooter className="gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                  {createTask.isPending || updateTask.isPending ? (editingTask ? '保存中...' : '创建中...') : (editingTask ? '保存修改' : '创建任务')}
                </Button>
              </DialogFooter>"""

new_footer = """<div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0 px-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                  {createTask.isPending || updateTask.isPending ? (editingTask ? '保存中...' : '创建中...') : (editingTask ? '保存修改' : '创建任务')}
                </Button>
              </div>"""
              
content = content.replace(old_footer, new_footer)

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
print("TaskList dialog patched.")
