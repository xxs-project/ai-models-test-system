import re
import os

empty_svg = '''<div className="flex flex-col items-center justify-center py-12 text-textMuted"><svg className="w-12 h-12 mb-4 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><p className="text-[14px]">'''

for file in ['src/pages/TaskList.tsx', 'src/pages/EvalManage.tsx', 'src/pages/DeviceList.tsx']:
    if not os.path.exists(file): continue
    with open(file, 'r') as f:
        content = f.read()

    # TaskList
    content = re.sub(r'<TableCell colSpan=\{\d+\} className="text-center py-8 text-[^"]*">暂无测试任务</TableCell>', 
                     r'<TableCell colSpan={8}>' + empty_svg + r'暂无测试任务</p></div></TableCell>', content)
    
    # EvalManage
    content = re.sub(r'<TableCell colSpan=\{\d+\} className="text-center py-12 text-[^"]*">暂无评测任务，点击右上角发起新测评</TableCell>',
                     r'<TableCell colSpan={6}>' + empty_svg + r'暂无评测任务，点击右上角发起新测评</p></div></TableCell>', content)
    
    # DeviceList (assuming it has something similar)
    content = re.sub(r'<TableCell colSpan=\{\d+\} className="text-center py-8 text-[^"]*">暂无设备数据</TableCell>',
                     r'<TableCell colSpan={8}>' + empty_svg + r'暂无设备数据</p></div></TableCell>', content)
                     
    with open(file, 'w') as f:
        f.write(content)
