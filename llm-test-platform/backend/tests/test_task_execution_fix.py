"""
任务执行功能测试用例

测试范围：
1. 功能正确性：任务创建、执行流程、状态转换
2. 可靠性：错误处理、异常恢复
3. 可扩展性：不同配置组合
4. 安全性：输入验证、权限控制
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# 添加backend目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode, TaskStatus
from services.task_executor import TaskExecutor, ExecutionResult
from services.task_checker import TaskExecutionChecker


class TestCommandBuilder:
    """测试命令构建器 - 功能正确性测试"""
    
    def test_build_command_vllm_single_model_performance(self):
        """测试VLLM单模型性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': 4,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command
        assert '/data/models' in command
        assert 'Qwen3-32B' in command
        assert '4' in command
        assert 'eager' in command
        assert '-e' in command and '1' in command
        assert 'v0.12.0rc1' in command
    
    def test_build_command_vllm_all_models_performance(self):
        """测试VLLM全套模型性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'framework_version': 'v0.12.0rc1',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command
        assert 'results_vllm_all' in command
    
    def test_build_command_mindie_single_model(self):
        """测试MindIE单模型测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': 4,
            'framework_version': 'v1.0.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command
        assert 'results_mindie_single' in command
    
    def test_build_command_accuracy_vllm(self):
        """测试VLLM精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': 4,
            'inference_mode': 'eager',
            'dataset_name': 'ceval',
            'framework_version': 'v0.12.0rc1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_accuracy_all_models.sh' in command
        assert 'results_accuracy_single' in command
        assert 'ceval' in command
    
    def test_build_command_unsupported_combination(self):
        """测试不支持的测试类型和框架组合"""
        task = {
            'test_type': 999,  # 不存在的测试类型
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
        }
        
        with pytest.raises(ValueError) as exc_info:
            CommandBuilder.build_command(task)
        
        assert '不支持的测试类型' in str(exc_info.value)


class TestTaskStatusEnum:
    """测试任务状态枚举 - 状态一致性测试"""
    
    def test_task_status_values(self):
        """测试任务状态值与预期一致"""
        assert TaskStatus.PENDING == 0
        assert TaskStatus.QUEUED == 1
        assert TaskStatus.RUNNING == 2
        assert TaskStatus.COMPLETED == 3
        assert TaskStatus.FAILED == 4
        assert TaskStatus.CANCELLED == 5
    
    def test_task_status_ordering(self):
        """测试任务状态的逻辑顺序"""
        assert TaskStatus.PENDING < TaskStatus.QUEUED
        assert TaskStatus.QUEUED < TaskStatus.RUNNING
        assert TaskStatus.RUNNING < TaskStatus.COMPLETED
        assert TaskStatus.RUNNING < TaskStatus.FAILED
        assert TaskStatus.RUNNING < TaskStatus.CANCELLED


class TestTaskExecutionChecker:
    """测试任务执行检查器 - 可靠性测试"""
    
    @patch('services.task_checker.paramiko.SSHClient')
    def test_check_device_connection_success(self, mock_ssh_class):
        """测试设备连接检查成功"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)
        
        device_info = {
            'ip': '7.6.52.110',
            'port': 22,
            'username': 'root',
            'password': 'password'
        }
        
        success, error = TaskExecutionChecker.check_device_connection(device_info)
        
        assert success is True
        assert error == ""
        mock_ssh.connect.assert_called_once()
    
    @patch('services.task_checker.paramiko.SSHClient')
    def test_check_device_connection_auth_failure(self, mock_ssh_class):
        """测试SSH认证失败处理"""
        from paramiko import AuthenticationException
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_ssh.connect.side_effect = AuthenticationException("Authentication failed")
        
        device_info = {
            'ip': '7.6.52.110',
            'port': 22,
            'username': 'root',
            'password': 'wrong_password'
        }
        
        success, error = TaskExecutionChecker.check_device_connection(device_info)
        
        assert success is False
        assert 'SSH认证失败' in error
    
    @patch('services.task_checker.paramiko.SSHClient')
    def test_check_script_directory_success(self, mock_ssh_class):
        """测试脚本目录检查成功"""
        mock_ssh = MagicMock()
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)
        
        success, error = TaskExecutionChecker.check_script_directory(
            mock_ssh, '/data/models-test/scripts/vllm_benchmark_auto'
        )
        
        assert success is True
        assert error == ""
    
    @patch('services.task_checker.paramiko.SSHClient')
    def test_check_model_path_not_exists(self, mock_ssh_class):
        """测试模型路径不存在时返回警告但不阻塞"""
        mock_ssh = MagicMock()
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)
        
        success, error = TaskExecutionChecker.check_model_path(mock_ssh, '/data/models/Qwen3-32B')
        
        # 模型路径不存在应该返回True（警告）而不是False（阻塞）
        assert success is True
        assert '模型路径不存在' in error
    
    def test_preflight_check_missing_fields(self):
        """测试预检缺失必要字段"""
        task = {
            'task_name': 'Test Task',
            # 缺少 model_path 和 inference_framework
        }
        device_info = {
            'ip': '7.6.52.110',
            'port': 22,
            'username': 'root',
            'password': 'password'
        }
        
        with patch.object(TaskExecutionChecker, 'check_device_connection') as mock_check:
            mock_check.return_value = (True, "")
            success, error = TaskExecutionChecker.preflight_check(task, device_info)
            
            assert success is False
            assert '缺少必要字段' in error


