with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

content = content.replace(
    'official_url = "https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json"',
    'official_url = "https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json"'
)

with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(content)
