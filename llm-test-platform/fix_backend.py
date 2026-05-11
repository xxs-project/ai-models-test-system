import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Time parsing for BenchLocal
def time_replacement(m):
    return '''                time_match = re.search(r"\\*\\*测试时间\\*\\*: (.*)", md_content)
                test_time = time_match.group(1).strip() if time_match else ""
                if test_time and "," in test_time:
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(test_time, "%m/%d/%Y, %I:%M:%S %p")
                        test_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass'''
                        
content = re.sub(
    r'                time_match = re.search\(r"\\\*\\\*测试时间\\\*\\\*: \(\.\*\)", md_content\)\n                test_time = time_match\.group\(1\)\.strip\(\) if time_match else ""',
    time_replacement,
    content
)

# Fix 3: IDP comprehensive score
# We need to move the score generation AFTER ipd_cases parsing

ipd_block = r'''                # IPD doesn't have standard score format, so we leave it empty or extract an average if needed\.
                score = "IPD评估"
                percent = 0\.0
                
                ipd_cases = \[\]
                # parse IPD table for cases
                ipd_lines = md_content\.split\("\\n"\)
                parsing_cases = False
                for line in ipd_lines:
                    if "----------------------------" in line:
                        parsing_cases = True
                        continue
                    if line\.startswith\("## 三"\):
                        parsing_cases = False
                        break
                    
                    if parsing_cases and "\|" in line and "阶段" not in line:
                        parts = \[p\.strip\(\) for p in line\.split\("\|"\)\]
                        if len\(parts\) >= 6:
                            ipd_cases\.append\({
                                "id": f"\{parts\[0\]\} - \{parts\[1\]\}",
                                "pass": True,
                                "score": parts\[2\],
                                "error": f"格式: \{parts\[3\]\}, 逻辑: \{parts\[4\]\}, 指令: \{parts\[5\]\}"
                            }\)
                            
                packs = \[\{
                    "name": "IPD Process",
                    "status": "SUCCESS",
                    "score": sum\(\[float\(c\["score"\]\.replace\("分", ""\)\.strip\(\)\) for c in ipd_cases\]\) if ipd_cases else 0,
                    "maxScore": len\(ipd_cases\) \* 100,
                    "cases": ipd_cases
                \}\]'''

new_ipd_block = '''                ipd_cases = []
                # parse IPD table for cases
                ipd_lines = md_content.split("\\n")
                parsing_cases = False
                for line in ipd_lines:
                    if "----------------------------" in line:
                        parsing_cases = True
                        continue
                    if line.startswith("## 三"):
                        parsing_cases = False
                        break
                    
                    if parsing_cases and "|" in line and "阶段" not in line:
                        parts = [p.strip() for p in line.split("|")]
                        if len(parts) >= 6:
                            ipd_cases.append({
                                "id": f"{parts[0]} - {parts[1]}",
                                "pass": True,
                                "score": parts[2],
                                "error": f"格式: {parts[3]}, 逻辑: {parts[4]}, 指令: {parts[5]}"
                            })
                
                total_ipd_score = sum([float(c["score"].replace("分", "").strip()) for c in ipd_cases]) if ipd_cases else 0
                max_ipd_score = len(ipd_cases) * 100
                score = f"{int(total_ipd_score)}/{max_ipd_score}" if max_ipd_score > 0 else "0/0"
                percent = round(total_ipd_score / max_ipd_score * 100, 2) if max_ipd_score > 0 else 0.0

                packs = [{
                    "name": "IPD Process",
                    "status": "SUCCESS",
                    "score": total_ipd_score,
                    "maxScore": max_ipd_score,
                    "cases": ipd_cases
                }]'''

content = re.sub(ipd_block, new_ipd_block, content)

# Fix 2: delete_eval_result
delete_block = r'''@app\.delete\("/api/eval/results/\{filename\}"\)
async def delete_eval_result\(filename: str\):
    import os
    bench_dir = os\.path\.join\(os\.path\.dirname\(os\.path\.dirname\(os\.path\.abspath\(__file__\)\)\), "BenchLocal", "results"\)
    filepath = os\.path\.join\(bench_dir, filename\)
    if os\.path\.exists\(filepath\) and filename\.endswith\("_report\.md"\):
        try:
            os\.remove\(filepath\)
            return \{"status": "success"\}
        except Exception as e:
            raise HTTPException\(status_code=500, detail=str\(e\)\)'''

new_delete_block = '''@app.delete("/api/eval/results/{filename}")
async def delete_eval_result(filename: str):
    import os
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "BenchLocal", "results")
    filepath = os.path.join(bench_dir, filename)
    if os.path.exists(filepath) and filename.endswith("_report.md"):
        try:
            os.remove(filepath)
            
            # also remove corresponding .json file
            json_filepath = filepath.replace("_report.md", "_report.json")
            if os.path.exists(json_filepath):
                os.remove(json_filepath)
                
            # ALSO delete from ipd_bench_test/results if it's an IPD report
            if filename.startswith("ipd_bench_"):
                ipd_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ipd_bench_test", "results")
                ipd_md = os.path.join(ipd_dir, filename)
                ipd_json = os.path.join(ipd_dir, filename.replace("_report.md", "_report.json"))
                if os.path.exists(ipd_md):
                    os.remove(ipd_md)
                if os.path.exists(ipd_json):
                    os.remove(ipd_json)
                    
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))'''

content = re.sub(delete_block, new_delete_block, content)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
