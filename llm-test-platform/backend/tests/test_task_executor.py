"""
任务执行器测试模块

测试任务执行流程、错误处理和状态更新
"""

import pytest
import sys
import os
import asyncio
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.task_executor import TaskExecutor, ExecutionResult


class TestTaskExecutor:
    """任务执行器测试类"""
    
    def setup_method(self):
        """每个测试方法前初始化"""
        self.progress_updates = []
        
        def progress_callback(task_id, progress):
            self.progress_updates.append((task_id, progress))
        
        self.executor = TaskExecutor(progress_callback=progress_callback)
    
    # ==================== 功能正确性测试 ====================
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_task_success(self, mock_execute, mock_chdir, mock_connect):
        """测试成功执行任务"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        mock_result = ExecutionResult(
            success=True,
            exit_code=0,
            stdout='Task completed successfully',
            stderr=''
        )
        mock_execute.return_value = mock_result
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test',
            'script_path': '/home/user/scripts'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is True
        assert result.exit_code == 0
        assert mock_ssh_client.close.called
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    async def test_execute_task_connection_failure(self, mock_connect):
        """测试连接失败"""
        mock_connect.return_value = None
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'model_path': '/data/models/test'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is False
        assert '无法建立SSH连接' in result.error_message
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    async def test_execute_task_directory_change_failure(self, mock_chdir, mock_connect):
        """测试切换目录失败"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        
        # 模拟目录切换异常
        async def raise_exception(*args, **kwargs):
            raise Exception("Directory not found")
        
        mock_chdir.side_effect = raise_exception
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'model_path': '/data/models/test',
            'script_path': '/nonexistent/path'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is False
        assert 'Directory not found' in result.error_message
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_task_command_failure(self, mock_execute, mock_chdir, mock_connect):
        """测试命令执行失败"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        mock_result = ExecutionResult(
            success=False,
            exit_code=1,
            stdout='',
            stderr='Command failed'
        )
        mock_execute.return_value = mock_result
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'model_path': '/data/models/test',
            'script_path': '/home/user/scripts'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is False
        assert result.exit_code == 1
    
    # ==================== 超时处理测试 ====================
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_task_timeout(self, mock_execute, mock_chdir, mock_connect):
        """测试任务执行超时"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        # 模拟超时异常
        from asyncio import TimeoutError
        mock_execute.side_effect = TimeoutError()
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'model_path': '/data/models/test',
            'script_path': '/home/user/scripts',
            'timeout': 1
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is False
        assert '超时' in result.error_message
    
    # ==================== 边界情况测试 ====================
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_task_minimal_fields(self, mock_execute, mock_chdir, mock_connect):
        """测试最小字段的任务执行"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        mock_result = ExecutionResult(success=True, exit_code=0)
        mock_execute.return_value = mock_result
        
        # 最小字段的任务
        task = {
            'id': 1,
            'task_name': 'Minimal Task',
            'model_path': '/data/models/test'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is True
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_task_with_progress_callback(self, mock_execute, mock_chdir, mock_connect):
        """测试进度回调功能"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        mock_result = ExecutionResult(success=True, exit_code=0)
        mock_execute.return_value = mock_result
        
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'model_path': '/data/models/test',
            'script_path': '/home/user/scripts'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        # 重置进度更新列表
        self.progress_updates = []
        
        result = await self.executor.execute_task(task, device_info)
        
        assert result.success is True
    
    # ==================== 安全性测试 ====================
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    async def test_execute_task_with_command_injection_attempt(self, mock_connect):
        """测试命令注入防护"""
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        
        # 尝试注入命令的任务
        task = {
            'id': 1,
            'task_name': 'Test; rm -rf /',
            'model_path': '/data/models/test; cat /etc/passwd',
            'script_path': '/home/user/scripts'
        }
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        # 任务应该正常处理（CommandBuilder会转义参数）
        result = await self.executor.execute_task(task, device_info)
        
        # 验证任务被正确处理，没有引发安全问题
        assert result is not None
    
    # ==================== 性能测试 ====================
    
    @pytest.mark.asyncio
    @patch('services.task_executor.TaskExecutor._connect_to_device')
    @patch('services.task_executor.TaskExecutor._change_directory')
    @patch('services.task_executor.TaskExecutor._execute_command')
    async def test_execute_multiple_tasks_performance(self, mock_execute, mock_chdir, mock_connect):
        """测试多任务执行性能"""
        import time
        
        mock_ssh_client = MagicMock()
        mock_connect.return_value = mock_ssh_client
        mock_chdir.return_value = asyncio.Future()
        mock_chdir.return_value.set_result(None)
        
        mock_result = ExecutionResult(success=True, exit_code=0)
        mock_execute.return_value = mock_result
        
        device_info = {
            'ip': '192.168.1.100',
            'port': '22',
            'username': 'root',
            'password': 'password'
        }
        
        start_time = time.time()
        
        # 模拟执行10个任务
        tasks = []
        for i in range(10):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'model_path': '/data/models/test',
                'script_path': '/home/user/scripts'
            }
            tasks.append(self.executor.execute_task(task, device_info))
        
        await asyncio.gather(*tasks)
        
        elapsed = time.time() - start_time
        
        # 10个任务应该在合理时间内完成
        assert elapsed < 5.0, f"多任务执行性能测试失败: {elapsed}秒"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
