import json
import time
import asyncio
import aiohttp
import os
import re
import ast
import argparse

URL = "http://127.0.0.1:10093/v1/chat/completions"
MODEL_NAME = "gemma-4-26B-A4B-it"
API_KEY = "EMPTY"


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluation Engine")
    parser.add_argument("--model", type=str, default=MODEL_NAME, help="Model name")
    parser.add_argument("--base_url", type=str, default=URL, help="Base URL for API")
    parser.add_argument("--api_key", type=str, default=API_KEY, help="API key")
    parser.add_argument("--pack_file", type=str, default=None, help="Single pack file to run")
    parser.add_argument("--backend", type=str, default="vllm", choices=["vllm", "openai"], help="Backend type")
    return parser.parse_args()


ARGS = parse_args()


def verifier_json_validator(text):
    """验证 JSON 结构的合法性"""
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    json_str = json_match.group(1) if json_match else text.strip()

    try:
        parsed = json.loads(json_str)
        return True, "Valid JSON"
    except json.JSONDecodeError as e:
        return False, f"JSON Parse Error: {e}"


def verifier_code_analyzer(text, lang="python"):
    """使用 AST 等进行简单的代码验证"""
    code_match = re.search(
        r"```(?:python|java|cpp|c|bash|go|rust)?\s*(.*?)\s*```", text, re.DOTALL
    )
    code_str = code_match.group(1) if code_match else text.strip()

    if "def " in code_str or "import " in code_str or "class " in code_str:
        try:
            ast.parse(code_str)
            return True, "Code AST Parsed Successfully"
        except SyntaxError as e:
            return False, f"Syntax Error: {e}"

    if len(code_str) > 10:
        return True, "Code block extracted (No strict parsing for non-python)"
    return False, "No valid code block found"


def verifier_keyword_matcher(text, eval_rules):
    """传统的关键词覆盖率"""
    matched = 0
    missing = []
    text_lower = text.lower()
    for rule in eval_rules:
        if str(rule).lower() in text_lower:
            matched += 1
        else:
            missing.append(rule)
    if matched == len(eval_rules):
        return True, "All keywords matched"
    else:
        return False, f"Missing: {missing}"


def evaluate_response_modular(text, case):
    """满分 100分 体系：
    1. 格式遵循 (Format) - 40分
    2. 业务逻辑与动态验证 (Logic & Verification) - 40分
    3. 约束遵循 (Constraint) - 20分
    """
    if not text:
        return {
            "total": 0,
            "format": 0,
            "logic": 0,
            "constraint": 0,
            "reason": "Failed or Timeout",
        }

    text_clean = text.strip()
    expected_format = case.get("expected_format", "text")
    verifier_type = case.get("verifier_type", "keyword_matcher")
    eval_rules = case.get("eval_rule", [])

    score_format = 0
    score_logic = 0
    score_constraint = 0
    reasons = []

    if expected_format == "json":
        if "```json" in text_clean:
            score_format = 40
        else:
            score_format = 10
            reasons.append("Missing ```json format")
    elif expected_format in ["code", "python", "bash", "java"]:
        if f"```{expected_format}" in text_clean.lower() or "```" in text_clean:
            score_format = 40
        else:
            score_format = 10
            reasons.append("Missing code block format")
    else:
        score_format = 40

    v_success = False
    v_msg = ""
    if verifier_type == "json_validator":
        v_success, v_msg = verifier_json_validator(text_clean)
        if v_success:
            score_logic = 40
        else:
            score_logic = 0
            reasons.append(v_msg)
    elif verifier_type == "code_analyzer":
        v_success, v_msg = verifier_code_analyzer(text_clean)
        if v_success:
            score_logic = 30
            kw_success, kw_msg = verifier_keyword_matcher(text_clean, eval_rules)
            if kw_success:
                score_logic += 10
            else:
                reasons.append(kw_msg)
        else:
            score_logic = 0
            reasons.append(v_msg)
    else:
        matched_ratio = sum(
            [1 for r in eval_rules if str(r).lower() in text_clean.lower()]
        ) / max(len(eval_rules), 1)
        score_logic = int(matched_ratio * 40)
        if matched_ratio < 1.0:
            reasons.append("Missing keywords")

    prompt = case.get("prompt", "")
    if "<thinking>" in prompt:
        if "<thinking>" in text_clean and "</thinking>" in text_clean:
            score_constraint += 10
        else:
            reasons.append("Missing CoT tags")
    else:
        score_constraint += 10

    if "<|EOF|>" in prompt:
        if text_clean.strip().endswith("<|EOF|>") or "<|EOF|>" in text_clean:
            score_constraint += 10
        else:
            reasons.append("Missing <|EOF|>")
    else:
        score_constraint += 10

    total_score = score_format + score_logic + score_constraint

    return {
        "total": total_score,
        "format": score_format,
        "logic": score_logic,
        "constraint": score_constraint,
        "reason": "; ".join(reasons) if reasons else "Perfect",
    }


