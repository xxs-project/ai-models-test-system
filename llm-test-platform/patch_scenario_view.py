import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# First, let's remove it from the api mode block
old_scenario_api = """                               <div>
                                 <span className="text-xs text-gray-500 block">场景</span>
                                 <span className="text-sm">{viewTask.scenario || '-'}</span>
                               </div>"""

content = content.replace(old_scenario_api, "")

# Then let's add it to the top of "配置详情" where it is visible to all modes
old_config_details = """                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">配置详情</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                      <div>
                       <span className="text-xs text-gray-500 block">推理框架</span>"""

new_config_details = """                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">配置详情</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                      <div>
                        <span className="text-xs text-gray-500 block">场景</span>
                        <span className="text-sm font-semibold text-blue-600">{viewTask.scenario || '-'}</span>
                      </div>
                      <div>
                       <span className="text-xs text-gray-500 block">推理框架</span>"""

content = content.replace(old_config_details, new_config_details)

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
print("Details dialog scenario patched.")
