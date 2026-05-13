import re

with open('src/pages/TaskList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix redeclared startupMode
content = re.sub(r"const startupMode = form\.watch\('startup_mode'\)\s*const startupMode = form\.watch\('startup_mode'\)", r"const startupMode = form.watch('startup_mode')", content)

# Since we might have multiple matches or weird stuff from replacing twice, let's just make sure there's only one.
content = content.replace(
    "const testMode = form.watch('test_mode')\n  const startupMode = form.watch('startup_mode')\n  const startupMode = form.watch('startup_mode')",
    "const testMode = form.watch('test_mode')\n  const startupMode = form.watch('startup_mode')"
)

with open('src/pages/TaskList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/lib/types.ts', 'r', encoding='utf-8') as f:
    types = f.read()

# Add new fields to Task interface
if "startup_mode" not in types:
    types = types.replace(
        "dataset_name?: string",
        "dataset_name?: string;\n  startup_mode?: string;\n  base_url?: string;\n  api_key?: string;\n  parameter_combination?: string;\n  processor_type?: string;\n  server_model?: string;\n  framework_startup_args?: string;"
    )

with open('src/lib/types.ts', 'w', encoding='utf-8') as f:
    f.write(types)

