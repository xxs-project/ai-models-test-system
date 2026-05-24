import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Colors
    content = re.sub(r'bg-blue-[4-6]00', 'bg-primary', content)
    content = re.sub(r'text-blue-[4-6]00', 'text-primary', content)
    content = re.sub(r'border-blue-[4-6]00', 'border-primary', content)
    content = re.sub(r'ring-blue-[4-6]00', 'ring-primary', content)
    
    content = re.sub(r'bg-red-[4-6]00', 'bg-danger', content)
    content = re.sub(r'text-red-[4-6]00', 'text-danger', content)
    
    content = re.sub(r'bg-green-[4-6]00', 'bg-accent', content)
    content = re.sub(r'text-green-[4-6]00', 'text-accent', content)
    
    content = re.sub(r'text-slate-800|text-slate-900|text-gray-800|text-gray-900', 'text-textMain', content)
    content = re.sub(r'text-slate-600|text-slate-700|text-gray-600|text-gray-700', 'text-textSec', content)
    content = re.sub(r'text-slate-400|text-slate-500|text-gray-400|text-gray-500', 'text-textMuted', content)
    
    content = re.sub(r'bg-slate-50|bg-slate-100|bg-gray-50|bg-gray-100', 'bg-pageBg', content)
    content = re.sub(r'border-slate-200|border-slate-300|border-gray-200|border-gray-300', 'border-border', content)
    
    # Shadows and rounding
    content = re.sub(r'shadow-(md|lg|xl)', 'shadow', content)
    content = re.sub(r'rounded-(md|lg|xl|2xl)', 'rounded', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))
