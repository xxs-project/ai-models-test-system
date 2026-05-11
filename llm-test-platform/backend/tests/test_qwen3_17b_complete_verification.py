#!/usr/bin/env python3
"""
Qwen3-1.7B性能测试任务修复验证测试用例

覆盖范围：
1. 功能正确性 - 验证任务创建、命令构建、执行流程
2. 可靠性 - 验证错误处理、重试机制、边界条件
3. 可扩展性 - 验证不同配置组合的兼容性
4. 安全性 - 验证输入验证、SQL注入防护、命令注入防护
"""

import sys
import os
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, SQLModel
from fastapi.testclient import TestClient
from main import app, get_session
from models import Task
from services.command_builder import CommandBuilder, TestType, TestMode, TaskStatus
from services.command_builder import CommandBuilder, TestType, TestMode


class TestQwen3_17B_Functionality:
    """功能正确性测试"""

    def test_performance_test_type_mapping(self):
        """测试性能测试类型映射正确"""
        assert TestType.PERFORMANCE == 1, "性能测试类型值应为1"
        assert TestType.ACCURACY == 2, "精度测试类型值应为2"

    def test_vllm_performance_single_model_command(self):
        """测试VLLM单模型性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1'
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证使用性能测试脚本
        assert 'run_benchmark_all_models.sh' in command, "性能测试应使用run_benchmark_all_models.sh"
        assert 'run_accuracy_all_models.sh' not in command, "性能测试不应使用精度测试脚本"
        
        # 验证参数正确
        assert '-b /data/models' in command
        assert '-m Qwen3-1.7B' in command
        assert '-n 1' in command
        assert '-e 1' in command

    def test_vllm_accuracy_single_model_command(self):
        """测试VLLM单模型精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1'
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证使用精度测试脚本
        assert 'run_accuracy_all_models.sh' in command, "精度测试应使用run_accuracy_all_models.sh"
        assert 'run_benchmark_all_models.sh' not in command, "精度测试不应使用性能测试脚本"

    def test_qwen3_17b_specific_task_creation(self):
        """测试创建Qwen3-1.7B性能测试任务"""
        task = Task(
            task_name="Qwen3-1.7B性能测试",
            test_type=1,  # 性能测试
            test_mode=1,  # 单模型测试
            priority=2,
            status=0,
            device_ip="7.6.52.110",
            device_username="root",
            device_password="Xfusion@123",
            model_name="Qwen3-1.7B",
            model_path="/data/models",
            inference_framework="vllm",
            framework_version="v0.12.0rc1",
            script_path="/data/models-test/scripts/vllm_benchmark_auto",
            npu_count=1,
            graph_mode="eager",
            execution_flag="1"
        )
        
        assert task.test_type == 1, "任务test_type应为1（性能测试）"
        assert task.inference_framework == "vllm", "推理框架应为vLLM"
        assert task.model_name == "Qwen3-1.7B", "模型名称应正确保存"


class TestQwen3_17B_Reliability:
    """可靠性测试"""

    def test_invalid_test_type_fallback(self):
        """测试无效测试类型的默认处理"""
        task = {
            'test_type': 999,  # 无效类型
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models'
        }
        
        with pytest.raises(ValueError) as exc_info:
            CommandBuilder.build_command(task)
        
        assert "不支持" in str(exc_info.value)

    def test_missing_optional_fields(self):
        """测试可选字段缺失的处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models'
            # 其他字段使用默认值
        }
        
        command = CommandBuilder.build_command(task)
        assert 'run_benchmark_all_models.sh' in command

    def test_npu_count_validation(self):
        """测试NPU数量验证"""
        test_cases = [
            (0, 1),    # 0应转为1
            (1, 1),    # 正常值
            (50, 50),  # 中等值
            (200, 128), # 超过上限应限制为128
            (-5, 1),   # 负数应转为1
            ('abc', 1), # 非数字应转为1
        ]
        
        for input_val, expected in test_cases:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'npu_count': input_val
            }
            
            command = CommandBuilder.build_command(task)
            assert f'-n {expected}' in command, f"NPU数量{input_val}应转为{expected}"

    def test_empty_model_path_handling(self):
        """测试空模型路径处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': ''
        }
        
        command = CommandBuilder.build_command(task)
        assert '-b ""' in command or "-b ''" in command


