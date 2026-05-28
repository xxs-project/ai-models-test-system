import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

old_dialog = 'DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl"'
new_dialog = 'DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-2xl"'

if old_dialog in content:
    content = content.replace(old_dialog, new_dialog)
    with open('src/pages/TaskList.tsx', 'w') as f:
        f.write(content)
    print("Dialog width patched to max-w-3xl.")
else:
    print("Could not find the old dialog string.")
