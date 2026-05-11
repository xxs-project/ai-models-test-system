#!/usr/bin/env python3
"""
验证测试类型默认值修复

要求：测试类型默认为性能测试（test_type=1）
"""

print("=" * 80)
print("测试类型默认值验证")
print("=" * 80)

print("\n【要求】")
print("  测试类型默认应为：性能测试 (test_type=1)")

print("\n【验证位置】")
print("  1. 第162行 - 表单初始默认值")
print("  2. 第278行 - 编辑任务时默认值")  
print("  3. 第362行 - 点击创建按钮时默认值")

print("\n【验证结果】")

lines = [
    (162, "表单初始默认值", "test_type: 1"),
    (278, "编辑任务时默认值", "test_type: task.test_type ?? 1"),
    (362, "创建任务按钮时默认值", "test_type: 1"),
]

all_passed = True
for line_num, location, expected_content in lines:
    # 读取文件验证
    with open('src/pages/TaskList.tsx', 'r') as f:
        lines_content = f.readlines()
        actual = lines_content[line_num - 1].strip()
    
    if "test_type: 1" in actual or "test_type: task.test_type ?? 1" in actual:
        status = "✅"
        print(f"  {status} 第{line_num}行 ({location}): {actual}")
    else:
        status = "❌"
        print(f"  {status} 第{line_num}行 ({location}): {actual}")
        all_passed = False

print("\n【总结】")
if all_passed:
    print("✅ 所有测试类型默认值已修复为 1（性能测试）")
else:
    print("❌ 存在未修复的默认值")

print("=" * 80)
