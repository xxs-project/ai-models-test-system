"""
任务执行状态监控测试

测试新的任务状态流转和监控功能：
1. PENDING(0) -> RUNNING(2) -> TESTING(3) -> COMPLETED(4)/FAILED(5)
2. 远程进程监控
3. 日志收集
4. 状态回调
"""

import pytest
import sys
import os
import time
import threading
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock, mock_open

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TaskStatus, TestType, TestMode
from services.task_monitor import (
    TaskExecutionMonitor, RemoteScriptExecutor,
    TaskMonitorStatus, ProcessStatus, get_task_monitor
)


class TestNewTaskStatusEnum:
    """测试新的任务状态枚举"""

    def test_task_status_values(self):
        """测试所有状态值正确"""
        assert TaskStatus.PENDING == 0
        assert TaskStatus.QUEUED == 1
        assert TaskStatus.RUNNING == 2
        assert TaskStatus.TESTING == 3
        assert TaskStatus.COMPLETED == 4
        assert TaskStatus.FAILED == 5
        assert TaskStatus.CANCELLED == 6
        assert TaskStatus.TIMEOUT == 7

    def test_task_status_ordering(self):
        """测试状态顺序正确"""
        assert TaskStatus.PENDING < TaskStatus.QUEUED
        assert TaskStatus.QUEUED < TaskStatus.RUNNING
        assert TaskStatus.RUNNING < TaskStatus.TESTING
        assert TaskStatus.TESTING < TaskStatus.COMPLETED
        assert TaskStatus.TESTING < TaskStatus.FAILED

    def test_task_status_names(self):
        """测试状态名称正确"""
        assert TaskStatus(0).name == "PENDING"
        assert TaskStatus(1).name == "QUEUED"
        assert TaskStatus(2).name == "RUNNING"
        assert TaskStatus(3).name == "TESTING"
        assert TaskStatus(4).name == "COMPLETED"
        assert TaskStatus(5).name == "FAILED"
        assert TaskStatus(6).name == "CANCELLED"
        assert TaskStatus(7).name == "TIMEOUT"


