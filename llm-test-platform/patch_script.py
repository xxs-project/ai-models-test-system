with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

# Remove the pre-populated benchpack paths in config.toml
import re
new_content = re.sub(r'\[benchpacks\.".*?"\]\npath = ".*?"\nversion = ".*?"\nregistry_id = ".*?"\n(\n\[benchpacks\.".*?"\.verifiers\.verifier\]\nmode = "docker"\nauto_start = true\n)?', '', content)

with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(new_content)
