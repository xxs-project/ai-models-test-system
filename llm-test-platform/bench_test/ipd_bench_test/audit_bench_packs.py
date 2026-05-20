import argparse
import glob
import json
import os


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


def analyze_pack(pack_path):
    with open(pack_path, "r", encoding="utf-8") as file:
        pack_data = json.load(file)

    cases = pack_data.get("cases", [])
    prompts = [case.get("prompt", "") for case in cases]
    total_cases = len(cases)
    unique_prompts = len(set(prompts))
    duplicate_prompts = total_cases - unique_prompts
    duplicate_rate = (duplicate_prompts / total_cases * 100) if total_cases else 0
    structured_cases = sum(1 for case in cases if is_structured_output_case(case))
    structured_rate = (structured_cases / total_cases * 100) if total_cases else 0
    history_cases = sum(1 for case in cases if case.get("history"))
    history_rate = (history_cases / total_cases * 100) if total_cases else 0

    verifier_breakdown = {}
    for case in cases:
        verifier = case.get("verifier_type", "keyword_matcher")
        verifier_breakdown[verifier] = verifier_breakdown.get(verifier, 0) + 1

    keyword_cases = verifier_breakdown.get("keyword_matcher", 0)
    keyword_rate = (keyword_cases / total_cases * 100) if total_cases else 0

    warnings = []
    if duplicate_rate >= 50:
        warnings.append("高重复")
    if structured_rate == 0:
        warnings.append("缺少结构化输出")
    elif structured_rate < 30:
        warnings.append("结构化输出占比偏低")
    if pack_data.get("id") == "ipd-lifecycle" and history_rate == 0:
        warnings.append("生命周期缺少history")
    elif pack_data.get("id") != "ipd-lifecycle" and history_rate == 0 and total_cases >= 10:
        warnings.append("缺少多轮history覆盖")
    if keyword_rate >= 70:
        warnings.append("关键词验证占比过高")
    if 0 < total_cases < 8:
        warnings.append("样本量偏小")

    return {
        "file": os.path.basename(pack_path),
        "pack_id": pack_data.get("id", ""),
        "cases": total_cases,
        "unique_prompts": unique_prompts,
        "duplicate_prompts": duplicate_prompts,
        "duplicate_rate": duplicate_rate,
        "structured_cases": structured_cases,
        "structured_rate": structured_rate,
        "history_cases": history_cases,
        "history_rate": history_rate,
        "keyword_cases": keyword_cases,
        "keyword_rate": keyword_rate,
        "verifier_breakdown": verifier_breakdown,
        "warnings": warnings,
    }


def parse_args():
    parser = argparse.ArgumentParser(description="Audit benchmark pack quality")
    parser.add_argument(
        "--pack_file",
        type=str,
        default=None,
        help="Audit a single benchmark pack instead of all packs",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if args.pack_file:
        pack_files = [args.pack_file]
    else:
        pack_files = sorted(glob.glob(os.path.join("bench_packs", "*.json")))

    analyses = [analyze_pack(pack_file) for pack_file in pack_files]

    print("Pack Quality Audit")
    print("==================")
    for item in analyses:
        warnings = ", ".join(item["warnings"]) if item["warnings"] else "-"
        print(
            f"{item['file']}: cases={item['cases']}, dup_rate={item['duplicate_rate']:.1f}%, "
            f"structured={item['structured_rate']:.1f}%, history={item['history_rate']:.1f}%, "
            f"keyword={item['keyword_rate']:.1f}%, warnings={warnings}"
        )
        print(f"  verifier_breakdown={item['verifier_breakdown']}")

    total_cases = sum(item["cases"] for item in analyses)
    total_duplicates = sum(item["duplicate_prompts"] for item in analyses)
    total_structured = sum(item["structured_cases"] for item in analyses)
    total_history = sum(item["history_cases"] for item in analyses)

    duplicate_rate = (total_duplicates / total_cases * 100) if total_cases else 0
    structured_rate = (total_structured / total_cases * 100) if total_cases else 0
    history_rate = (total_history / total_cases * 100) if total_cases else 0

    print("\nOverall")
    print("-------")
    print(f"total_cases={total_cases}")
    print(f"duplicate_rate={duplicate_rate:.1f}%")
    print(f"structured_rate={structured_rate:.1f}%")
    print(f"history_rate={history_rate:.1f}%")


if __name__ == "__main__":
    main()