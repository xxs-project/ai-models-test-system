with open('src/pages/TaskList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
"""                  {Number(testType) === 1 && Number(testMode) === 1 && (
                  {Number(testType) === 1 && Number(testMode) === 1 && (""",
"                  {Number(testType) === 1 && Number(testMode) === 1 && ("
)

content = content.replace(
"""                  )}
                  )}
                  <FormField
                    control={form.control}
                    name="test_type\"""",
"""                  )}
                  <FormField
                    control={form.control}
                    name="test_type\""""
)

with open('src/pages/TaskList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