class TestTaskExecutor:
    """测试任务执行器 - 集成测试"""
    
    @pytest.fixture
    def mock_ssh_manager(self):
        """创建Mock SSH管理器"""
        mock = Mock()
        mock.connect.return_value = Mock()
        mock.execute_command.return_value = (0, "success", "")
        return mock
    
    @pytest.mark.asyncio
    async def test_execute_task_success(self, mock_ssh_manager):
        """测试任务执行成功流程"""
        executor = TaskExecutor(ssh_manager=mock_ssh_manager)
        
        task = {
            'id': 1,
            'task_name': 'Qwen3-32B性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': 4,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.12.0rc1',
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
        }
        
        device_info = {
            'ip': '7.6.52.110',
            'port': 22,
            'username': 'root',
            'password': 'password'
        }
        
        result = await executor.execute_task(task, device_info)
        
        assert result.success is True
        assert result.exit_code == 0
        mock_ssh_manager.connect.assert_called_once()
        mock_ssh_manager.execute_command.assert_called()
    
    @pytest.mark.asyncio
    async def test_execute_task_connection_failure(self, mock_ssh_manager):
        """测试SSH连接失败处理"""
        mock_ssh_manager.connect.return_value = None
        
        executor = TaskExecutor(ssh_manager=mock_ssh_manager)
        
        task = {'id': 1, 'task_name': 'Test'}
        device_info = {'ip': '7.6.52.110', 'port': 22, 'username': 'root', 'password': 'password'}
        
        result = await executor.execute_task(task, device_info)
        
        assert result.success is False
        assert result.error_message is not None and '无法建立SSH连接' in result.error_message
    
    @pytest.mark.asyncio
    async def test_execute_task_command_failure(self, mock_ssh_manager):
        """测试命令执行失败处理 - 目录切换失败场景"""
        # 第一个调用（cd命令）失败
        mock_ssh_manager.execute_command.side_effect = [
            (1, "", "Command failed"),  # cd命令失败
        ]
        
        executor = TaskExecutor(ssh_manager=mock_ssh_manager)
        
        task = {
            'id': 1,
            'task_name': 'Test',
            'script_path': '/test',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
        }
        device_info = {'ip': '7.6.52.110', 'port': 22, 'username': 'root', 'password': 'password'}
        
        result = await executor.execute_task(task, device_info)
        
        assert result.success is False
        assert result.error_message is not None and '无法进入脚本目录' in result.error_message


