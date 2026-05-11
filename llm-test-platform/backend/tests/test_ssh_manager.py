"""
SSH管理器测试模块

测试SSH连接管理、连接池和并发安全性
"""

import pytest
import sys
import os
import threading
import time
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.ssh_manager import SSHManager, SSHConnection


class TestSSHManager:
    """SSH管理器测试类"""
    
    def setup_method(self):
        """每个测试方法前初始化"""
        self.ssh_manager = SSHManager(max_connections=5, connection_timeout=60)
    
    def teardown_method(self):
        """每个测试方法后清理"""
        self.ssh_manager.close_all()
    
    # ==================== 功能正确性测试 ====================
    
    @patch('paramiko.SSHClient')
    def test_connect_success(self, mock_ssh_client):
        """测试成功建立连接"""
        mock_client = MagicMock()
        mock_ssh_client.return_value = mock_client
        
        client = self.ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123'
        )
        
        assert client is not None
        assert self.ssh_manager.get_connection_count() == 1
        mock_client.set_missing_host_key_policy.assert_called_once()
        mock_client.connect.assert_called_once()
    
    @patch('paramiko.SSHClient')
    def test_connect_with_retry(self, mock_ssh_client):
        """测试连接重试机制"""
        mock_client = MagicMock()
        # 前两次失败，第三次成功
        mock_ssh_client.side_effect = [
            Exception("Connection refused"),
            Exception("Connection refused"),
            mock_client
        ]
        
        client = self.ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123',
            max_retries=3
        )
        
        assert client is not None
        assert mock_ssh_client.call_count == 3
    
    @patch('paramiko.SSHClient')
    def test_connect_authentication_failure(self, mock_ssh_client):
        """测试认证失败"""
        import paramiko
        mock_ssh_client.side_effect = paramiko.AuthenticationException("Authentication failed")
        
        with pytest.raises(ConnectionError) as exc_info:
            self.ssh_manager.connect(
                host='192.168.1.100',
                port=22,
                username='root',
                password='wrong_password'
            )
        
        assert '认证失败' in str(exc_info.value)
    
    @patch('paramiko.SSHClient')
    def test_connect_max_retries_exceeded(self, mock_ssh_client):
        """测试超过最大重试次数"""
        mock_ssh_client.side_effect = Exception("Connection refused")
        
        with pytest.raises(ConnectionError) as exc_info:
            self.ssh_manager.connect(
                host='192.168.1.100',
                port=22,
                username='root',
                password='password123',
                max_retries=3
            )
        
        assert '已重试' in str(exc_info.value)
        assert mock_ssh_client.call_count == 3
    
    @patch('paramiko.SSHClient')
    def test_connection_reuse(self, mock_ssh_client):
        """测试连接复用"""
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_client.get_transport.return_value = mock_transport
        mock_ssh_client.return_value = mock_client
        
        # 第一次连接
        client1 = self.ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123'
        )
        
        # 第二次连接相同主机
        client2 = self.ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123'
        )
        
        # 应该复用同一个连接
        assert client1 == client2
        # 只创建了一次连接
        assert mock_ssh_client.call_count == 1
    
    # ==================== 连接池管理测试 ====================
    
    @patch('paramiko.SSHClient')
    def test_max_connections_limit(self, mock_ssh_client):
        """测试最大连接数限制"""
        ssh_manager = SSHManager(max_connections=2, connection_timeout=60)
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_client.get_transport.return_value = mock_transport
        mock_ssh_client.return_value = mock_client
        
        # 创建2个连接
        for i in range(2):
            ssh_manager.connect(
                host=f'192.168.1.{100 + i}',
                port=22,
                username='root',
                password='password123'
            )
        
        # 修改最后使用时间模拟老化
        for conn in ssh_manager.connections.values():
            conn.last_used = conn.last_used.replace(year=2000)
        
        # 创建第3个连接（应该清理最老的连接）
        ssh_manager.connect(
            host='192.168.1.103',
            port=22,
            username='root',
            password='password123'
        )
        
        assert ssh_manager.get_connection_count() == 2
        ssh_manager.close_all()
    
    def test_cleanup_expired_connections(self):
        """测试清理过期连接"""
        with patch('paramiko.SSHClient') as mock_ssh_client:
            mock_client = MagicMock()
            mock_ssh_client.return_value = mock_client
            
            ssh_manager = SSHManager(max_connections=5, connection_timeout=1)
            
            # 创建连接
            ssh_manager.connect(
                host='192.168.1.100',
                port=22,
                username='root',
                password='password123'
            )
            
            # 等待过期
            time.sleep(1.1)
            
            # 创建新连接触发清理
            mock_transport = MagicMock()
            mock_transport.is_active.return_value = True
            mock_client.get_transport.return_value = mock_transport
            
            ssh_manager.connect(
                host='192.168.1.101',
                port=22,
                username='root',
                password='password123'
            )
            
            assert ssh_manager.get_connection_count() == 1
            ssh_manager.close_all()
    
    def test_close_all_connections(self):
        """测试关闭所有连接"""
        with patch('paramiko.SSHClient') as mock_ssh_client:
            mock_client = MagicMock()
            mock_transport = MagicMock()
            mock_transport.is_active.return_value = True
            mock_client.get_transport.return_value = mock_transport
            mock_ssh_client.return_value = mock_client
            
            ssh_manager = SSHManager(max_connections=5)
            
            # 创建多个连接
            for i in range(3):
                ssh_manager.connect(
                    host=f'192.168.1.{100 + i}',
                    port=22,
                    username='root',
                    password='password123'
                )
            
            assert ssh_manager.get_connection_count() == 3
            
            # 关闭所有连接
            ssh_manager.close_all()
            
            assert ssh_manager.get_connection_count() == 0
            assert mock_client.close.call_count == 3
    
    # ==================== 命令执行测试 ====================
    
    @patch('paramiko.SSHClient')
    def test_execute_command_success(self, mock_ssh_client):
        """测试成功执行命令"""
        mock_client = MagicMock()
        mock_stdout = MagicMock()
        mock_stderr = MagicMock()
        mock_channel = MagicMock()
        
        mock_stdout.read.return_value = b'command output'
        mock_stderr.read.return_value = b''
        mock_stdout.channel.recv_exit_status.return_value = 0
        
        mock_client.exec_command.return_value = (None, mock_stdout, mock_stderr)
        mock_ssh_client.return_value = mock_client
        
        ssh_manager = SSHManager()
        client = ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123'
        )
        
        exit_code, stdout, stderr = ssh_manager.execute_command(
            client, 'ls -la', timeout=30
        )
        
        assert exit_code == 0
        assert stdout == 'command output'
        assert stderr == ''
    
    @patch('paramiko.SSHClient')
    def test_execute_command_failure(self, mock_ssh_client):
        """测试命令执行失败"""
        mock_client = MagicMock()
        mock_stdout = MagicMock()
        mock_stderr = MagicMock()
        
        mock_stdout.read.return_value = b''
        mock_stderr.read.return_value = b'command not found'
        mock_stdout.channel.recv_exit_status.return_value = 127
        
        mock_client.exec_command.return_value = (None, mock_stdout, mock_stderr)
        mock_ssh_client.return_value = mock_client
        
        ssh_manager = SSHManager()
        client = ssh_manager.connect(
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123'
        )
        
        exit_code, stdout, stderr = ssh_manager.execute_command(
            client, 'invalid_command', timeout=30
        )
        
        assert exit_code == 127
        assert stderr == 'command not found'
    
    # ==================== 安全性测试 ====================
    
    def test_ssh_connection_is_alive(self):
        """测试SSH连接存活检查"""
        with patch('paramiko.SSHClient') as mock_ssh_client:
            mock_client = MagicMock()
            mock_transport = MagicMock()
            mock_transport.is_active.return_value = True
            mock_client.get_transport.return_value = mock_transport
            
            conn = SSHConnection(
                client=mock_client,
                host='192.168.1.100',
                port=22,
                username='root',
                password='password123',
                created_at=__import__('datetime').datetime.now()
            )
            
            assert conn.is_alive() is True
            
            # 测试连接不活跃
            mock_transport.is_active.return_value = False
            assert conn.is_alive() is False
    
    def test_ssh_connection_expired(self):
        """测试SSH连接过期检查"""
        from datetime import datetime, timedelta
        
        mock_client = MagicMock()
        conn = SSHConnection(
            client=mock_client,
            host='192.168.1.100',
            port=22,
            username='root',
            password='password123',
            created_at=datetime.now()
        )
        
        # 设置过期时间
        conn.last_used = datetime.now() - timedelta(seconds=301)
        
        assert conn.is_expired(timeout_seconds=300) is True
        assert conn.is_expired(timeout_seconds=600) is False
    
    # ==================== 并发安全性测试 ====================
    
    @patch('paramiko.SSHClient')
    def test_concurrent_connections(self, mock_ssh_client):
        """测试并发连接"""
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_client.get_transport.return_value = mock_transport
        mock_ssh_client.return_value = mock_client
        
        ssh_manager = SSHManager(max_connections=10)
        errors = []
        
        def create_connections(start_id):
            try:
                for i in range(5):
                    ssh_manager.connect(
                        host=f'192.168.1.{100 + start_id + i}',
                        port=22,
                        username='root',
                        password='password123'
                    )
            except Exception as e:
                errors.append(e)
        
        threads = []
        for i in range(3):
            t = threading.Thread(target=create_connections, args=(i * 5,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        assert len(errors) == 0
        assert ssh_manager.get_connection_count() == 10  # 最多10个连接
        ssh_manager.close_all()
    
    # ==================== 性能测试 ====================
    
    @patch('paramiko.SSHClient')
    def test_connection_performance(self, mock_ssh_client):
        """测试连接性能"""
        mock_client = MagicMock()
        mock_ssh_client.return_value = mock_client
        
        ssh_manager = SSHManager(max_connections=100)
        
        start_time = time.time()
        
        # 快速创建多个连接
        for i in range(50):
            ssh_manager.connect(
                host=f'192.168.1.{100 + i}',
                port=22,
                username='root',
                password='password123'
            )
        
        elapsed = time.time() - start_time
        
        # 创建50个连接应该在0.1秒内完成（使用mock）
        assert elapsed < 1.0, f"连接性能测试失败: {elapsed}秒"
        assert ssh_manager.get_connection_count() == 50
        
        ssh_manager.close_all()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
