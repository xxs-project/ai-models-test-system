with open("src/pages/EvalResults.tsx", "r") as f:
    content = f.read()

old_label = "formatter: (params: any) => `${params.data.score}分`,"
new_label = "formatter: (params: any) => `${params.data.value}%`,"

content = content.replace(old_label, new_label)

with open("src/pages/EvalResults.tsx", "w") as f:
    f.write(content)
