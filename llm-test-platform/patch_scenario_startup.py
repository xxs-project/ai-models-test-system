import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Add scenario options to container mode too
old_select = """<SelectContent><SelectItem value="对话">对话</SelectItem><SelectItem value="Agent">Agent</SelectItem></SelectContent>"""

new_select = """<SelectContent>
                              <SelectItem value="对话">对话</SelectItem>
                              <SelectItem value="Agent">Agent</SelectItem>
                              <SelectItem value="AI Coding">AI Coding</SelectItem>
                              <SelectItem value="Openclaw">Openclaw</SelectItem>
                              <SelectItem value="文档写作">文档写作</SelectItem>
                              <SelectItem value="通用">通用</SelectItem>
                            </SelectContent>"""

if old_select in content:
    content = content.replace(old_select, new_select)
    with open('src/pages/TaskList.tsx', 'w') as f:
        f.write(content)
    print("Scenario options added to container mode as well.")
else:
    print("No additional scenario select found.")