async def call_model_async(session, semaphore, case, timeout=180):
    model_name = ARGS.model
    base_url = ARGS.base_url
    api_key = ARGS.api_key

    if not base_url.endswith("/chat/completions"):
        base_url = base_url.rstrip("/") + "/chat/completions"
    
    async with semaphore:
        prompt = case["prompt"]

        sampling = case.get("sampling_defaults", {})
        temperature = sampling.get("temperature", 0.0)
        top_p = sampling.get("top_p", 0.9)

        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": 4096,
            "stream": False,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        start_time = time.time()

        try:
            async with session.post(
                base_url, headers=headers, json=payload, timeout=timeout
            ) as response:
                latency = time.time() - start_time
                if response.status == 200:
                    data = await response.json()
                    gen_text = data["choices"][0]["message"]["content"]
                    eval_res = evaluate_response_modular(gen_text, case)
                    return {
                        "id": case["id"],
                        "eval_res": eval_res,
                        "latency": latency,
                        "status": "success",
                        "gen_text": gen_text[:200] + "...",
                    }
                else:
                    text = await response.text()
                    return {
                        "id": case["id"],
                        "eval_res": evaluate_response_modular("", case),
                        "latency": latency,
                        "status": f"HTTP {response.status}",
                    }
        except Exception as e:
            latency = time.time() - start_time
            return {
                "id": case["id"],
                "eval_res": evaluate_response_modular("", case),
                "latency": latency,
                "status": f"Exception: {str(e)}",
            }


def get_dim_name(pack_data):
    if pack_data.get("cases"):
        first_case = pack_data["cases"][0]
        dim = first_case.get("dim", "")
        if dim:
            return dim
    pack_id = pack_data.get("id", "")
    dim_mapping = {
        "ipd-opportunity": "机会识别",
        "ipd-concept": "概念阶段",
        "ipd-plan": "计划阶段",
        "ipd-develop": "开发阶段",
        "ipd-verify": "验证阶段",
        "ipd-release": "发布阶段",
        "ipd-lifecycle": "生命周期管理",
        "ipd-support": "组织支撑与运营",
    }
    return dim_mapping.get(pack_id, pack_data.get("name", "Unknown"))


def get_ipd_stage_info(pack_id):
    stage_mapping = {
        "ipd-opportunity": {"stage": 0, "name": "机会识别", "gate": "-", "objective": "市场洞察、用户需求分析、技术趋势扫描"},
        "ipd-concept": {"stage": 1, "name": "概念阶段(Concept)", "gate": "CDCP", "objective": "判断'做不做'"},
        "ipd-plan": {"stage": 2, "name": "计划阶段(Plan)", "gate": "PDCP", "objective": "明确'怎么做'"},
        "ipd-develop": {"stage": 3, "name": "开发阶段(Development)", "gate": "TR4", "objective": "把设计变成可工作的产品"},
        "ipd-verify": {"stage": 4, "name": "验证阶段(Validation)", "gate": "TR5/TR6", "objective": "确认'做对了没'"},
        "ipd-release": {"stage": 5, "name": "发布阶段(Launch)", "gate": "LDCP", "objective": "成功上市并放量"},
        "ipd-lifecycle": {"stage": 6, "name": "生命周期管理(Life Cycle)", "gate": "-", "objective": "持续运营、迭代与退市"},
        "ipd-support": {"stage": -1, "name": "组织支撑与运营", "gate": "-", "objective": "跨阶段支撑活动"},
    }
    return stage_mapping.get(pack_id, {"stage": -1, "name": "Unknown", "gate": "-", "objective": ""})


