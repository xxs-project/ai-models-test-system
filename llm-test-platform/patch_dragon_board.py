import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

# Add setScenario('') to the reset button
old_reset_btn = """          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800" onClick={() => {
            setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
          }}>重置所有条件</Button>"""

new_reset_btn = """          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800" onClick={() => {
            setScenario(''); setModel(''); setFeatures([]); setServer(''); setCard(''); setFramework(''); setFrameworkVersion(''); setDimension('');
          }}>重置所有条件</Button>"""
content = content.replace(old_reset_btn, new_reset_btn)

# Add ButtonGroup for scenario
old_button_groups = """        <CardContent className="p-6 bg-slate-50/30">
          <ButtonGroup label="模型列表" options={modelOptions} value={model} onChange={setModel} />"""

new_button_groups = """        <CardContent className="p-6 bg-slate-50/30">
          <ButtonGroup label="场景" options={scenarioOptions} value={scenario} onChange={setScenario} />
          <ButtonGroup label="模型列表" options={modelOptions} value={model} onChange={setModel} />"""
content = content.replace(old_button_groups, new_button_groups)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Dragon board patched.")