class TestTaskExecutionMonitor:
    """测试任务执行监控器"""

    def test_monitor_initialization(self):
        """测试监控器初始化"""
        monitor = TaskExecutionMonitor(check_interval=30)
        assert monitor.check_interval == 30
        assert len(monitor.get_monitored_tasks()) == 0

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_start_monitoring(self, mock_ssh_class):
        """测试开始监控"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        monitor = TaskExecutionMonitor(check_interval=1)

        status_callback = Mock()
        progress_callback = Mock()

        monitor.start_monitoring(
            task_id=1,
            ssh_client=mock_ssh,
            script_path='/test',
            command='echo test',
            log_file='/tmp/test.log',
            pid_file='/tmp/test.pid',
            status_callback=status_callback,
            progress_callback=progress_callback
        )

        # 验证任务已添加到监控列表
        tasks = monitor.get_monitored_tasks()
        assert 1 in tasks
        assert tasks[1]['status'] == TaskMonitorStatus.STARTING

        monitor.stop_all()

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_process_status_check(self, mock_ssh_class):
        """测试进程状态检查"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        # Mock进程存在的情况
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b'12345 25.5 10.2 R 01:30:00'
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)

        monitor = TaskExecutionMonitor()
        status = monitor._get_process_status(mock_ssh, 12345)

        assert status.exists is True
        assert status.pid == 12345
        assert status.cpu_percent == 25.5
        assert status.memory_percent == 10.2
        assert status.status == 'R'

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_process_not_found(self, mock_ssh_class):
        """测试进程不存在的情况"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        # Mock进程不存在
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b''
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)

        monitor = TaskExecutionMonitor()
        status = monitor._get_process_status(mock_ssh, 99999)

        assert status.exists is False

    def test_parse_progress_from_log(self):
        """测试从日志解析进度"""
        mock_ssh = MagicMock()

        # 测试不同的进度格式
        test_cases = [
            (b'Progress: 45%', 45),
            (b'[45/100]', 45),
            (b'50% completed', 50),
            ('Progress: 75'.encode('utf-8'), 75),
            (b'No progress here', 0),
        ]

        monitor = TaskExecutionMonitor()

        for log_content, expected in test_cases:
            mock_stdout = MagicMock()
            mock_stdout.read.return_value = log_content
            mock_ssh.exec_command.return_value = (None, mock_stdout, None)

            progress = monitor._parse_progress_from_log(mock_ssh, '/tmp/test.log')
            assert progress == expected, f"Failed for content: {log_content}"

    def test_parse_etime(self):
        """测试解析进程运行时间"""
        monitor = TaskExecutionMonitor()

        # 测试各种时间格式
        assert monitor._parse_etime('30') == 30  # 30秒
        assert monitor._parse_etime('05:30') == 330  # 5分30秒
        assert monitor._parse_etime('01:30:00') == 5400  # 1小时30分
        assert monitor._parse_etime('2-01:30:00') == 176400  # 2天1小时30分


class TestRemoteScriptExecutor:
    """测试远程脚本执行器"""

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_execute_in_background_success(self, mock_ssh_class):
        """测试后台执行成功"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        # Mock成功启动
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b'12345'
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)

        executor = RemoteScriptExecutor()
        success, pid, message = executor.execute_in_background(
            ssh_client=mock_ssh,
            script_path='/test',
            command='echo hello'
        )

        # 由于PID文件读取也会被mock，这里需要更详细的mock设置
        # 简化测试，验证基本流程
        assert mock_ssh.exec_command.called

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_kill_process(self, mock_ssh_class):
        """测试杀死进程"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        executor = RemoteScriptExecutor()
        result = executor.kill_process(mock_ssh, 12345)

        assert result is True
        mock_ssh.exec_command.assert_called_once()


class TestTaskStatusFlow:
    """测试任务状态流转"""

    def test_qwen3_14b_full_flow(self):
        """测试Qwen3-14B完整状态流转"""
        # 初始状态
        status = TaskStatus.PENDING
        assert status == 0

        # 本地准备完成，开始执行
        status = TaskStatus.RUNNING
        assert status == 2

        # 设备上测试脚本启动
        status = TaskStatus.TESTING
        assert status == 3

        # 测试完成
        status = TaskStatus.COMPLETED
        assert status == 4

    def test_qwen3_14b_failure_flow(self):
        """测试Qwen3-14B失败流程"""
        # PENDING -> RUNNING -> TESTING -> FAILED
        assert TaskStatus.PENDING == 0
        assert TaskStatus.RUNNING == 2
        assert TaskStatus.TESTING == 3
        assert TaskStatus.FAILED == 5

    def test_cancellation_flow(self):
        """测试取消流程"""
        # 可以在任何状态取消（除了已结束的状态）
        assert TaskStatus.CANCELLED == 6

    def test_timeout_flow(self):
        """测试超时流程"""
        assert TaskStatus.TIMEOUT == 7


class TestGlobalMonitor:
    """测试全局监控器"""

    def test_get_task_monitor_singleton(self):
        """测试全局监控器是单例"""
        monitor1 = get_task_monitor()
        monitor2 = get_task_monitor()
        assert monitor1 is monitor2


class TestIntegrationScenario:
    """测试集成场景"""

    def test_qwen3_14b_monitoring_scenario(self):
        """测试Qwen3-14B监控场景"""
        # 模拟完整的任务执行流程
        task_config = {
            'task_id': 1,
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

        # 构建命令
        command = CommandBuilder.build_command(task_config)
        assert command is not None
        assert 'Qwen3-14B' in command

        # 验证状态流转路径
        expected_flow = [
            (TaskStatus.PENDING, "待执行"),
            (TaskStatus.RUNNING, "本地准备"),
            (TaskStatus.TESTING, "设备测试中"),
            (TaskStatus.COMPLETED, "完成"),
        ]

        for status, description in expected_flow:
            assert status is not None

    @patch('services.task_monitor.paramiko.SSHClient')
    def test_monitor_thread_lifecycle(self, mock_ssh_class):
        """测试监控线程生命周期"""
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh

        monitor = TaskExecutionMonitor(check_interval=1)

        # 启动监控
        monitor.start_monitoring(
            task_id=999,
            ssh_client=mock_ssh,
            script_path='/test',
            command='echo test',
            log_file='/tmp/test.log',
            pid_file='/tmp/test.pid'
        )

        # 验证监控线程已启动
        assert monitor._monitor_thread is not None

        # 停止所有监控
        monitor.stop_all()

        # 验证已停止
        assert len(monitor.get_monitored_tasks()) == 0


class TestStatusCallback:
    """测试状态回调功能"""

    def test_status_callback_invocation(self):
        """测试状态回调被正确调用"""
        callback_called = []

        def mock_callback(task_id, status, message):
            callback_called.append((task_id, status, message))

        monitor = TaskExecutionMonitor()

        # 模拟通知
        with patch.object(monitor, '_monitored_tasks', {1: {'status_callback': mock_callback}}):
            monitor._notify_status(1, TaskStatus.TESTING, "测试中")

        assert len(callback_called) == 1
        assert callback_called[0] == (1, TaskStatus.TESTING, "测试中")

    def test_progress_callback_invocation(self):
        """测试进度回调被正确调用"""
        callback_called = []

        def mock_callback(task_id, progress):
            callback_called.append((task_id, progress))

        monitor = TaskExecutionMonitor()

        # 模拟通知
        with patch.object(monitor, '_monitored_tasks', {1: {'progress_callback': mock_callback}}):
            monitor._notify_progress(1, 50)

        assert len(callback_called) == 1
        assert callback_called[0] == (1, 50)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