async def run_pack(pack_file):
    with open(pack_file, "r", encoding="utf-8") as f:
        pack_data = json.load(f)

    suite = pack_data.get("cases", [])
    pack_name = pack_data.get("name", "Unknown Pack")
    dim_name = get_dim_name(pack_data)

    print(f"\n--- Running Bench Pack: {pack_name} ({len(suite)} cases) ---")

    semaphore = asyncio.Semaphore(10)
    async with aiohttp.ClientSession() as session:
        tasks = [
            call_model_async(session, semaphore, case) for case in suite
        ]
        results = await asyncio.gather(*tasks)

    total_score = sum(r["eval_res"]["total"] for r in results)
    avg_score = total_score / len(suite) if suite else 0

    print(f"Pack Average Score: {avg_score:.2f}/100")

    report_file = pack_file.replace(".json", "_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return {
        "pack": pack_name,
        "pack_id": pack_data.get("id", ""),
        "dim": dim_name,
        "avg_score": avg_score,
        "cases": len(suite),
        "results": results,
    }


async def main():
    import datetime

    model_name = ARGS.model
    base_url = ARGS.base_url
    backend = ARGS.backend
    
    print(f"\n=== Backend: {backend} | Model: {model_name} | URL: {base_url} ===\n")

    if ARGS.pack_file:
        pack_files = [ARGS.pack_file]
    else:
        bench_packs_dir = "bench_packs"
        if not os.path.exists(bench_packs_dir):
            print("Bench packs directory not found. Please run split_bench_packs.py first.")
            return
        pack_files = [
            os.path.join(bench_packs_dir, f)
            for f in os.listdir(bench_packs_dir)
            if f.endswith(".json") and not f.endswith("_report.json")
        ]

    all_results = []
    pack_file_map = {os.path.basename(pf).replace(".json", "").lower(): pf for pf in pack_files}
    for pf in pack_files:
        res = await run_pack(pf)
        res["pf_key"] = os.path.basename(pf).replace(".json", "").lower()
        all_results.append(res)

    print("\n=== Final Summary ===")
    for r in all_results:
        print(
            f"Pack: {r['pack']:<30} | Score: {r['avg_score']:.2f} | Cases: {r['cases']}"
        )

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_name_safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', model_name)
    results_dir = "results"
    os.makedirs(results_dir, exist_ok=True)

    report_basename = f"ipd_bench_{model_name_safe}_{timestamp}_report"
    report_json_path = os.path.join(results_dir, f"{report_basename}.md")

    dim_summary = []
    total_cases = 0
    total_success = 0
    total_failed = 0

    for r in all_results:
        pack_name = r["pack"]
        cases = r["cases"]
        pack_id = r.get("pack_id", "")
        stage_info = get_ipd_stage_info(pack_id)
        
        avg_format = sum(x["eval_res"]["format"] for x in r["results"]) / cases if cases else 0
        avg_logic = sum(x["eval_res"]["logic"] for x in r["results"]) / cases if cases else 0
        avg_constraint = sum(x["eval_res"]["constraint"] for x in r["results"]) / cases if cases else 0
        avg_score = r["avg_score"]
        timeout_count = sum(1 for x in r["results"] if x.get("status", "").startswith("Exception"))
        timeout_rate = (timeout_count / cases * 100) if cases else 0

        dim_name = r.get("dim", pack_name)

        dim_summary.append({
            "stage_num": stage_info["stage"],
            "stage_name": stage_info["name"],
            "stage_gate": stage_info["gate"],
            "stage_objective": stage_info["objective"],
            "dim": dim_name,
            "pack_name": pack_name,
            "avg_score": avg_score,
            "avg_format": avg_format,
            "avg_logic": avg_logic,
            "avg_constraint": avg_constraint,
            "cases": cases,
            "timeout_rate": timeout_rate,
            "results": r["results"]
        })

        pack_key = r.get("pf_key", pack_name.lower())
        pack_dir = os.path.join(results_dir, pack_key)
        os.makedirs(pack_dir, exist_ok=True)
        pack_json_file = os.path.join(pack_dir, f"{pack_key}_{model_name}_{timestamp}.json")
        with open(pack_json_file, "w", encoding="utf-8") as pf:
            json.dump(r["results"], pf, ensure_ascii=False, indent=2)

        total_cases += cases
        total_success += sum(1 for x in r["results"] if x["eval_res"]["total"] == 100)
        total_failed += sum(1 for x in r["results"] if x["eval_res"]["total"] == 0)

    dim_summary_sorted = sorted(dim_summary, key=lambda x: x["stage_num"])
    
    dim_summary_filtered = [d for d in dim_summary_sorted if d["stage_num"] >= 0]
    support_stages = [d for d in dim_summary_sorted if d["stage_num"] < 0]
    dim_summary_final = dim_summary_filtered + support_stages

    with open(report_json_path, "w", encoding="utf-8") as f:
        f.write("========================================================\n")
        f.write(f"IPD标准开发流程 - 【{model_name}】大模型企业级选型能力评估报告\n")
        f.write("========================================================\n")
        f.write(f"评测时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"模型: {model_name} | Backend: {backend}\n")
        f.write(f"详细追踪记录(带打分与I/O)已落盘至: {results_dir}/{report_basename}.json\n\n")

        f.write("## 一、IPD标准开发流程阶段映射\n")
        f.write("| 阶段编号 | 阶段名称 | 评审门(Gate) | 核心目标 |\n")
        f.write("|---------|---------|-------------|---------|\n")
        f.write("| 0 | 机会识别 | - | 市场洞察、用户需求分析、技术趋势扫描 |\n")
        f.write("| 1 | 概念阶段(Concept) | CDCP | 判断'做不做' |\n")
        f.write("| 2 | 计划阶段(Plan) | PDCP | 明确'怎么做' |\n")
        f.write("| 3 | 开发阶段(Development) | TR4 | 把设计变成可工作的产品 |\n")
        f.write("| 4 | 验证阶段(Validation) | TR5/TR6 | 确认'做对了没' |\n")
        f.write("| 5 | 发布阶段(Launch) | LDCP | 成功上市并放量 |\n")
        f.write("| 6 | 生命周期管理(Life Cycle) | - | 持续运营、迭代与退市 |\n\n")

        f.write("## 二、各阶段评测结果汇总\n")
        header = f"{'阶段':<6} | {'评测维度 (AI Capability)':<32} | {'综合得分':>10} | {'格式规范':>10} | {'业务逻辑':>10} | {'指令遵循':>10} | {'超时率':>6}\n"
        f.write(header + "\n")
        f.write("-" * len(header) + "\n")

        for d in dim_summary_final:
            stage_display = f"S{d['stage_num']}" if d['stage_num'] >= 0 else "支撑"
            dim_display = d["dim"][:30] if len(d["dim"]) > 30 else d["dim"]
            f.write(f"{stage_display:<6} | {dim_display:<32} | {d['avg_score']:>7.1f}分 | {d['avg_format']:>8.1f}分 | {d['avg_logic']:>8.1f}分 | {d['avg_constraint']:>8.1f}分 | {d['timeout_rate']:>5.1f}%\n")

        f.write("\n## 三、选型决策建议 (Model Selection Guide)\n")
        f.write("### 3.1 综合评分 (Overall Score)\n")
        
        stage_weights = {"S0": 0.10, "S1": 0.15, "S2": 0.20, "S3": 0.25, "S4": 0.15, "S5": 0.10, "S6": 0.05}
        overall_score = 0
        weighted_count = 0
        
        for d in dim_summary_final:
            if d['stage_num'] >= 0:
                weight = stage_weights.get(f"S{d['stage_num']}", 0.10)
                overall_score += d['avg_score'] * weight
                weighted_count += weight
        
        overall_score = overall_score / weighted_count if weighted_count > 0 else 0
        
        overall_format = sum(d['avg_format'] for d in dim_summary_final) / len(dim_summary_final) if dim_summary_final else 0
        overall_logic = sum(d['avg_logic'] for d in dim_summary_final) / len(dim_summary_final) if dim_summary_final else 0
        overall_constraint = sum(d['avg_constraint'] for d in dim_summary_final) / len(dim_summary_final) if dim_summary_final else 0
        
        f.write(f"| 评估维度 | 得分 |\n")
        f.write("|---------|------|\n")
        f.write(f"| **综合评分 (Overall)** | **{overall_score:.1f}** |\n")
        f.write(f"| 格式规范 (Format) | {overall_format:.1f} |\n")
        f.write(f"| 业务逻辑 (Logic) | {overall_logic:.1f} |\n")
        f.write(f"| 指令遵循 (Constraint) | {overall_constraint:.1f} |\n")
        f.write(f"| 测评用例数 | {total_cases} |\n")
        f.write(f"| 成功用例数 (100分) | {total_success} ({total_success/total_cases*100:.1f}%) |\n")
        f.write(f"| 失败用例数 (0分) | {total_failed} ({total_failed/total_cases*100:.1f}%) |\n")
        f.write(f"| 部分通过用例数 | {total_cases - total_success - total_failed} ({(total_cases - total_success - total_failed)/total_cases*100:.1f}%) |\n\n")
        
        f.write("### 3.2 各阶段能力阈值说明\n")
        f.write("| IPD阶段 | 关键评审指标 | 通过阈值 |\n")
        f.write("|--------|-------------|---------|\n")
        f.write("| S0-S1 (机会识别/概念) | 业务逻辑推理(40分) | >=25分 |\n")
        f.write("| S2 (计划) | JSON结构化输出(40分) | >=35分 |\n")
        f.write("| S3 (开发) | 代码生成与AST解析(40分) | >=30分 |\n")
        f.write("| S4 (验证) | 功能/性能/兼容性验证(40分) | >=20分 |\n")
        f.write("| S5 (发布) | 市场洞察与GTM内容生成(40分) | >=25分 |\n")
        f.write("| S6 (生命周期) | 故障诊断与日志分析(40分) | >=25分 |\n")

        f.write("\n### 3.2 选型建议\n")
        f.write(" 1. 如果【格式规范】低于 30分 (特别是结构化输出/工具调用维度)，说明该模型无法直接接入业务 API 代码，必须在外层套用复杂的正则清洗器或重试机制。\n")
        f.write(" 2. 如果【业务逻辑】低于 30分，说明模型在对应场景（如代码生成、长文本提取）的智商不足，存在严重幻觉或能力短板，不建议在此业务域使用。\n")
        f.write(" 3. 如果【指令遵循】偏低，说明模型容易\"废话连篇\"或不遵守思维链约束，调优成本极高。\n")
        f.write(" 4. S2计划阶段对JSON结构化输出要求最高，建议优先评估此阶段得分。\n")
        f.write(" 5. S3开发阶段需要通过AST语法验证，建议结合代码正确性综合评估。\n")

        f.write("\n## 五、IPD决策门(Gate)评审建议\n")
        cdcp_score = next((d['avg_score'] for d in dim_summary_final if d['stage_num'] == 1), 0)
        pdcp_score = next((d['avg_score'] for d in dim_summary_final if d['stage_num'] == 2), 0)
        tr4_score = next((d['avg_score'] for d in dim_summary_final if d['stage_num'] == 3), 0)
        tr5_score = next((d['avg_score'] for d in dim_summary_final if d['stage_num'] == 4), 0)
        ldcp_score = next((d['avg_score'] for d in dim_summary_final if d['stage_num'] == 5), 0)

        f.write(f"| 决策门 | 对应阶段 | 模型得分 | 通过建议 |\n")
        f.write("|--------|---------|---------|---------|\n")
        f.write(f"| CDCP | S1概念阶段 | {cdcp_score:.1f} | {'PASS' if cdcp_score >= 60 else 'CONDITIONAL PASS' if cdcp_score >= 40 else 'REJECT'} |\n")
        f.write(f"| PDCP | S2计划阶段 | {pdcp_score:.1f} | {'PASS' if pdcp_score >= 60 else 'CONDITIONAL PASS' if pdcp_score >= 40 else 'REJECT'} |\n")
        f.write(f"| TR4 | S3开发阶段 | {tr4_score:.1f} | {'PASS' if tr4_score >= 60 else 'CONDITIONAL PASS' if tr4_score >= 40 else 'REJECT'} |\n")
        f.write(f"| TR5/TR6 | S4验证阶段 | {tr5_score:.1f} | {'PASS' if tr5_score >= 60 else 'CONDITIONAL PASS' if tr5_score >= 40 else 'REJECT'} |\n")
        f.write(f"| LDCP | S5发布阶段 | {ldcp_score:.1f} | {'PASS' if ldcp_score >= 60 else 'CONDITIONAL PASS' if ldcp_score >= 40 else 'REJECT'} |\n")

    print(f"\nMarkdown report saved to {report_json_path}")


if __name__ == "__main__":
    asyncio.run(main())