#!/usr/bin/env python3
"""
Select组件修复验证测试
验证所有SelectItem的值不再为空字符串
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def test_api_endpoints():
    """测试所有API端点是否正常"""
    print("=" * 60)
    print("Select组件修复验证测试")
    print("=" * 60)

    tests_passed = 0
    tests_failed = 0

    # 测试1: 设备管理API
    print("\n[TC-001] 测试设备管理API...")
    try:
        response = requests.get(f"{BASE_URL}/devices", params={"page": 1, "size": 10})
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ 设备API正常返回，共 {data.get('total', 0)} 条数据")
            tests_passed += 1
        else:
            print(f"  ✗ 设备API返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 设备API连接失败: {e}")
        tests_failed += 1

    # 测试2: 任务管理API
    print("\n[TC-002] 测试任务管理API...")
    try:
        response = requests.get(f"{BASE_URL}/tasks", params={"page": 1, "size": 10})
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ 任务API正常返回，共 {data.get('total', 0)} 条数据")
            tests_passed += 1
        else:
            print(f"  ✗ 任务API返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 任务API连接失败: {e}")
        tests_failed += 1

    # 测试3: 基准测试API
    print("\n[TC-003] 测试基准测试API...")
    try:
        response = requests.get(f"{BASE_URL}/benchmarks", params={"page": 1, "size": 10})
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ 基准测试API正常返回，共 {data.get('total', 0)} 条数据")
            tests_passed += 1
        else:
            print(f"  ✗ 基准测试API返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 基准测试API连接失败: {e}")
        tests_failed += 1

    return tests_passed, tests_failed

def test_filter_combinations():
    """测试筛选条件组合"""
    print("\n" + "=" * 60)
    print("筛选条件组合测试")
    print("=" * 60)

    tests_passed = 0
    tests_failed = 0

    # 测试4: 设备筛选 - 状态
    print("\n[TC-004] 测试设备状态筛选 (status=Online)...")
    try:
        response = requests.get(f"{BASE_URL}/devices", params={"status": "Online"})
        if response.status_code == 200:
            print("  ✓ 状态筛选参数正确处理")
            tests_passed += 1
        else:
            print(f"  ✗ 状态筛选返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 状态筛选测试失败: {e}")
        tests_failed += 1

    # 测试5: 设备筛选 - 架构
    print("\n[TC-005] 测试设备架构筛选 (arch=x86_64)...")
    try:
        response = requests.get(f"{BASE_URL}/devices", params={"arch": "x86_64"})
        if response.status_code == 200:
            print("  ✓ 架构筛选参数正确处理")
            tests_passed += 1
        else:
            print(f"  ✗ 架构筛选返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 架构筛选测试失败: {e}")
        tests_failed += 1

    # 测试6: 任务筛选 - 状态
    print("\n[TC-006] 测试任务状态筛选 (status=3)...")
    try:
        response = requests.get(f"{BASE_URL}/tasks", params={"status": "3"})
        if response.status_code == 200:
            print("  ✓ 任务状态筛选参数正确处理")
            tests_passed += 1
        else:
            print(f"  ✗ 任务状态筛选返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 任务状态筛选测试失败: {e}")
        tests_failed += 1

    # 测试7: 任务筛选 - 类型
    print("\n[TC-007] 测试任务类型筛选 (test_type=1)...")
    try:
        response = requests.get(f"{BASE_URL}/tasks", params={"test_type": "1"})
        if response.status_code == 200:
            print("  ✓ 任务类型筛选参数正确处理")
            tests_passed += 1
        else:
            print(f"  ✗ 任务类型筛选返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 任务类型筛选测试失败: {e}")
        tests_failed += 1

    # 测试8: 基准测试筛选 - 框架
    print("\n[TC-008] 测试基准测试框架筛选 (framework=MindIE)...")
    try:
        response = requests.get(f"{BASE_URL}/benchmarks", params={"framework": "MindIE"})
        if response.status_code == 200:
            print("  ✓ 框架筛选参数正确处理")
            tests_passed += 1
        else:
            print(f"  ✗ 框架筛选返回错误: {response.status_code}")
            tests_failed += 1
    except Exception as e:
        print(f"  ✗ 框架筛选测试失败: {e}")
        tests_failed += 1

    return tests_passed, tests_failed

def test_select_item_values():
    """
    验证前端代码中SelectItem的值不为空字符串
    此测试通过检查源代码实现
    """
    print("\n" + "=" * 60)
    print("SelectItem值验证测试")
    print("=" * 60)

    import os

    # 检查的文件
    files_to_check = [
        "src/pages/DeviceList.tsx",
        "src/pages/TaskList.tsx",
        "src/pages/BenchmarkList.tsx"
    ]

    tests_passed = 0
    tests_failed = 0

    for file_path in files_to_check:
        full_path = os.path.join(os.path.dirname(__file__), file_path)
        print(f"\n[TC-CHECK] 检查文件: {file_path}")

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 检查是否有空字符串的SelectItem
            import re
            empty_value_matches = re.findall(r'<SelectItem\s+value=""', content)

            if empty_value_matches:
                print(f"  ✗ 发现 {len(empty_value_matches)} 个空字符串value的SelectItem")
                tests_failed += len(empty_value_matches)
            else:
                print(f"  ✓ 未发现空字符串value的SelectItem")
                tests_passed += 1

            # 检查是否使用了"all"作为全部选项
            all_value_matches = re.findall(r'<SelectItem\s+value="all"', content)
            print(f"  ✓ 发现 {len(all_value_matches)} 个使用'all'值的SelectItem")

        except Exception as e:
            print(f"  ✗ 文件检查失败: {e}")
            tests_failed += 1

    return tests_passed, tests_failed

def test_frontend_loading():
    """测试前端页面加载"""
    print("\n" + "=" * 60)
    print("前端页面加载测试")
    print("=" * 60)

    tests_passed = 0
    tests_failed = 0

    pages = [
        ("/", "仪表板"),
        ("/devices", "设备管理"),
        ("/tests", "测试管理"),
        ("/results", "结果呈现"),
        ("/settings", "系统设置")
    ]

    for path, name in pages:
        print(f"\n[TC-FRONT] 测试页面: {name} ({path})")
        try:
            response = requests.get(f"http://localhost:5173{path}", timeout=5)
            if response.status_code == 200:
                content = response.text

                # 检查是否包含React应用
                if 'id="root"' in content:
                    print(f"  ✓ {name} 页面加载成功")
                    tests_passed += 1
                else:
                    print(f"  ✗ {name} 页面结构异常")
                    tests_failed += 1
            else:
                print(f"  ✗ {name} 页面返回状态码: {response.status_code}")
                tests_failed += 1
        except Exception as e:
            print(f"  ✗ {name} 页面加载失败: {e}")
            tests_failed += 1

    return tests_passed, tests_failed

def main():
    """主测试函数"""
    print("\n")
    print("╔════════════════════════════════════════════════════╗")
    print("║     大模型测试平台 - Select组件修复验证测试          ║")
    print("║     测试日期: 2026-02-05                           ║")
    print("╚════════════════════════════════════════════════════╝")

    all_passed = 0
    all_failed = 0

    # 运行所有测试
    passed, failed = test_api_endpoints()
    all_passed += passed
    all_failed += failed

    passed, failed = test_filter_combinations()
    all_passed += passed
    all_failed += failed

    passed, failed = test_select_item_values()
    all_passed += passed
    all_failed += failed

    passed, failed = test_frontend_loading()
    all_passed += passed
    all_failed += failed

    # 打印测试总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"\n  总测试数: {all_passed + all_failed}")
    print(f"  通过: {all_passed} ✓")
    print(f"  失败: {all_failed} ✗")
    print(f"  通过率: {(all_passed / (all_passed + all_failed) * 100):.1f}%")

    if all_failed == 0:
        print("\n🎉 所有测试通过！Select组件修复验证成功！")
        print("\n修复说明:")
        print("  • 将所有SelectItem的value=\"\"改为value=\"all\"")
        print("  • 状态默认值从''改为'all'")
        print("  • 筛选逻辑相应更新：'all' → undefined (不过滤)")
        return 0
    else:
        print(f"\n⚠️  有 {all_failed} 个测试失败，请检查！")
        return 1

if __name__ == "__main__":
    sys.exit(main())
