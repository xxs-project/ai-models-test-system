import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

old_button_group_wrapper = """<div className="flex flex-col gap-3 py-3 border-b border-slate-100/50 last:border-0">
        <Label className="text-sm font-bold text-slate-700">{label}</Label>
        <div className="flex flex-wrap gap-3">"""

new_button_group_wrapper = """<div className="flex flex-col gap-4 py-5 border-b border-slate-200 border-dashed last:border-0 relative">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-blue-400 rounded-full"></div>
          <Label className="text-sm font-bold text-slate-700">{label}</Label>
        </div>
        <div className="flex flex-wrap gap-3 pl-3">"""

content = content.replace(old_button_group_wrapper, new_button_group_wrapper)

old_card_content = """<CardContent className="p-6 space-y-2 bg-slate-50/30">"""
new_card_content = """<CardContent className="p-6 bg-slate-50/30">"""

content = content.replace(old_card_content, new_card_content)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Separators improved.")
