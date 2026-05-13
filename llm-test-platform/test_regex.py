with open('src/pages/TaskList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# find everything between <h3 className="font-semibold text-slate-900">测试配置</h3> and <FormField ... name="test_type"
matches = re.search(r'(<h3 className="font-semibold text-slate-900">测试配置</h3>\s*<div className="grid grid-cols-3 gap-4">\s*)(<FormField\s+control=\{form.control\}\s+name="startup_mode"[\s\S]*?/>)(\s*<FormField\s+control=\{form.control\}\s+name="test_type")', content)

if matches:
    print("Found!")
    new_str = matches.group(1) + "{Number(testType) === 1 && Number(testMode) === 1 && (" + matches.group(2) + ")}" + matches.group(3)
    content = content[:matches.start()] + new_str + content[matches.end():]
    with open('src/pages/TaskList.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print("Not found.")

