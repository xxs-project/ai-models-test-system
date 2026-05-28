import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Fix create/edit dialog
old_form = """<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 py-6 h-[70vh]">"""
new_form = """<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 py-2">"""
content = content.replace(old_form, new_form)

old_div = """<div className="flex-1 overflow-y-auto px-2 space-y-8">"""
new_div = """<div className="px-2 space-y-8">"""
content = content.replace(old_div, new_div)

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
print("Task scroll patched.")
