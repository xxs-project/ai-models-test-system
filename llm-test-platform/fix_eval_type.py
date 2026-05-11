import re

with open("backend/main.py", "r") as f:
    content = f.read()

old_code = """
    packs_list = req.packs.split(',')
    has_ipd = "IPD" in packs_list
    eval_type = "IPD" if has_ipd else "BenchLocal"
"""

new_code = """
    packs_list = req.packs.split(',')
    has_ipd = "IPD" in packs_list
    has_bench = any(p != "IPD" for p in packs_list)
    types = []
    if has_bench:
        types.append("BenchLocal")
    if has_ipd:
        types.append("IPD")
    eval_type = ",".join(types)
"""

content = content.replace(old_code, new_code)

with open("backend/main.py", "w") as f:
    f.write(content)
