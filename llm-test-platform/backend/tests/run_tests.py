"""
测试运行脚本

运行所有测试用例并生成报告
"""

import sys
import os
import subprocess

# 添加backend到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_tests():
    """运行所有测试"""
    test_files = [
        'tests/test_command_builder.py',
        'tests/test_task_queue.py',
        'tests/test_ssh_manager.py',
        'tests/test_task_executor.py',
        'tests/test_task_scheduler.py',
        'tests/test_task_execution_integration.py',
    ]
    
    print("=" * 80)
    print("大模型测试平台 - 任务提交与执行模块测试")
    print("=" * 80)
    print()
    
    all_passed = True
    
    for test_file in test_files:
        print(f"\n运行测试: {test_file}")
        print("-" * 80)
        
        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pytest', test_file, '-v', '--tb=short'],
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
            if result.returncode != 0:
                all_passed = False
                print(f"❌ {test_file} 测试失败")
            else:
                print(f"✅ {test_file} 测试通过")
                
        except subprocess.TimeoutExpired:
            print(f"❌ {test_file} 测试超时")
            all_passed = False
        except Exception as e:
            print(f"❌ {test_file} 测试运行异常: {e}")
            all_passed = False
    
    print()
    print("=" * 80)
    if all_passed:
        print("✅ 所有测试通过！")
    else:
        print("❌ 部分测试失败，请查看详细输出")
    print("=" * 80)
    
    return 0 if all_passed else 1


def run_specific_test(test_name: str):
    """运行特定测试"""
    test_mapping = {
        'command': 'tests/test_command_builder.py',
        'queue': 'tests/test_task_queue.py',
        'ssh': 'tests/test_ssh_manager.py',
        'executor': 'tests/test_task_executor.py',
        'scheduler': 'tests/test_task_scheduler.py',
        'integration': 'tests/test_task_execution_integration.py',
    }
    
    if test_name not in test_mapping:
        print(f"未知测试: {test_name}")
        print(f"可用测试: {', '.join(test_mapping.keys())}")
        return 1
    
    test_file = test_mapping[test_name]
    
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pytest', test_file, '-v', '--tb=long'],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            timeout=60
        )
        return result.returncode
    except subprocess.TimeoutExpired:
        print(f"❌ 测试超时")
        return 1
    except Exception as e:
        print(f"❌ 测试运行异常: {e}")
        return 1


if __name__ == '__main__':
    if len(sys.argv) > 1:
        # 运行特定测试
        test_name = sys.argv[1]
        sys.exit(run_specific_test(test_name))
    else:
        # 运行所有测试
        sys.exit(run_tests())