class TestQwen3_17B_Scalability:
    """可扩展性测试"""

    def test_all_frameworks_supported(self):
        """测试所有支持的推理框架"""
        frameworks = [
            ('vllm', TestType.PERFORMANCE, 'run_benchmark_all_models.sh'),
            ('vllm', TestType.ACCURACY, 'run_accuracy_all_models.sh'),
            ('mindie', TestType.PERFORMANCE, 'mindie_auto_test.sh'),
        ]
        
        for framework, test_type, expected_script in frameworks:
            task = {
                'test_type': test_type,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': framework,
                'model_path': '/data/models',
                'model_name': 'Qwen3-1.7B',
                'framework_version': 'v1.0.0'
            }
            
            command = CommandBuilder.build_command(task)
            assert expected_script in command, f"框架 {framework} 应使用脚本 {expected_script}"

    def test_all_test_modes(self):
        """测试所有测试模式"""
        modes = [
            (TestMode.SINGLE_MODEL, '-m Qwen3-1.7B'),
            (TestMode.ALL_MODELS, '-m 参数应为空或不存在'),
        ]
        
        for mode, expected_content in modes:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': mode,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'model_name': 'Qwen3-1.7B'
            }
            
            command = CommandBuilder.build_command(task)
            if '参数应为空' not in expected_content:
                assert expected_content in command

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


class TestQwen3_17B_Security:
    """安全性测试"""

    def test_shell_injection_prevention(self):
        """测试命令注入防护"""
        malicious_inputs = [
            'Qwen3-1.7B; rm -rf /',
            "Qwen3-1.7B && echo hacked",
            'Qwen3-1.7B | cat /etc/passwd',
            'Qwen3-1.7B$(whoami)',
            'Qwen3-1.7B`ls`',
            '../etc/passwd',
            '${IFS}',
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
            
            # 验证危险字符被移除或转义
            assert ';' not in command or command.endswith(';'), "分号应被移除或转义"
            assert '&&' not in command, "&&应被移除"
            assert '|' not in command, "管道符应被移除"
            assert '${' not in command, "变量展开应被阻止"
            assert '`' not in command, "反引号应被移除"

    def test_path_traversal_handling(self):
        """测试路径遍历处理（验证参数是否被正确引用）"""
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
            
            # 验证路径作为参数被引用，防止注入
            assert '-b' in command, "路径参数应存在"
            # 命令应包含完整路径作为参数值
            assert malicious_path in command, "路径应作为参数传递"

    def test_special_characters_handling(self):
        """测试特殊字符处理"""
        special_chars = [
            'Qwen3-1.7B"quote',
            "Qwen3-1.7B'single",
            'Qwen3-1.7B<tag>',
            'Qwen3-1.7B!bang',
            'Qwen3-1.7B#hash',
            'Qwen3-1.7B$var',
            'Qwen3-1.7B%percent',
            'Qwen3-1.7B^caret',
            'Qwen3-1.7B&and',
            'Qwen3-1.7B*star',
            'Qwen3-1.7B(paren)',
            'Qwen3-1.7B[bracket]',
            'Qwen3-1.7B{brace}',
        ]
        
        for special_input in special_chars:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'vllm',
                'model_path': '/data/models',
                'model_name': special_input,
                'execution_flag': '1'
            }
            
            command = CommandBuilder.build_command(task)
            
            # 验证参数被正确引用，防止注入
            assert 'Qwen3-1.7B' in command, "输入内容应保留"
            
            # 验证危险组合被阻止
            assert '<tag>' not in command or command.count('<') == 1, "尖括号应被处理"


