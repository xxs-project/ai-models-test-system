#!/usr/bin/env python3
import json
import os
import re

# 定义公司名称替换映射
REPLACEMENTS = {
    "FusionPoD整机柜液冷服务器": "某型号液冷服务器",
    "FusionServer AI算力集群": "某AI算力集群",
    "xERP企业核心经营系统": "某企业ERP系统",
    "xRAY智能数据与AI使能平台": "某智能数据AI平台",
    "FusionWatt智能液冷超充站": "某智能液冷超充站",
    "FusionOne HCI超融合基础设施": "某HCI超融合基础设施",
    "FusionDirector服务器管理平台": "某服务器管理平台",
    "FusionXpark随身智能体平台": "某智能体平台",
    "工作站X3 8000边缘计算节点": "某边缘计算节点",
    "FusionOS服务器操作系统": "某服务器操作系统",
    # 英文名也需要替换
    "FusionDirector": "某服务器管理平台",
    "xERP": "某ERP系统",
    "xRAY": "某AI平台",
    "FusionPoD": "某液冷服务器",
    "FusionServer": "某AI服务器",
    "FusionWatt": "某超充站",
    "FusionOne": "某超融合",
    "FusionOS": "某操作系统",
    "FusionXpark": "某智能体",
}

def replace_in_string(s):
    """替换字符串中的公司名称"""
    result = s
    for old, new in REPLACEMENTS.items():
        result = result.replace(old, new)
    return result

def replace_company_names(obj):
    """递归替换JSON中的公司名称"""
    if isinstance(obj, dict):
        new_dict = {}
        for key, value in obj.items():
            if key in ["domain", "feature"]:
                new_dict[key] = replace_in_string(value) if isinstance(value, str) else value
            elif isinstance(value, str):
                # 对所有字符串字段进行替换
                new_dict[key] = replace_in_string(value)
            else:
                new_dict[key] = replace_company_names(value)
        return new_dict
    elif isinstance(obj, list):
        return [replace_company_names(item) for item in obj]
    elif isinstance(obj, str):
        return replace_in_string(obj)
    return obj

def process_file(filepath):
    """处理单个JSON文件"""
    print(f"处理文件: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    new_data = replace_company_names(data)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    
    print(f"  完成: {filepath}")

def main():
    # 处理bench_packs目录下的文件
    bench_packs_dir = "bench_packs"
    for filename in os.listdir(bench_packs_dir):
        if filename.endswith(".json") and not filename.endswith("_report.json"):
            filepath = os.path.join(bench_packs_dir, filename)
            process_file(filepath)
    
    # 处理主测试套件文件
    test_suite_files = [
        "ipd_test_suite_v3_intelligence.json",
        "xfusion_ipd_test_suite.json"
    ]
    
    for filename in test_suite_files:
        if os.path.exists(filename):
            process_file(filename)
    
    print("\n所有文件处理完成!")

if __name__ == "__main__":
    main()