import os

files_to_patch = [
    'src/components/CsvImportEnhanced.tsx',
    'src/components/AddBenchmarkEnhanced.tsx'
]

old_options = """<SelectItem value="对话">对话</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>"""

new_options = """<SelectItem value="对话">对话</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                      <SelectItem value="AI Coding">AI Coding</SelectItem>
                      <SelectItem value="Openclaw">Openclaw</SelectItem>
                      <SelectItem value="文档写作">文档写作</SelectItem>
                      <SelectItem value="通用">通用</SelectItem>"""

for file_path in files_to_patch:
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
        
        if old_options in content:
            content = content.replace(old_options, new_options)
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"Patched {file_path} (format 1)")
        else:
            # Let's try matching with different indentations
            import re
            pattern = r'<SelectItem value="对话">对话</SelectItem>\s*<SelectItem value="Agent">Agent</SelectItem>'
            if re.search(pattern, content):
                content = re.sub(pattern, new_options, content)
                with open(file_path, 'w') as f:
                    f.write(content)
                print(f"Patched {file_path} (format 2)")
            else:
                print(f"Could not find old_options in {file_path}")
