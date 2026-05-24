import re

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Make the dialog wider
content = content.replace('max-w-3xl', 'max-w-6xl')

# Look for the start of the form
form_start = content.find('<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">')
if form_start != -1:
    new_form_start_str = '''<form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-6 py-6 h-[70vh]">
              {/* Left sidebar */}
              <div className="w-48 shrink-0 flex flex-col gap-2 border-r border-slate-100 pr-4">
                <div className="px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm cursor-pointer">基本信息</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">测试配置</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">性能参数</div>
                <div className="px-3 py-2 text-textSec hover:bg-pageBg rounded-md font-medium text-sm cursor-pointer">设备配置</div>
              </div>
              
              {/* Right content */}
              <div className="flex-1 overflow-y-auto pr-4 space-y-8">
'''
    content = content.replace('<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">', new_form_start_str)

    # We need to close the div before DialogFooter
    dialog_footer_start = content.find('<DialogFooter className="gap-3">', form_start)
    if dialog_footer_start != -1:
        content = content[:dialog_footer_start] + '              </div>\n              ' + content[dialog_footer_start:]

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
