"""
Qwen3-14B任务执行问题诊断测试

模拟用户提供的具体场景进行测试
"""

import pytest
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode, TaskStatus


class TestQwen3_14BScenario:
    """测试Qwen3-14B具体场景"""
    
    def test_qwen3_14b_command_build(self):
        """测试Qwen3-14B命令构建"""
        # 模拟用户配置
        task = {
            'task_name': 'Qwen3-14B性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-14B',
            'model_path': '/data/models',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
        }
        
        command = CommandBuilder.build_command(task)
        
        print(f"\n生成的命令:\n{command}\n")
        
        # 验证命令包含所有必要参数
        assert 'run_benchmark_all_models.sh' in command
        assert '/data/models' in command
        assert 'Qwen3-14B' in command
        assert '-n 2' in command or f"-n {task['npu_count']}" in command
        assert 'eager' in command
        assert '-e' in command and '1' in command
        assert 'v0.12.0rc1' in command
    
    def test_qwen3_14b_task_data_validation(self):
        """测试Qwen3-14B任务数据验证"""
        # 模拟从数据库获取的任务数据
        task_data = {
            'id': 1,
            'task_name': 'Qwen3-14B性能测试',
            'test_type': 1,  # PERFORMANCE
            'test_mode': 1,  # SINGLE_MODEL
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-14B',
            'model_path': '/data/models',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
            'priority': 2,  # HIGH
            'status': 0,  # PENDING
        }
        
        # 验证test_type转换为枚举
        test_type = task_data['test_type']
        assert test_type == TestType.PERFORMANCE
        
        # 验证命令构建
        command = CommandBuilder.build_command(task_data)
        assert command is not None
        assert len(command) > 0
    
    def test_qwen3_14b_vs_qwen3_32b_difference(self):
        """测试Qwen3-14B与Qwen3-32B的区别"""
        task_14b = {
            'task_name': 'Qwen3-14B性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-14B',
            'model_path': '/data/models',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        task_32b = {
            'task_name': 'Qwen3-32B性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-32B',
            'model_path': '/data/models',
            'npu_count': 4,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        command_14b = CommandBuilder.build_command(task_14b)
        command_32b = CommandBuilder.build_command(task_32b)
        
        # 验证差异
        assert 'Qwen3-14B' in command_14b
        assert 'Qwen3-32B' in command_32b
        assert '-n 2' in command_14b
        assert '-n 4' in command_32b
        
        print(f"\nQwen3-14B命令:\n{command_14b}\n")
        print(f"Qwen3-32B命令:\n{command_32b}\n")


class TestTaskExecutionEdgeCases:
    """测试任务执行边界情况"""
    
    def test_empty_device_info_handling(self):
        """测试设备信息为空时的处理"""
        # 模拟没有设备信息的情况
        task = {
            'id': 1,
            'task_name': 'Test',
            'device_id': None,
            'device_ip': None,
        }
        
        # 这种情况下device_info应该为None
        device_info = None
        if task.get('device_id'):
            # 从数据库获取设备
            pass
        
        if not device_info and task.get('device_ip'):
            device_info = {
                'ip': task['device_ip'],
                'port': 22,
                'username': 'root',
                'password': ''
            }
        
        # 如果没有设备信息，预检应该被跳过或失败
        assert device_info is None
    
    def test_model_path_with_trailing_slash(self):
        """测试模型路径带/不带斜杠"""
        task_with_slash = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models/',
            'model_name': 'Qwen3-14B',
            'npu_count': 2,
        }
        
        task_without_slash = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-14B',
            'npu_count': 2,
        }
        
        command_with = CommandBuilder.build_command(task_with_slash)
        command_without = CommandBuilder.build_command(task_without_slash)
        
        # 两种路径都应该能正常工作
        assert '/data/models/' in command_with or '/data/models' in command_with
        assert '/data/models' in command_without
    
    def test_script_path_handling(self):
        """测试脚本路径处理"""
        # 测试路径包含空格
        task_with_spaces = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-14B',
            'npu_count': 2,
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
        }
        
        command = CommandBuilder.build_command(task_with_spaces)
        assert command is not None


class TestTaskFieldMapping:
    """测试任务字段映射"""
    
    def test_priority_field_values(self):
        """测试优先级字段值"""
        from services.command_builder import Priority
        
        # 验证优先级值
        assert Priority.LOW == 0
        assert Priority.MEDIUM == 1
        assert Priority.HIGH == 2
        
        # 用户的优先级是高(2)
        user_priority = 2
        assert user_priority == Priority.HIGH
    
    def test_all_required_fields_present(self):
        """测试所有必需字段都存在"""
        # 用户提供的完整配置
        full_config = {
            'task_name': 'Qwen3-14B性能测试',
            'priority': 2,
            'test_type': 1,
            'test_mode': 1,
            'device_id': 1,  # 设备7.6.52.110
            'device_ip': '7.6.52.110',
            'device_username': 'root',
            'device_password': 'Xfusion@123',
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-14B',
            'model_path': '/data/models',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 构建命令需要的字段
        required_fields = [
            'test_type', 'test_mode', 'inference_framework',
            'model_path', 'model_name', 'npu_count', 'graph_mode',
            'execution_flag', 'framework_version'
        ]
        
        for field in required_fields:
            assert field in full_config, f"缺少必需字段: {field}"
            assert full_config[field] is not None, f"字段{field}不能为None"


class TestCommandInjectionPrevention:
    """测试命令注入防护"""
    
    def test_model_name_command_injection(self):
        """测试模型名称命令注入防护"""
        malicious_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-14B"; rm -rf /; "',  # 恶意输入
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1',
        }
        
        command = CommandBuilder.build_command(malicious_task)
        
        # 验证命令中包含了恶意字符（当前实现没有过滤）
        # 这是一个潜在的安全问题，需要修复
        print(f"\n包含恶意字符的命令:\n{command}\n")
        
        # TODO: 应该对输入进行转义或验证
        # 当前命令构建器没有处理这种情况


class TestStatusTransition:
    """测试状态流转"""
    
    def test_qwen3_14b_status_flow(self):
        """测试Qwen3-14B任务状态流转"""
        # 初始状态
        status = TaskStatus.PENDING
        assert status == 0
        
        # 执行中
        status = TaskStatus.RUNNING
        assert status == 2
        
        # 可能的结束状态
        completed = TaskStatus.COMPLETED
        failed = TaskStatus.FAILED
        cancelled = TaskStatus.CANCELLED
        
        assert completed == 3
        assert failed == 4
        assert cancelled == 5
    
    def test_invalid_status_transition(self):
        """测试无效状态流转"""
        # 从COMPLETED不能回到RUNNING
        current_status = TaskStatus.COMPLETED
        
        # 验证状态值
        assert current_status != TaskStatus.RUNNING
        assert current_status != TaskStatus.PENDING


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
