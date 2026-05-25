import os

files_to_check = [
    'src/pages/EvalResults.tsx',
    'src/pages/Board.tsx',
    'src/pages/EvalManage.tsx'
]

for file_path in files_to_check:
    with open(file_path, 'r') as f:
        content = f.read()
    
    new_content = content.replace('Agent规划', 'Agent调度')
    
    if content != new_content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