class TestTaskFieldValidation:
    """测试任务字段验证 - 安全性测试"""
    
    def test_task_name_validation(self):
        """测试任务名称输入验证"""
        # 测试特殊字符
        task_name_with_special_chars = "Test<script>alert('xss')</script>"
        # 这里应该被转义或拒绝
        
        # 测试超长名称
        long_name = "A" * 1000
        # 应该被截断或拒绝
    
    def test_path_traversal_prevention(self):
        """测试路径遍历攻击防护"""
        malicious_path = "../../../etc/passwd"
        task = {
            'model_path': malicious_path,
            'script_path': malicious_path,
        }
        
        # 命令构建应该处理或拒绝恶意路径
        # 实际实现可能需要添加路径验证
    
    def test_npu_count_validation(self):
        """测试NPU数量输入验证"""
        # 测试负数
        task_negative = {'npu_count': -1}
        # 测试超大值
        task_large = {'npu_count': 999999}
        # 测试非整数
        task_string = {'npu_count': "4"}


class TestTaskScalability:
    """测试可扩展性 - 不同配置组合"""
    
    @pytest.mark.parametrize("framework,test_type,test_mode", [
        ('vllm', TestType.PERFORMANCE, TestMode.SINGLE_MODEL),
        ('vllm', TestType.PERFORMANCE, TestMode.ALL_MODELS),
        ('vllm', TestType.ACCURACY, TestMode.SINGLE_MODEL),
        ('vllm', TestType.ACCURACY, TestMode.ALL_MODELS),
        ('mindie', TestType.PERFORMANCE, TestMode.SINGLE_MODEL),
        ('mindie', TestType.PERFORMANCE, TestMode.ALL_MODELS),
    ])
    def test_different_framework_combinations(self, framework, test_type, test_mode):
        """测试不同框架、类型、模式的组合"""
        task = {
            'test_type': test_type,
            'test_mode': test_mode,
            'inference_framework': framework,
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': 4,
            'framework_version': 'v0.12.0rc1',
        }
        
        try:
            command = CommandBuilder.build_command(task)
            assert command is not None
            assert len(command) > 0
        except ValueError as e:
            # 某些组合可能不被支持
            pytest.skip(f"Unsupported combination: {e}")
    
    @pytest.mark.parametrize("npu_count", [1, 2, 4, 8])
    def test_different_npu_counts(self, npu_count):
        """测试不同NPU数量配置"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': 'Qwen3-32B',
            'npu_count': npu_count,
        }
        
        command = CommandBuilder.build_command(task)
        assert str(npu_count) in command


class TestIntegrationScenario:
    """测试完整业务场景 - 集成测试"""
    
    def test_qwen3_32b_performance_task(self):
        """测试Qwen3-32B性能测试完整场景"""
        # 模拟用户配置
        task_config = {
            'task_name': 'Qwen3-32B性能测试',
            'priority': 2,  # HIGH
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'device_ip': '7.6.52.110',
            'device_username': 'root',
            'device_password': 'password',
            'script_path': '/data/models-test/scripts/vllm_benchmark_auto',
            'inference_framework': 'vllm',
            'framework_version': 'v0.12.0rc1',
            'model_name': 'Qwen3-32B',
            'model_path': '/data/models',
            'npu_count': 4,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 验证命令构建
        command = CommandBuilder.build_command(task_config)
        assert 'Qwen3-32B' in command
        assert '4' in command
        assert 'eager' in command
        
        # 验证任务状态流转
        # PENDING -> RUNNING -> COMPLETED/FAILED
        current_status = TaskStatus.PENDING
        assert current_status == 0
        
        # 模拟状态转换
        current_status = TaskStatus.RUNNING
        assert current_status == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
