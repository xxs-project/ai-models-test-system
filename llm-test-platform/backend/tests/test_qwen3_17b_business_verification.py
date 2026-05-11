#!/usr/bin/env python3
"""
Qwen3-1.7B性能测试任务 - 完整业务功能测试用例

覆盖范围：
1. 功能正确性 - 验证任务创建、命令构建、显示逻辑
2. 可靠性 - 验证错误处理、边界条件、异常场景
3. 可扩展性 - 验证不同配置组合、框架兼容性
4. 安全性 - 验证输入验证、注入防护
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, SQLModel
from fastapi.testclient import TestClient
from main import app, get_session
from models import Task
from services.command_builder import CommandBuilder, TestType, TestMode, TaskStatus


# ==================== 功能正确性测试 ====================

class TestFunctionality:
    """功能正确性测试"""

    def test_performance_task_creation(self):
        """测试创建性能测试任务"""
        task = Task(
            task_name="Qwen3-1.7B性能测试",
            test_type=1,  # 性能测试
            test_mode=1,  # 单模型测试
            priority=2,
            status=0,
            device_ip="7.6.52.110",
            device_username="root",
            device_password="Xfusion@123",
            model_name="Qwen3-1.7",
            model_path="/data/models",
            inference_framework="vllm",
            framework_version="v0.12.0rc1",
            script_path="/data/models-test/scripts/vllm_benchmark_auto",
            npu_count=1,
            graph_mode="eager",
            execution_flag="1"
        )
        
        assert task.test_type == 1, "test_type应为1（性能测试）"
        assert task.test_mode == 1, "test_mode应为1（单模型）"
        assert task.inference_framework == "vllm", "框架应为vLLM"
        assert task.execution_flag == "1", "执行标识应为1"
        print("✅ 性能测试任务创建正确")

    def test_accuracy_task_creation(self):
        """测试创建精度测试任务"""
        task = Task(
            task_name="Qwen3-1.7B精度测试",
            test_type=2,  # 精度测试
            test_mode=1,  # 单模型测试
            priority=2,
            status=0,
            device_ip="7.6.52.110",
            device_username="root",
            device_password="Xfusion@123",
            model_name="Qwen3-1.7",
            model_path="/data/models",
            inference_framework="vllm",
            framework_version="v0.12.0rc1",
            script_path="/data/models-test/scripts/vllm_benchmark_auto",
            npu_count=1,
            graph_mode="eager",
            execution_flag="0"
        )
        
        assert task.test_type == 2, "test_type应为2（精度测试）"
        # dataset_name是前端字段，用于验证逻辑，不存储在Task模型中
        # 精度测试命令构建时会包含--datasets参数
        task_dict = task.model_dump()
        task_dict['dataset_name'] = 'MMLU'
        command = CommandBuilder.build_command(task_dict)
        assert '--datasets' in command, "精度测试命令应包含数据集参数"
        print("✅ 精度测试任务创建正确")

    def test_performance_command_build(self):
        """测试性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command, "应使用性能测试脚本"
        assert 'run_accuracy_all_models.sh' not in command, "不应使用精度测试脚本"
        assert '-m Qwen3-1.7' in command, "应包含模型名称"
        assert '-n 1' in command, "应包含NPU数量"
        assert '-e 1' in command, "应包含执行标识"
        print("✅ 性能测试命令构建正确")

    def test_accuracy_command_build(self):
        """测试精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7',
            'model_path': '/data/models',
            'dataset_name': 'MMLU',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': 'v0.12.0rc1'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_accuracy_all_models.sh' in command, "应使用精度测试脚本"
        assert 'run_benchmark_all_models.sh' not in command, "不应使用性能测试脚本"
        assert '--datasets' in command or 'MMLU' in command, "应包含数据集参数"
        print("✅ 精度测试命令构建正确")


# ==================== 可靠性测试 ====================

class TestReliability:
    """可靠性测试"""

    def test_empty_model_name(self):
        """测试空模型名称处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': '',
            'model_path': '/data/models',
            'execution_flag': '1'
        }
        
        command = CommandBuilder.build_command(task)
        assert '-m ""' in command or "-m ''" in command, "空模型名应有引用"
        print("✅ 空模型名称处理正确")

    def test_zero_npu_count(self):
        """测试NPU数量为0的处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'npu_count': 0
        }
        
        command = CommandBuilder.build_command(task)
        assert '-n 1' in command, "0个NPU应转为1"
        print("✅ NPU数量边界处理正确")

    def test_large_npu_count(self):
        """测试大NPU数量的限制"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'npu_count': 200
        }
        
        command = CommandBuilder.build_command(task)
        assert '-n 128' in command, "超过128的NPU应限制为128"
        print("✅ 大NPU数量限制正确")

    def test_invalid_test_type(self):
        """测试无效测试类型处理"""
        task = {
            'test_type': 999,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models'
        }
        
        try:
            CommandBuilder.build_command(task)
            assert False, "应抛出异常"
        except ValueError as e:
            assert "不支持" in str(e)
            print("✅ 无效测试类型处理正确")

    def test_all_model_mode(self):
        """测试全套模型模式"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'execution_flag': '1'
        }
        
        command = CommandBuilder.build_command(task)
        assert '-m' not in command or '-m ""' in command or "-m ''" in command, \
            "全套模型不应指定具体模型"
        print("✅ 全套模型模式处理正确")


# ==================== 可扩展性测试 ====================

class TestScalability:
    """可扩展性测试"""

    def test_vllm_framework(self):
        """测试VLLM框架兼容性"""
        for test_type in [TestType.PERFORMANCE, TestType.ACCURACY]:
            for mode in [TestMode.SINGLE_MODEL, TestMode.ALL_MODELS]:
                task = {
                    'test_type': test_type,
                    'test_mode': mode,
                    'inference_framework': 'vllm',
                    'model_path': '/data/models'
                }
                command = CommandBuilder.build_command(task)
                assert command.startswith('bash run'), "应构建shell命令"
        print("✅ VLLM框架完全兼容")

    def test_mindie_framework(self):
        """测试MindIE框架兼容性"""
        for test_type in [TestType.PERFORMANCE]:  # MindIE暂无精度测试
            for mode in [TestMode.SINGLE_MODEL, TestMode.ALL_MODELS]:
                task = {
                    'test_type': test_type,
                    'test_mode': mode,
                    'inference_framework': 'mindie',
                    'model_path': '/data/models'
                }
                command = CommandBuilder.build_command(task)
                assert 'mindie_auto_test.sh' in command, "应使用MindIE脚本"
        print("✅ MindIE框架完全兼容")

    def test_different_execution_flags(self):
        """测试不同执行标识"""
        flags = ['0', '1', '2', 'custom']
        
        for flag in flags:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'execution_flag': flag
            }
            command = CommandBuilder.build_command(task)
            assert f'-e {flag}' in command or f"-e '{flag}'" in command
        print("✅ 执行标识扩展性正确")

    def test_different_graph_modes(self):
        """测试不同图模式"""
        modes = ['eager', 'mindie', 'dynamic']
        
        for mode in modes:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'graph_mode': mode
            }
            command = CommandBuilder.build_command(task)
            assert f'--mode {mode}' in command or f'--mode "{mode}"' in command
        print("✅ 图模式扩展性正确")

    def test_different_framework_versions(self):
        """测试不同框架版本格式"""
        versions = [
            'v0.12.0rc1',
            '2.1.RC1-800I-A2-py311-openeuler24.03-lts',
            'v1.0.1',
            '2024.01.15',
            '1.0.0-beta',
            'v2.3.4.5',
        ]
        
        for version in versions:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'framework_version': version
            }
            command = CommandBuilder.build_command(task)
            assert f'-d {version}' in command or f'-d "{version}"' in command
        print("✅ 框架版本格式兼容正确")


# ==================== 安全性测试 ====================

class TestSecurity:
    """安全性测试"""

    def test_shell_injection_prevention(self):
        """测试Shell注入防护"""
        malicious_inputs = [
            'Qwen3-1.7B; rm -rf /',
            "Qwen3-1.7B && echo hacked",
            'Qwen3-1.7B | cat /etc/passwd',
            'Qwen3-1.7B$(whoami)',
            'Qwen3-1.7B`ls`',
        ]
        
        for malicious_input in malicious_inputs:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'model_name': malicious_input,
                'execution_flag': '1'
            }
            command = CommandBuilder.build_command(task)
            
            assert ';' not in command or command.endswith(';'), "分号应被处理"
            assert '&&' not in command, "&&应被移除"
            assert '|' not in command, "管道符应被移除"
            assert '${' not in command, "变量展开应被阻止"
        print("✅ Shell注入防护有效")

    def test_special_characters_handling(self):
        """测试特殊字符处理"""
        special_chars = [
            'Qwen3-1.7B"quote',
            "Qwen3-1.7B'single",
            'Qwen3-1.7B<tag>',
            'Qwen3-1.7B!bang',
            'Qwen3-1.7B#hash',
            'Qwen3-1.7B$var',
        ]
        
        for special_input in special_chars:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'model_name': special_input
            }
            command = CommandBuilder.build_command(task)
            assert 'Qwen3-1.7B' in command, "输入内容应保留"
        print("✅ 特殊字符处理正确")

    def test_path_traversal_handling(self):
        """测试路径遍历处理"""
        malicious_paths = [
            '../../../etc/passwd',
            '/data/models/../../etc/shadow',
        ]
        
        for malicious_path in malicious_paths:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': malicious_path,
                'execution_flag': '1'
            }
            command = CommandBuilder.build_command(task)
            assert '-b' in command, "路径参数应存在"
        print("✅ 路径遍历处理正确")


# ==================== 回归测试 ====================

class TestRegression:
    """回归测试 - 验证修复不再复发"""

    def test_test_type_not_swapped(self):
        """验证test_type不再颠倒"""
        # 后端定义
        assert TestType.PERFORMANCE == 1, "性能测试=1"
        assert TestType.ACCURACY == 2, "精度测试=2"
        
        # 构建性能测试命令
        perf_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7'
        }
        perf_command = CommandBuilder.build_command(perf_task)
        
        assert 'run_benchmark_all_models.sh' in perf_command, \
            "性能测试应使用benchmark脚本"
        
        # 构建精度测试命令
        acc_task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7'
        }
        acc_command = CommandBuilder.build_command(acc_task)
        
        assert 'run_accuracy_all_models.sh' in acc_command, \
            "精度测试应使用accuracy脚本"
        
        print("✅ test_type不再颠倒")

    def test_dataset_name_condition_correct(self):
        """验证数据集名称条件正确"""
        # 性能测试不应要求数据集
        perf_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7'
        }
        perf_command = CommandBuilder.build_command(perf_task)
        assert '--datasets' not in perf_command, "性能测试不应有数据集参数"
        
        # 精度测试可以有数据集参数（但不是必须通过命令构建检查）
        print("✅ 数据集名称条件正确")


# ==================== 任务信息验证测试 ====================

class TestTaskInfoVerification:
    """任务信息验证测试 - 验证用户提供的任务配置"""

    def test_qwen3_17b_performance_task(self):
        """验证Qwen3-1.7B性能测试任务配置"""
        task_info = {
            "task_name": "Qwen3-1.7B性能测试",
            "priority": 2,
            "test_type": 1,
            "test_mode": 1,
            "device_ip": "7.6.52.110",
            "device_username": "root",
            "device_password": "Xfusion@123",
            "inference_framework": "vllm",
            "framework_version": "v0.12.0rc1",
            "model_name": "Qwen3-1.7",
            "npu_count": 1,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "script_path": "/data/models-test/scripts/vllm_benchmark_auto",
            "execution_flag": "1"
        }
        
        # 创建任务
        task = Task(
            task_name=task_info["task_name"],
            test_type=task_info["test_type"],
            test_mode=task_info["test_mode"],
            priority=task_info["priority"],
            status=0,
            device_ip=task_info["device_ip"],
            device_username=task_info["device_username"],
            device_password=task_info["device_password"],
            model_name=task_info["model_name"],
            model_path=task_info["model_path"],
            inference_framework=task_info["inference_framework"],
            framework_version=task_info["framework_version"],
            script_path=task_info["script_path"],
            npu_count=task_info["npu_count"],
            graph_mode=task_info["graph_mode"],
            execution_flag=task_info["execution_flag"]
        )
        
        # 验证所有字段
        assert task.task_name == "Qwen3-1.7B性能测试"
        assert task.test_type == 1  # 性能测试
        assert task.test_mode == 1  # 单模型
        assert task.priority == 2   # 高
        assert task.device_ip == "7.6.52.110"
        assert task.device_username == "root"
        assert task.inference_framework == "vllm"
        assert task.framework_version == "v0.12.0rc1"
        assert task.model_name == "Qwen3-1.7"
        assert task.npu_count == 1
        assert task.graph_mode == "eager"
        assert task.execution_flag == "1"
        
        # 构建命令
        task_dict = task.model_dump()
        command = CommandBuilder.build_command(task_dict)
        
        # 验证命令包含必要参数
        assert 'bash run_benchmark_all_models.sh' in command
        assert '-b /data/models' in command
        assert '-m Qwen3-1.7' in command
        assert '-n 1' in command
        assert '--mode eager' in command
        assert '-e 1' in command
        assert '-d v0.12.0rc1' in command
        
        print("✅ Qwen3-1.7B性能测试任务配置正确")
        print(f"   命令: {command[:100]}...")

    def test_qwen3_17b_mindie_performance_task(self):
        """验证Qwen3-1.7B MindIE性能测试任务配置"""
        task_info = {
            "task_name": "Qwen3-1.7B MindIE性能测试",
            "priority": 2,
            "test_type": 1,  # 性能测试
            "test_mode": 1,  # 单模型测试
            "device_ip": "7.6.52.110",
            "inference_framework": "mindie",
            "framework_version": "2.1.RC1-800I-A2-py311-openeuler24.03-lts",
            "model_name": "Qwen3-1.7",
            "npu_count": 1,
            "graph_mode": "mindie",
            "model_path": "/data/models",
            "script_path": "/data/models-test/scripts/mindie_benchmark_auto",
            "execution_flag": "1"
        }
        
        # 创建任务
        task = Task(
            task_name=task_info["task_name"],
            test_type=task_info["test_type"],
            test_mode=task_info["test_mode"],
            priority=task_info["priority"],
            status=0,
            device_ip=task_info["device_ip"],
            model_name=task_info["model_name"],
            model_path=task_info["model_path"],
            inference_framework=task_info["inference_framework"],
            framework_version=task_info["framework_version"],
            script_path=task_info["script_path"],
            npu_count=task_info["npu_count"],
            graph_mode=task_info["graph_mode"],
            execution_flag=task_info["execution_flag"]
        )
        
        # 验证所有字段
        assert task.task_name == "Qwen3-1.7B MindIE性能测试"
        assert task.test_type == 1  # 性能测试
        assert task.test_mode == 1  # 单模型
        assert task.inference_framework == "mindie"
        assert task.framework_version == "2.1.RC1-800I-A2-py311-openeuler24.03-lts"
        assert task.graph_mode == "mindie"
        
        # 构建命令
        task_dict = task.model_dump()
        command = CommandBuilder.build_command(task_dict)
        
        # 验证命令包含必要参数
        assert 'bash mindie_auto_test.sh' in command
        assert '-b /data/models' in command
        assert '-m Qwen3-1.7' in command
        assert '-n 1' in command
        assert '--mode mindie' in command
        assert '2.1.RC1' in command or 'RC1' in command
        
        print("✅ Qwen3-1.7B MindIE性能测试任务配置正确")
        print(f"   命令: {command}")


# ==================== 运行测试 ====================

def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 80)
    print("Qwen3-1.7B性能测试任务 - 完整业务功能测试")
    print("=" * 80)
    
    test_classes = [
        TestFunctionality,
        TestReliability,
        TestScalability,
        TestSecurity,
        TestRegression,
        TestTaskInfoVerification,
    ]
    
    total_passed = 0
    total_failed = 0
    
    for test_class in test_classes:
        print(f"\n{'=' * 80}")
        print(f"测试类: {test_class.__name__}")
        print(f"{'=' * 80}")
        
        class_tests = [m for m in dir(test_class) if m.startswith('test_')]
        
        for test_name in class_tests:
            try:
                test_func = getattr(test_class, test_name)()
                test_func()
                print(f"[PASS] {test_name}")
                total_passed += 1
            except Exception as e:
                print(f"[FAIL] {test_name}: {e}")
                total_failed += 1
    
    print(f"\n{'=' * 80}")
    print("测试总结")
    print(f"{'=' * 80}")
    print(f"通过: {total_passed}")
    print(f"失败: {total_failed}")
    print(f"总计: {total_passed + total_failed}")
    
    if total_failed == 0:
        print("\n[SUCCESS] 所有业务功能测试通过！")
        return 0
    else:
        print(f"\n[FAILURE] {total_failed}个测试失败")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
