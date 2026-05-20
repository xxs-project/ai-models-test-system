import json
import time
import asyncio
import aiohttp
import os
import re
import ast
import argparse

URL = os.getenv("IPD_BENCH_BASE_URL", "http://127.0.0.1:10093/v1/chat/completions")
MODEL_NAME = os.getenv("IPD_BENCH_MODEL", "gemma-4-26B-A4B-it")
API_KEY = os.getenv("IPD_BENCH_API_KEY", "EMPTY")
DEFAULT_CONCURRENCY = int(os.getenv("IPD_BENCH_CONCURRENCY", "10"))
DEFAULT_MAX_TOKENS = int(os.getenv("IPD_BENCH_MAX_TOKENS", "4096"))
DEFAULT_TIMEOUT = int(os.getenv("IPD_BENCH_TIMEOUT", "180"))
DEFAULT_RETRIES = int(os.getenv("IPD_BENCH_RETRIES", "1"))
DEFAULT_RESULTS_DIR = os.getenv("IPD_BENCH_RESULTS_DIR", "results")


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluation Engine")
    parser.add_argument("--model", type=str, default=MODEL_NAME, help="Model name")
    parser.add_argument("--base_url", type=str, default=URL, help="Base URL for API")
    parser.add_argument("--api_key", type=str, default=API_KEY, help="API key")
    parser.add_argument("--pack_file", type=str, default=None, help="Single pack file to run")
    parser.add_argument("--backend", type=str, default="vllm", choices=["vllm", "openai"], help="Backend type")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="Max concurrent requests")
    parser.add_argument("--max_tokens", type=int, default=DEFAULT_MAX_TOKENS, help="Max tokens per request")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="Per-request timeout in seconds")
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES, help="Retry count for transient request failures")
    parser.add_argument("--results_dir", type=str, default=DEFAULT_RESULTS_DIR, help="Directory for reports and raw results")
    return parser.parse_args()


ARGS = parse_args()
CODE_FORMATS = {"code", "python", "bash", "java", "sql", "typescript", "ts", "cpp", "c", "go", "rust"}


