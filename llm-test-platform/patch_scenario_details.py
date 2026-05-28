import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

old_details = """                               <div>
                                 <span className="text-xs text-gray-500 block">场景</span>
                                 <span className="text-sm">{viewTask.scenario || '-'}</span>
                               </div>"""

# Ensure we display scenario in all cases, not just api startup mode.
# Wait, the user said: 
# "任务列表详情中支持显示创建任务中选择的场景， 任务列表编辑中支持编辑与创建任务对话选择保持一致；"
# It is already in the details section. Let's make sure it's available in container mode too.
# I will move the scenario and features out of the 'api' mode block and put it in a common area.

# Let's read the section to see where to place it.
