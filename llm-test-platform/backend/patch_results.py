import sys
import os

with open("backend/main.py", "r") as f:
    content = f.read()

new_endpoint = """
@app.get("/api/eval/results")
async def get_eval_results():
    import os
    import re
    from datetime import datetime
    
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "BenchLocal", "results")
    if not os.path.exists(bench_dir):
        return {"reports": []}
        
    reports = []
    for filename in os.listdir(bench_dir):
        if filename.startswith("benchmark_") and filename.endswith("_report.md"):
            filepath = os.path.join(bench_dir, filename)
            
            with open(filepath, "r", encoding="utf-8") as f:
                md_content = f.read()
                
            # Parse basic info
            model_match = re.search(r"\\*\\*模型名称\\*\\*: (.*)", md_content)
            model_name = model_match.group(1).strip() if model_match else "Unknown"
            
            time_match = re.search(r"\\*\\*测试时间\\*\\*: (.*)", md_content)
            test_time = time_match.group(1).strip() if time_match else ""
            
            score_match = re.search(r"- \\*\\*总得分\\*\\*: (\\d+) / (\\d+)", md_content)
            score = f"{score_match.group(1)}/{score_match.group(2)}" if score_match else "0/0"
            
            percent_match = re.search(r"- \\*\\*综合胜率\\*\\*: \\*\\*(.*)%\\*\\*", md_content)
            percent = float(percent_match.group(1)) if percent_match else 0.0
            
            # Parse individual packs
            packs = []
            pack_sections = re.split(r"## 测试集: ", md_content)[1:]
            for section in pack_sections:
                lines = section.split("\\n")
                pack_name = lines[0].strip()
                if pack_name == "🏆 大模型综合评分":
                    continue
                    
                status_match = re.search(r"- \\*\\*状态\\*\\*: . (.*)", section)
                status = status_match.group(1).strip() if status_match else "UNKNOWN"
                
                pack_score_match = re.search(r"- \\*\\*得分\\*\\*: (\\d+)/(\\d+) \\((.*)%\\)", section)
                pack_score = int(pack_score_match.group(1)) if pack_score_match else 0
                pack_max = int(pack_score_match.group(2)) if pack_score_match else 100
                
                # Parse table rows
                cases = []
                table_lines = [line for line in lines if line.startswith("| ") and "用例 ID" not in line and "---" not in line]
                for row in table_lines:
                    cols = [c.strip() for c in row.split("|")[1:-1]]
                    if len(cols) >= 4:
                        cases.append({
                            "id": cols[0],
                            "pass": "✅" in cols[1],
                            "score": cols[2],
                            "error": cols[3]
                        })
                
                packs.append({
                    "name": pack_name,
                    "status": status,
                    "score": pack_score,
                    "maxScore": pack_max,
                    "cases": cases
                })
            
            reports.append({
                "id": filename,
                "model_name": model_name,
                "time": test_time,
                "score": score,
                "percent": percent,
                "packs": packs,
                "raw_md": md_content
            })
            
    # Sort by descending time
    reports.sort(key=lambda x: x["time"], reverse=True)
    return {"reports": reports}
"""

if "@app.get(\"/api/eval/results\")" not in content:
    content = content.replace('@app.post("/api/eval/start")', new_endpoint + '\n@app.post("/api/eval/start")')
    with open("backend/main.py", "w") as f:
        f.write(content)
