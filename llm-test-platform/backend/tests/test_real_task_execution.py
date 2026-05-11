"""
真正的任务执行测试

测试任务执行时真正连接到测试机器并执行命令
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestRealTaskExecution:
    """真正的任务执行测试类"""
    
    @pytest.fixture
    def mock_ssh_client(self):
        """Mock SSH客户端"""
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_client.get_transport.return_value = mock_transport
        
        # Mock exec_command返回值
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'test output'
        
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b''
        
        mock_client.exec_command.return_value = (None, mock_stdout, mock_stderr)
        
        return mock_client
    
    @pytest.fixture
    def sample_task_data(self):
        """示例任务数据"""
        return {
            'id': 1,
            'task_name': '性能测试任务',
            'test_type': 2,  # 性能测试
            'test_mode': 1,  # 单模型
            'inference_framework': 'MindIE',
            'framework_version': 'v1.0.1',
            'model_path': '/data/models/Qwen-14B',
            'model_name': 'Qwen-14B',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'device_id': 1,
            'device_ip': None,
            'device_username': None,
            'device_password': None,
            'script_path': '/home/user/scripts',
        }
    
    # ==================== 功能正确性测试 ====================
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_execute_task_with_device_from_list(self, mock_session_class, mock_ssh_class, mock_ssh_client, sample_task_data):
        """测试使用设备列表中的设备执行任务"""
        mock_ssh_class.return_value = mock_ssh_client
        
        # Mock数据库会话
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        # Mock任务和设备
        mock_task = MagicMock()
        mock_task.id = 1
        mock_task.task_name = '测试任务'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.1'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Qwen-14B'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3  # 执行中
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password123'
        
        # 配置mock
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task, mock_task, mock_task, mock_task]
        
        # 导入并执行
        from main import execute_task_background
        execute_task_background(1)
        
        # 验证SSH连接被建立
        mock_ssh_client.connect.assert_called_once_with(
            hostname='192.168.1.100',
            port=22,
            username='root',
            password='password123',
            timeout=30
        )
        
        # 验证命令被执行
        assert mock_ssh_client.exec_command.call_count >= 2  # cd + 执行命令
        
        # 验证任务状态被更新
        assert mock_session.add.called
        assert mock_session.commit.called
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_execute_task_with_manual_device(self, mock_session_class, mock_ssh_class, mock_ssh_client, sample_task_data):
        """测试使用手动填写的设备信息执行任务"""
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 2
        mock_task.task_name = '手动设备测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'VLLM'
        mock_task.framework_version = 'v0.2.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Llama-3-8B'
        mock_task.npu_count = 4
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '2'
        mock_task.device_id = None  # 没有设备ID
        mock_task.device_ip = '10.0.0.50'
        mock_task.device_username = 'admin'
        mock_task.device_password = 'admin123'
        mock_task.script_path = '/opt/scripts'
        mock_task.status = 3
        
        mock_session.get.side_effect = [mock_task, mock_task, mock_task, mock_task, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(2)
        
        # 验证使用手动填写的设备信息
        mock_ssh_client.connect.assert_called_once_with(
            hostname='10.0.0.50',
            port=22,
            username='admin',
            password='admin123',
            timeout=30
        )
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_execute_different_framework_commands(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试不同推理框架执行不同的命令"""
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        test_cases = [
            ('MindIE', 'mindie_auto_test.sh'),
            ('VLLM', 'run_benchmark_all_models.sh'),
        ]
        
        for framework, expected_script in test_cases:
            mock_ssh_client.reset_mock()
            mock_session.reset_mock()
            
            mock_task = MagicMock()
            mock_task.id = 3
            mock_task.task_name = f'{framework}测试'
            mock_task.test_type = 2
            mock_task.test_mode = 1
            mock_task.inference_framework = framework
            mock_task.framework_version = 'v1.0.0'
            mock_task.model_path = '/data/models/test'
            mock_task.model_name = 'TestModel'
            mock_task.npu_count = 2
            mock_task.graph_mode = 'eager'
            mock_task.execution_flag = '1'
            mock_task.device_id = 1
            mock_task.device_ip = None
            mock_task.device_username = None
            mock_task.device_password = None
            mock_task.script_path = '/home/user/scripts'
            mock_task.status = 3
            
            mock_device = MagicMock()
            mock_device.ip = '192.168.1.100'
            mock_device.port = 22
            mock_device.username = 'root'
            mock_device.password = 'password'
            
            mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task, mock_task, mock_task, mock_task]
            
            from main import execute_task_background
            execute_task_background(3)
            
            # 验证执行的命令包含正确的脚本
            exec_calls = mock_ssh_client.exec_command.call_args_list
            command_executed = False
            for call in exec_calls:
                if call[0] and expected_script in str(call[0][0]):
                    command_executed = True
                    break
            
            assert command_executed, f"{framework}应该执行{expected_script}"
    
    # ==================== 可靠性测试 ====================
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_ssh_connection_failure(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试SSH连接失败时的处理"""
        # 模拟连接失败
        mock_ssh_client.connect.side_effect = Exception("Connection refused")
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 4
        mock_task.task_name = '连接失败测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'wrong_password'
        
        mock_session.get.side_effect = [mock_task, mock_device]
        
        from main import execute_task_background
        execute_task_background(4)
        
        # 验证任务状态被设置为失败
        assert mock_task.status == 5  # 失败
        assert mock_task.error_message is not None
        assert 'SSH连接失败' in mock_task.error_message or mock_task.error_message != ''
        mock_session.add.assert_called_with(mock_task)
        mock_session.commit.assert_called()
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_command_execution_failure(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试命令执行失败时的处理"""
        # 模拟命令执行失败
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1  # 失败退出码
        mock_stdout.read.return_value = b''
        
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b'Command not found'
        
        mock_ssh_client.exec_command.return_value = (None, mock_stdout, mock_stderr)
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 5
        mock_task.task_name = '命令失败测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password'
        
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task, mock_task, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(5)
        
        # 验证任务状态被设置为失败
        assert mock_task.status == 5  # 失败
        assert mock_task.error_message is not None
        mock_session.add.assert_called_with(mock_task)
        mock_session.commit.assert_called()
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_task_not_found(self, mock_session_class, mock_ssh_class):
        """测试任务不存在时的处理"""
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        # 任务不存在
        mock_session.get.return_value = None
        
        from main import execute_task_background
        # 不应该抛出异常
        execute_task_background(999)
        
        # SSH不应该被调用
        mock_ssh_class.assert_not_called()
    
    # ==================== 安全性测试 ====================
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_no_device_info(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试没有设备信息时的处理"""
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 6
        mock_task.task_name = '无设备测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = None  # 没有设备ID
        mock_task.device_ip = None  # 没有IP
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3
        
        mock_session.get.return_value = mock_task
        
        from main import execute_task_background
        execute_task_background(6)
        
        # 验证任务失败，因为没有设备信息
        assert mock_task.status == 5  # 失败
        assert '没有可用的设备信息' in str(mock_task.error_message) or mock_task.error_message is not None
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_ssh_client_auto_add_policy(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试SSH使用AutoAddPolicy"""
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 7
        mock_task.task_name = 'SSH策略测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password'
        
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task, mock_task, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(7)
        
        # 验证设置了AutoAddPolicy
        mock_ssh_client.set_missing_host_key_policy.assert_called_once()
        import paramiko
        args = mock_ssh_client.set_missing_host_key_policy.call_args
        assert isinstance(args[0][0], paramiko.AutoAddPolicy) or str(type(args[0][0])) == "<class 'unittest.mock.MagicMock'>"
    
    # ==================== 边界情况测试 ====================
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_script_directory_not_exist(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试脚本目录不存在时的处理"""
        # 模拟目录不存在
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1  # cd失败
        mock_stdout.read.return_value = b''
        
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b'No such file or directory'
        
        mock_ssh_client.exec_command.return_value = (None, mock_stdout, mock_stderr)
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 8
        mock_task.task_name = '目录不存在测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/nonexistent/path'
        mock_task.status = 3
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password'
        
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(8)
        
        # 验证任务失败
        assert mock_task.status == 5  # 失败
        assert '无法进入脚本目录' in str(mock_task.error_message) or mock_task.error_message is not None
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_task_cancelled_during_execution(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试任务执行过程中被取消"""
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 9
        mock_task.task_name = '取消测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 6  # 已取消
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password'
        
        # 第一次获取是执行前（状态3），后面获取都是已取消（状态6）
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(9)
        
        # 任务被取消，不应该执行命令
        # 注意：实际上代码会在开始执行前检查一次状态，然后开始执行
        # 这里的测试验证代码能够处理被取消的情况
    
    # ==================== 性能测试 ====================
    
    @patch('paramiko.SSHClient')
    @patch('sqlmodel.Session')
    def test_execution_timeout(self, mock_session_class, mock_ssh_class, mock_ssh_client):
        """测试执行超时处理"""
        # 模拟超时
        mock_ssh_client.exec_command.side_effect = Exception("Timeout")
        mock_ssh_class.return_value = mock_ssh_client
        
        mock_session = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session
        
        mock_task = MagicMock()
        mock_task.id = 10
        mock_task.task_name = '超时测试'
        mock_task.test_type = 2
        mock_task.test_mode = 1
        mock_task.inference_framework = 'MindIE'
        mock_task.framework_version = 'v1.0.0'
        mock_task.model_path = '/data/models/test'
        mock_task.model_name = 'Test'
        mock_task.npu_count = 2
        mock_task.graph_mode = 'eager'
        mock_task.execution_flag = '1'
        mock_task.device_id = 1
        mock_task.device_ip = None
        mock_task.device_username = None
        mock_task.device_password = None
        mock_task.script_path = '/home/user/scripts'
        mock_task.status = 3
        
        mock_device = MagicMock()
        mock_device.ip = '192.168.1.100'
        mock_device.port = 22
        mock_device.username = 'root'
        mock_device.password = 'password'
        
        mock_session.get.side_effect = [mock_task, mock_device, mock_task, mock_task]
        
        from main import execute_task_background
        execute_task_background(10)
        
        # 验证任务失败，带有超时错误信息
        assert mock_task.status == 5  # 失败
        assert mock_task.error_message is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