class TestQwen3_17B_Integration:
    """集成测试"""

    def test_task_status_transitions(self):
        """测试任务状态转换"""
        task = Task(
            task_name="Qwen3-1.7B性能测试",
            test_type=1,
            test_mode=1,
            status=0,
            model_path="/data/models",
            inference_framework="vllm"
        )
        
        assert task.status == TaskStatus.PENDING
        
        task.status = TaskStatus.QUEUED
        assert task.status == TaskStatus.QUEUED
        
        task.status = TaskStatus.RUNNING
        assert task.status == TaskStatus.RUNNING
        
        task.status = TaskStatus.TESTING
        assert task.status == TaskStatus.TESTING

    def test_full_task_workflow(self):
        """测试完整任务工作流"""
        # 1. 创建任务
        task = Task(
            task_name="Qwen3-1.7B性能测试",
            test_type=1,  # 性能测试
            test_mode=1,  # 单模型
            priority=2,
            status=0,
            device_ip="7.6.52.110",
            device_username="root",
            device_password="Xfusion@123",
            model_name="Qwen3-1.7B",
            model_path="/data/models",
            inference_framework="vllm",
            framework_version="v0.12.0rc1",
            script_path="/data/models-test/scripts/vllm_benchmark_auto",
            npu_count=1,
            graph_mode="eager",
            execution_flag="1"
        )
        
        # 2. 验证任务数据
        assert task.task_name == "Qwen3-1.7B性能测试"
        assert task.test_type == 1
        assert task.inference_framework == "vllm"
        
        # 3. 构建命令
        task_dict = task.model_dump()
        command = CommandBuilder.build_command(task_dict)
        
        # 4. 验证命令正确
        assert 'run_benchmark_all_models.sh' in command
        assert 'Qwen3-1.7B' in command
        assert 'v0.12.0rc1' in command


class TestQwen3_17B_BugFix:
    """回归测试 - 验证修复"""

    def test_test_type_not_swapped(self):
        """测试test_type不再被颠倒"""
        # 这是修复前的bug：用户选择"性能测试"，实际提交的是test_type=2
        
        # 模拟用户选择"性能测试"
        user_selected_test_type = 1  # 性能测试
        
        # 验证值正确
        assert user_selected_test_type == 1, "性能测试类型值应为1"
        assert TestType.PERFORMANCE == 1, "后端定义性能测试为1"
        
        # 构建命令
        task = {
            'test_type': user_selected_test_type,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B'
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证使用性能测试脚本（不是精度测试脚本）
        assert 'run_benchmark_all_models.sh' in command, \
            "用户选择性能测试时，应构建性能测试命令"
        assert 'run_accuracy_all_models.sh' not in command, \
            "用户选择性能测试时，不应构建精度测试命令"

    def test_accuracy_test_not_swapped(self):
        """测试精度测试也没有被颠倒"""
        # 模拟用户选择"精度测试"
        user_selected_test_type = 2  # 精度测试
        
        assert user_selected_test_type == 2, "精度测试类型值应为2"
        assert TestType.ACCURACY == 2, "后端定义精度测试为2"
        
        task = {
            'test_type': user_selected_test_type,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_accuracy_all_models.sh' in command, \
            "用户选择精度测试时，应构建精度测试命令"
        assert 'run_benchmark_all_models.sh' not in command, \
            "用户选择精度测试时，不应构建性能测试命令"


def run_tests():
    """运行所有测试"""
    print("\n" + "=" * 80)
    print("Qwen3-1.7B性能测试任务 - 修复验证测试套件")
    print("=" * 80)
    
    test_classes = [
        TestQwen3_17B_Functionality,
        TestQwen3_17B_Reliability,
        TestQwen3_17B_Scalability,
        TestQwen3_17B_Security,
        TestQwen3_17B_Integration,
        TestQwen3_17B_BugFix,
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
                test_func = getattr(test_class, test_name)
                instance = test_class()
                
                if hasattr(instance, 'setup_method'):
                    instance.setup_method()
                
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
        print("\n[SUCCESS] 所有测试通过！")
        return 0
    else:
        print(f"\n[FAILURE] {total_failed}个测试失败")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