def strip_trailing_control_markers(text):
    cleaned = text.strip()
    cleaned = re.sub(r"\n?<\|EOF\|>\s*$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_json_content(text):
    text_without_markers = strip_trailing_control_markers(text)
    json_match = re.search(r"```json\s*(.*?)\s*```", text_without_markers, re.DOTALL | re.IGNORECASE)
    return json_match.group(1).strip() if json_match else text_without_markers.strip()


def validate_term_rules(text, must_contain=None, must_contain_any_groups=None):
    issues = []
    text_lower = text.lower()

    for term in must_contain or []:
        if str(term).lower() not in text_lower:
            issues.append(f"Missing required content: {term}")

    for group in must_contain_any_groups or []:
        if not any(str(term).lower() in text_lower for term in group):
            issues.append(f"Missing one of required content group: {group}")

    return issues


def validate_json_rules(parsed, rules=None):
    if not rules:
        return []

    issues = []
    root_type = rules.get("root_type")
    if root_type == "object" and not isinstance(parsed, dict):
        issues.append("JSON root must be an object")
    if root_type == "array" and not isinstance(parsed, list):
        issues.append("JSON root must be an array")

    enum_fields = rules.get("enum_fields", {})
    if isinstance(parsed, dict):
        for field, allowed_values in enum_fields.items():
            if field in parsed and parsed[field] not in allowed_values:
                issues.append(f"Field {field} must be one of {allowed_values}")

    array_min_items = rules.get("array_min_items", {})
    array_exact_items = rules.get("array_exact_items", {})
    array_item_required_fields = rules.get("array_item_required_fields", {})
    array_fields = set(array_min_items) | set(array_exact_items) | set(array_item_required_fields)

    for field in array_fields:
        target = parsed if field == "__root__" else parsed.get(field) if isinstance(parsed, dict) else None
        if not isinstance(target, list):
            issues.append(f"Field {field} must be an array")
            continue

        min_items = array_min_items.get(field)
        if min_items is not None and len(target) < min_items:
            issues.append(f"Field {field} must contain at least {min_items} items")

        exact_items = array_exact_items.get(field)
        if exact_items is not None and len(target) != exact_items:
            issues.append(f"Field {field} must contain exactly {exact_items} items")

        required_item_fields = array_item_required_fields.get(field, [])
        if required_item_fields:
            for index, item in enumerate(target):
                if not isinstance(item, dict):
                    issues.append(f"Field {field}[{index}] must be an object")
                    break
                missing = [name for name in required_item_fields if name not in item]
                if missing:
                    issues.append(f"Field {field}[{index}] missing fields: {missing}")
                    break

    return issues


def verifier_json_validator(text, require_raw=False, required_fields=None, rules=None):
    """验证 JSON 结构的合法性，并可选校验必须字段。"""
    json_str = extract_json_content(text)

    if require_raw and "```" in text:
        return False, "JSON must be raw text without Markdown fences"

    try:
        parsed = json.loads(json_str)
        if required_fields:
            if isinstance(parsed, dict):
                missing_fields = [field for field in required_fields if field not in parsed]
            elif isinstance(parsed, list):
                missing_fields = []
                if not parsed:
                    missing_fields = required_fields[:]
                else:
                    first_item = parsed[0]
                    if isinstance(first_item, dict):
                        missing_fields = [field for field in required_fields if field not in first_item]
                    else:
                        missing_fields = required_fields[:]
            else:
                missing_fields = required_fields[:]

            if missing_fields:
                return False, f"Missing required JSON fields: {missing_fields}"

        rule_issues = validate_json_rules(parsed, rules=rules)
        if rule_issues:
            return False, "; ".join(rule_issues)

        return True, "Valid JSON"
    except json.JSONDecodeError as e:
        return False, f"JSON Parse Error: {e}"


def verifier_markdown_table(text, required_headers=None, rules=None):
    """验证 Markdown 表格结构。"""
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    table_lines = [line for line in lines if line.count("|") >= 2]

    if len(table_lines) < 2:
        return False, "Markdown table not found"

    header_line = table_lines[0]
    divider_line = table_lines[1]
    if "---" not in divider_line:
        return False, "Markdown table separator missing"

    if required_headers:
        missing_headers = [header for header in required_headers if header not in header_line]
        if missing_headers:
            return False, f"Missing Markdown table headers: {missing_headers}"

    if len(table_lines) < 3:
        return False, "Markdown table rows missing"

    row_count = len(table_lines) - 2
    min_rows = (rules or {}).get("min_rows")
    exact_rows = (rules or {}).get("exact_rows")
    if min_rows is not None and row_count < min_rows:
        return False, f"Markdown table requires at least {min_rows} rows"
    if exact_rows is not None and row_count != exact_rows:
        return False, f"Markdown table requires exactly {exact_rows} rows"

    rule_issues = validate_term_rules(
        text,
        must_contain=(rules or {}).get("must_contain"),
        must_contain_any_groups=(rules or {}).get("must_contain_any_groups"),
    )
    if rule_issues:
        return False, "; ".join(rule_issues)

    return True, "Valid Markdown table"


def verifier_markdown_sections(text, required_sections=None, rules=None):
    """验证 Markdown 标题和列表结构。"""
    lines = [line.rstrip() for line in text.strip().splitlines() if line.strip()]
    headings = [line for line in lines if line.startswith("#")]
    bullet_lines = [line for line in lines if re.match(r"^[-*]\s+", line)]

    if not headings:
        return False, "Markdown heading missing"

    if required_sections:
        missing_sections = [section for section in required_sections if not any(section in line for line in headings)]
        if missing_sections:
            return False, f"Missing Markdown sections: {missing_sections}"

    if not bullet_lines:
        return False, "Markdown bullet list missing"

    min_bullets_per_section = (rules or {}).get("min_bullets_per_section")
    if min_bullets_per_section:
        section_counts = {}
        current_section = None
        for line in lines:
            if line.startswith("#"):
                current_section = line.lstrip("#").strip()
                section_counts.setdefault(current_section, 0)
            elif current_section and re.match(r"^[-*]\s+", line):
                section_counts[current_section] = section_counts.get(current_section, 0) + 1

        section_names = required_sections or list(section_counts.keys())
        for section in section_names:
            matched_name = next((name for name in section_counts if section in name), section)
            if section_counts.get(matched_name, 0) < min_bullets_per_section:
                return False, f"Section {section} requires at least {min_bullets_per_section} bullet items"

    rule_issues = validate_term_rules(
        text,
        must_contain=(rules or {}).get("must_contain"),
        must_contain_any_groups=(rules or {}).get("must_contain_any_groups"),
    )
    if rule_issues:
        return False, "; ".join(rule_issues)

    return True, "Valid Markdown sections"


def verifier_code_analyzer(text, lang="python"):
    """使用 AST 等进行简单的代码验证"""
    code_match = re.search(
        r"```([a-zA-Z0-9_+-]*)\s*(.*?)\s*```", text, re.DOTALL
    )
    declared_lang = code_match.group(1).lower() if code_match and code_match.group(1) else ""
    code_str = code_match.group(2) if code_match else text.strip()

    if lang and lang not in {"code", "text"}:
        acceptable_langs = {lang.lower()}
        if lang.lower() == "typescript":
            acceptable_langs.add("ts")
        if lang.lower() == "ts":
            acceptable_langs.add("typescript")
        if lang.lower() == "cpp":
            acceptable_langs.update({"c++", "cc", "cxx"})
        if not code_match:
            return False, f"Missing fenced {lang} code block"
        if declared_lang not in acceptable_langs:
            return False, f"Expected {lang} code fence, got {declared_lang or 'plain'}"

    if lang == "python" or "def " in code_str or "import " in code_str or "class " in code_str:
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


def build_messages(case):
    messages = []
    system_prompt = case.get("system_prompt")
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for item in case.get("history", []):
        role = item.get("role")
        content = item.get("content")
        if role and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": case["prompt"]})
    return messages


def normalize_base_url(base_url):
    if not base_url.endswith("/chat/completions"):
        return base_url.rstrip("/") + "/chat/completions"
    return base_url


def safe_filename(value):
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', value)


def is_structured_output_case(case):
    structured_formats = {"json", "markdown_table", "markdown_sections"}
    structured_verifiers = {
        "json_validator",
        "markdown_table_validator",
        "markdown_sections_validator",
    }
    return (
        case.get("expected_format") in structured_formats
        or case.get("verifier_type") in structured_verifiers
    )


def analyze_pack_quality(pack_data):
    cases = pack_data.get("cases", [])
    prompts = [case.get("prompt", "") for case in cases]
    total_cases = len(cases)
    unique_prompts = len(set(prompts))
    duplicate_prompts = total_cases - unique_prompts
    duplicate_prompt_rate = (duplicate_prompts / total_cases * 100) if total_cases else 0

    structured_cases = sum(1 for case in cases if is_structured_output_case(case))
    structured_case_rate = (structured_cases / total_cases * 100) if total_cases else 0

    history_cases = sum(1 for case in cases if case.get("history"))
    history_case_rate = (history_cases / total_cases * 100) if total_cases else 0

    verifier_breakdown = {}
    for case in cases:
        verifier = case.get("verifier_type", "keyword_matcher")
        verifier_breakdown[verifier] = verifier_breakdown.get(verifier, 0) + 1

    keyword_cases = verifier_breakdown.get("keyword_matcher", 0)
    keyword_case_rate = (keyword_cases / total_cases * 100) if total_cases else 0

    warnings = []
    if duplicate_prompt_rate >= 50:
        warnings.append("High duplicate prompt rate")
    if structured_case_rate == 0:
        warnings.append("No structured-output cases")
    elif structured_case_rate < 30:
        warnings.append("Low structured-output coverage")
    if history_case_rate == 0 and pack_data.get("id") == "ipd-lifecycle":
        warnings.append("Lifecycle history coverage missing")
    elif pack_data.get("id") != "ipd-lifecycle" and history_case_rate == 0 and total_cases >= 10:
        warnings.append("Missing multi-turn history coverage")
    if keyword_case_rate >= 70:
        warnings.append("Keyword-only validation ratio is too high")
    if 0 < total_cases < 8:
        warnings.append("Pack sample size is too small")

    return {
        "total_cases": total_cases,
        "unique_prompts": unique_prompts,
        "duplicate_prompts": duplicate_prompts,
        "duplicate_prompt_rate": duplicate_prompt_rate,
        "structured_cases": structured_cases,
        "structured_case_rate": structured_case_rate,
        "history_cases": history_cases,
        "history_case_rate": history_case_rate,
        "keyword_cases": keyword_cases,
        "keyword_case_rate": keyword_case_rate,
        "verifier_breakdown": verifier_breakdown,
        "warnings": warnings,
    }


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
    required_fields = case.get("required_fields", [])
    required_sections = case.get("required_sections", [])
    json_rules = case.get("json_rules", {})
    markdown_table_rules = case.get("markdown_table_rules", {})
    markdown_section_rules = case.get("markdown_section_rules", {})
    format_style = case.get("format_style", "default")
    prompt = case.get("prompt", "")
    require_raw_json = format_style == "raw_json" or (
        expected_format == "json"
        and (
            "禁止包含任何 Markdown" in prompt
            or "绝对不能出现 ```json" in prompt
            or "只能是原始JSON" in prompt
            or "只能是原始JSON对象" in prompt
        )
    )

    score_format = 0
    score_logic = 0
    score_constraint = 0
    reasons = []

    if expected_format == "json":
        json_ok, json_msg = verifier_json_validator(
            text_clean,
            require_raw=require_raw_json,
            required_fields=required_fields,
            rules=json_rules,
        )
        if json_ok:
            score_format = 40
        else:
            score_format = 0
            reasons.append(json_msg)
    elif expected_format == "markdown_table":
        table_ok, table_msg = verifier_markdown_table(
            text_clean,
            required_headers=required_fields,
            rules=markdown_table_rules,
        )
        if table_ok:
            score_format = 40
        else:
            score_format = 0
            reasons.append(table_msg)
    elif expected_format == "markdown_sections":
        md_ok, md_msg = verifier_markdown_sections(
            text_clean,
            required_sections=required_sections,
            rules=markdown_section_rules,
        )
        if md_ok:
            score_format = 40
        else:
            score_format = 0
            reasons.append(md_msg)
    elif expected_format in CODE_FORMATS:
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
        v_success, v_msg = verifier_json_validator(
            text_clean,
            require_raw=require_raw_json,
            required_fields=required_fields,
            rules=json_rules,
        )
        if v_success:
            score_logic = 25
            kw_success, kw_msg = verifier_keyword_matcher(text_clean, eval_rules)
            if kw_success:
                score_logic += 15
            else:
                reasons.append(kw_msg)
        else:
            score_logic = 0
            reasons.append(v_msg)
    elif verifier_type == "markdown_table_validator":
        v_success, v_msg = verifier_markdown_table(
            text_clean,
            required_headers=required_fields,
            rules=markdown_table_rules,
        )
        if v_success:
            score_logic = 25
            kw_success, kw_msg = verifier_keyword_matcher(text_clean, eval_rules)
            if kw_success:
                score_logic += 15
            else:
                reasons.append(kw_msg)
        else:
            score_logic = 0
            reasons.append(v_msg)
    elif verifier_type == "markdown_sections_validator":
        v_success, v_msg = verifier_markdown_sections(
            text_clean,
            required_sections=required_sections,
            rules=markdown_section_rules,
        )
        if v_success:
            score_logic = 25
            kw_success, kw_msg = verifier_keyword_matcher(text_clean, eval_rules)
            if kw_success:
                score_logic += 15
            else:
                reasons.append(kw_msg)
        else:
            score_logic = 0
            reasons.append(v_msg)
    elif verifier_type == "code_analyzer":
        code_lang = expected_format if expected_format in CODE_FORMATS else case.get("required_code_language", "python")
        v_success, v_msg = verifier_code_analyzer(text_clean, lang=code_lang)
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
    base_url = normalize_base_url(ARGS.base_url)
    api_key = ARGS.api_key
    
    async with semaphore:
        sampling = case.get("sampling_defaults", {})
        temperature = sampling.get("temperature", 0.0)
        top_p = sampling.get("top_p", 0.9)

        payload = {
            "model": model_name,
            "messages": build_messages(case),
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": ARGS.max_tokens,
            "stream": False,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        max_attempts = max(1, ARGS.retries + 1)
        last_error = "Unknown error"
        total_latency = 0.0

        for attempt in range(1, max_attempts + 1):
            start_time = time.time()
            try:
                async with session.post(
                    base_url, headers=headers, json=payload, timeout=timeout
                ) as response:
                    latency = time.time() - start_time
                    total_latency += latency
                    if response.status == 200:
                        data = await response.json()
                        gen_text = data["choices"][0]["message"]["content"]
                        eval_res = evaluate_response_modular(gen_text, case)
                        return {
                            "id": case["id"],
                            "eval_res": eval_res,
                            "latency": total_latency,
                            "status": "success",
                            "attempts": attempt,
                            "gen_text": gen_text,
                            "gen_preview": gen_text[:200] + ("..." if len(gen_text) > 200 else ""),
                        }

                    response_text = await response.text()
                    last_error = f"HTTP {response.status}: {response_text[:300]}"
                    if response.status in {429, 500, 502, 503, 504} and attempt < max_attempts:
                        await asyncio.sleep(min(2 ** (attempt - 1), 5))
                        continue

                    return {
                        "id": case["id"],
                        "eval_res": evaluate_response_modular("", case),
                        "latency": total_latency,
                        "status": last_error,
                        "attempts": attempt,
                        "gen_text": "",
                        "gen_preview": "",
                    }
            except asyncio.TimeoutError:
                latency = time.time() - start_time
                total_latency += latency
                last_error = f"Timeout after {timeout}s"
            except aiohttp.ClientError as e:
                latency = time.time() - start_time
                total_latency += latency
                last_error = f"ClientError: {str(e)}"
            except Exception as e:
                latency = time.time() - start_time
                total_latency += latency
                last_error = f"Exception: {str(e)}"

            if attempt < max_attempts:
                await asyncio.sleep(min(2 ** (attempt - 1), 5))

        return {
            "id": case["id"],
            "eval_res": evaluate_response_modular("", case),
            "latency": total_latency,
            "status": last_error,
            "attempts": max_attempts,
            "gen_text": "",
            "gen_preview": "",
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


def get_report_dim_name(pack_data):
    if pack_data.get("cases"):
        first_case = pack_data["cases"][0]
        ipd_stage = first_case.get("ipd_stage", "")
        if ipd_stage:
            return normalize_ipd_stage_name(ipd_stage)

    pack_id = pack_data.get("id", "")
    return get_ipd_stage_info(pack_id).get("display_name", pack_data.get("name", "Unknown"))


def normalize_ipd_stage_name(stage_name):
    normalized = re.sub(r"\s*\([^)]*\)\s*$", "", str(stage_name)).strip()
    alias_mapping = {
        "机会识别阶段": "机会识别",
        "概念阶段": "概念阶段",
        "计划阶段": "计划阶段",
        "开发阶段": "开发阶段",
        "验证阶段": "验证阶段",
        "发布阶段": "发布阶段",
        "生命周期管理阶段": "生命周期管理",
        "组织支撑与运营": "组织支撑与运营",
    }
    return alias_mapping.get(normalized, normalized)


def get_ipd_stage_info(pack_id):
    stage_mapping = {
        "ipd-opportunity": {"stage": 0, "name": "机会识别", "display_name": "机会识别", "gate": "-", "objective": "市场洞察、用户需求分析、技术趋势扫描"},
        "ipd-concept": {"stage": 1, "name": "概念阶段(Concept)", "display_name": "概念阶段", "gate": "CDCP", "objective": "判断'做不做'"},
        "ipd-plan": {"stage": 2, "name": "计划阶段(Plan)", "display_name": "计划阶段", "gate": "PDCP", "objective": "明确'怎么做'"},
        "ipd-develop": {"stage": 3, "name": "开发阶段(Development)", "display_name": "开发阶段", "gate": "TR4", "objective": "把设计变成可工作的产品"},
        "ipd-verify": {"stage": 4, "name": "验证阶段(Validation)", "display_name": "验证阶段", "gate": "TR5/TR6", "objective": "确认'做对了没'"},
        "ipd-release": {"stage": 5, "name": "发布阶段(Launch)", "display_name": "发布阶段", "gate": "LDCP", "objective": "成功上市并放量"},
        "ipd-lifecycle": {"stage": 6, "name": "生命周期管理(Life Cycle)", "display_name": "生命周期管理", "gate": "-", "objective": "持续运营、迭代与退市"},
        "ipd-support": {"stage": -1, "name": "组织支撑与运营", "display_name": "组织支撑与运营", "gate": "-", "objective": "跨阶段支撑活动"},
    }
    return stage_mapping.get(pack_id, {"stage": -1, "name": "Unknown", "display_name": "Unknown", "gate": "-", "objective": ""})


async def run_pack(pack_file):
    with open(pack_file, "r", encoding="utf-8") as f:
        pack_data = json.load(f)

    suite = pack_data.get("cases", [])
    pack_name = pack_data.get("name", "Unknown Pack")
    dim_name = get_report_dim_name(pack_data)
    quality = analyze_pack_quality(pack_data)

    print(f"\n--- Running Bench Pack: {pack_name} ({len(suite)} cases) ---")
    if quality["warnings"]:
        print(f"Pack Quality Warning: {', '.join(quality['warnings'])}")

    semaphore = asyncio.Semaphore(max(1, ARGS.concurrency))
    async with aiohttp.ClientSession() as session:
        tasks = [
            call_model_async(session, semaphore, case, timeout=ARGS.timeout) for case in suite
        ]
        results = await asyncio.gather(*tasks)

    total_score = sum(r["eval_res"]["total"] for r in results)
    avg_score = total_score / len(suite) if suite else 0

    print(f"Pack Average Score: {avg_score:.2f}/100")

    return {
        "pack": pack_name,
        "pack_id": pack_data.get("id", ""),
        "dim": dim_name,
        "avg_score": avg_score,
        "cases": len(suite),
        "results": results,
        "quality": quality,
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
    model_name_safe = safe_filename(model_name)
    results_dir = ARGS.results_dir
    os.makedirs(results_dir, exist_ok=True)

    report_basename = f"ipd_bench_{model_name_safe}_{timestamp}_report"
    report_md_path = os.path.join(results_dir, f"{report_basename}.md")
    report_json_path = os.path.join(results_dir, f"{report_basename}.json")

    dim_summary = []
    total_cases = 0
    total_success = 0
    total_failed = 0
    overall_duplicate_prompts = 0
    overall_structured_cases = 0
    overall_history_cases = 0

    for r in all_results:
        pack_name = r["pack"]
        cases = r["cases"]
        pack_id = r.get("pack_id", "")
        stage_info = get_ipd_stage_info(pack_id)
        
        avg_format = sum(x["eval_res"]["format"] for x in r["results"]) / cases if cases else 0
        avg_logic = sum(x["eval_res"]["logic"] for x in r["results"]) / cases if cases else 0
        avg_constraint = sum(x["eval_res"]["constraint"] for x in r["results"]) / cases if cases else 0
        avg_score = r["avg_score"]
        failure_count = sum(1 for x in r["results"] if x.get("status", "") != "success")
        failure_rate = (failure_count / cases * 100) if cases else 0
        quality = r.get("quality", {})

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
            "failure_rate": failure_rate,
            "results": r["results"],
            "duplicate_prompt_rate": quality.get("duplicate_prompt_rate", 0),
            "structured_case_rate": quality.get("structured_case_rate", 0),
            "history_case_rate": quality.get("history_case_rate", 0),
            "warnings": quality.get("warnings", []),
        })

        pack_key = r.get("pf_key", pack_name.lower())
        pack_dir = os.path.join(results_dir, pack_key)
        os.makedirs(pack_dir, exist_ok=True)
        pack_json_file = os.path.join(pack_dir, f"{pack_key}_{model_name_safe}_{timestamp}.json")
        with open(pack_json_file, "w", encoding="utf-8") as pf:
            json.dump(r["results"], pf, ensure_ascii=False, indent=2)

        total_cases += cases
        total_success += sum(1 for x in r["results"] if x["eval_res"]["total"] == 100)
        total_failed += sum(1 for x in r["results"] if x["eval_res"]["total"] == 0)
        overall_duplicate_prompts += quality.get("duplicate_prompts", 0)
        overall_structured_cases += quality.get("structured_cases", 0)
        overall_history_cases += quality.get("history_cases", 0)

    dim_summary_sorted = sorted(dim_summary, key=lambda x: x["stage_num"])
    
    dim_summary_filtered = [d for d in dim_summary_sorted if d["stage_num"] >= 0]
    support_stages = [d for d in dim_summary_sorted if d["stage_num"] < 0]
    dim_summary_final = dim_summary_filtered + support_stages

    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "model": model_name,
                "backend": backend,
                "base_url": normalize_base_url(base_url),
                "timestamp": timestamp,
                "total_cases": total_cases,
                "summary": dim_summary_final,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("========================================================\n")
        f.write(f"IPD标准开发流程 - 【{model_name}】大模型企业级选型能力评估报告\n")
        f.write("========================================================\n")
        f.write(f"评测时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"模型: {model_name} | Backend: {backend}\n")
        f.write(f"结构化汇总JSON已落盘至: {report_json_path}\n")
        f.write(f"各 Pack 详细追踪记录(带打分与I/O)已落盘至: {results_dir}/<pack>/<pack>_{model_name_safe}_{timestamp}.json\n\n")

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
        header = f"{'阶段':<6} | {'评测维度 (IPD Stage)':<32} | {'综合得分':>10} | {'格式规范':>10} | {'业务逻辑':>10} | {'指令遵循':>10} | {'失败率':>6}\n"
        f.write(header + "\n")
        f.write("-" * len(header) + "\n")

        for d in dim_summary_final:
            stage_display = f"S{d['stage_num']}" if d['stage_num'] >= 0 else "支撑"
            dim_display = d["dim"][:30] if len(d["dim"]) > 30 else d["dim"]
            f.write(f"{stage_display:<6} | {dim_display:<32} | {d['avg_score']:>7.1f}分 | {d['avg_format']:>8.1f}分 | {d['avg_logic']:>8.1f}分 | {d['avg_constraint']:>8.1f}分 | {d['failure_rate']:>5.1f}%\n")

        f.write("\n## 三、评测集质量画像\n")
        f.write("| 阶段 | Pack | Prompt重复率 | 结构化用例占比 | 多轮History占比 | 风险提示 |\n")
        f.write("|------|------|-------------|----------------|------------------|----------|\n")
        for d in dim_summary_final:
            stage_display = f"S{d['stage_num']}" if d['stage_num'] >= 0 else "支撑"
            warnings = " / ".join(d.get("warnings", [])) if d.get("warnings") else "-"
            f.write(
                f"| {stage_display} | {d['pack_name']} | {d['duplicate_prompt_rate']:.1f}% | {d['structured_case_rate']:.1f}% | {d['history_case_rate']:.1f}% | {warnings} |\n"
            )

        overall_duplicate_rate = (overall_duplicate_prompts / total_cases * 100) if total_cases else 0
        overall_structured_rate = (overall_structured_cases / total_cases * 100) if total_cases else 0
        overall_history_rate = (overall_history_cases / total_cases * 100) if total_cases else 0

        f.write("\n### 3.1 数据集健康度汇总\n")
        f.write("| 指标 | 数值 |\n")
        f.write("|------|------|\n")
        f.write(f"| 总用例数 | {total_cases} |\n")
        f.write(f"| Prompt重复占比 | {overall_duplicate_rate:.1f}% |\n")
        f.write(f"| 结构化输出用例占比 | {overall_structured_rate:.1f}% |\n")
        f.write(f"| 多轮History用例占比 | {overall_history_rate:.1f}% |\n\n")

        f.write("## 四、选型决策建议 (Model Selection Guide)\n")
        f.write("### 4.1 综合评分 (Overall Score)\n")
        
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
        
        f.write("### 4.2 各阶段能力阈值说明\n")
        f.write("| IPD阶段 | 关键评审指标 | 通过阈值 |\n")
        f.write("|--------|-------------|---------|\n")
        f.write("| S0-S1 (机会识别/概念) | 业务逻辑推理(40分) | >=25分 |\n")
        f.write("| S2 (计划) | JSON结构化输出(40分) | >=35分 |\n")
        f.write("| S3 (开发) | 代码生成与AST解析(40分) | >=30分 |\n")
        f.write("| S4 (验证) | 功能/性能/兼容性验证(40分) | >=20分 |\n")
        f.write("| S5 (发布) | 市场洞察与GTM内容生成(40分) | >=25分 |\n")
        f.write("| S6 (生命周期) | 故障诊断与日志分析(40分) | >=25分 |\n")

        f.write("\n### 4.3 选型建议\n")
        f.write(" 1. 如果【格式规范】低于 30分 (特别是结构化输出/工具调用维度)，说明该模型无法直接接入业务 API 代码，必须在外层套用复杂的正则清洗器或重试机制。\n")
        f.write(" 2. 如果【业务逻辑】低于 30分，说明模型在对应场景（如代码生成、长文本提取）的智商不足，存在严重幻觉或能力短板，不建议在此业务域使用。\n")
        f.write(" 3. 如果【指令遵循】偏低，说明模型容易\"废话连篇\"或不遵守思维链约束，调优成本极高。\n")
        f.write(" 4. S2计划阶段对JSON结构化输出要求最高，建议优先评估此阶段得分。\n")
        f.write(" 5. S3开发阶段需要通过AST语法验证，建议结合代码正确性综合评估。\n")
        f.write(" 6. 如果某个 Pack 的 Prompt重复率超过 50%，建议不要直接用其均分做模型选型结论，应先进行去重或分层抽样。\n")
        f.write(" 7. 如果结构化输出用例占比过低，则格式得分不能代表模型真实 API 接入能力，需要补充 JSON/Markdown/工具调用测试。\n")

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

    print(f"\nJSON summary saved to {report_json_path}")
    print(f"Markdown report saved to {report_md_path}")


if __name__ == "__main__":
    asyncio.run(main())