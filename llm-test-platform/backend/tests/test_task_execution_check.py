"""
任务执行改进测试

测试任务执行前的检查功能和改进后的错误处理
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app, get_session
from models import Device, Task


# 创建测试数据库
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

def override_get_session():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = override_get_session

client = TestClient(app)


class TestTaskPreExecutionCheck:
    """任务执行前检查测试类"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    @patch('paramiko.SSHClient')
    def test_check_task_executable_success(self, mock_ssh_class):
        """测试任务可执行检查 - 成功"""
        
        # Mock SSH连接
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_ssh.get_transport.return_value = mock_transport
        
        # Mock exec_command
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b''
        mock_ssh.exec_command.return_value = (None, mock_stdout, mock_stderr)
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "检查测试任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
            "script_path": "/home/user/scripts",
            "npu_count": 2,
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行检查
        check_response = client.post(f"/api/tasks/{task_id}/check")
        
        assert check_response.status_code == 200
        data = check_response.json()
        assert data["executable"] is True
        assert "device_ip" in data
    
    @patch('paramiko.SSHClient')
    def test_check_task_executable_ssh_failure(self, mock_ssh_class):
        """测试任务可执行检查 - SSH连接失败"""
        
        # Mock SSH连接失败
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_ssh.connect.side_effect = Exception("Connection refused")
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "wrong_password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "SSH失败测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行检查
        check_response = client.post(f"/api/tasks/{task_id}/check")
        
        # 应该返回错误
        assert check_response.status_code == 400
        assert "失败" in check_response.json()["detail"]
    
    def test_check_task_no_device(self):
        """测试检查 - 没有设备信息"""
        
        # 创建任务，但不指定设备
        task_data = {
            "task_name": "无设备测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行检查
        check_response = client.post(f"/api/tasks/{task_id}/check")
        
        assert check_response.status_code == 400
        assert "设备" in check_response.json()["detail"]


class TestTaskExecutionWithPreCheck:
    """任务执行带预检查测试"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    @patch('paramiko.SSHClient')
    def test_execute_with_preflight_check(self, mock_ssh_class):
        """测试执行时进行预检查"""
        
        # Mock SSH
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_transport = MagicMock()
        mock_transport.is_active.return_value = True
        mock_ssh.get_transport.return_value = mock_transport
        
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_stderr = MagicMock()
        mock_ssh.exec_command.return_value = (None, mock_stdout, mock_stderr)
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "预检查执行任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
            "script_path": "/home/user/scripts",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行任务
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        
        assert execute_response.status_code == 200
        data = execute_response.json()
        assert data["status"] == 3  # 执行中
    
    @patch('paramiko.SSHClient')
    def test_execute_fail_preflight(self, mock_ssh_class):
        """测试预检查失败阻止执行"""
        
        # Mock SSH连接失败
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_ssh.connect.side_effect = Exception("Connection refused")
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "wrong"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "预检查失败任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行任务
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        
        # 应该返回错误，预检查失败
        assert execute_response.status_code == 400
        
        # 验证任务状态为失败
        get_response = client.get(f"/api/tasks/{task_id}")
        assert get_response.json()["status"] == 5  # 失败


class TestTaskCheckerModule:
    """TaskChecker模块测试"""
    
    def test_task_checker_import(self):
        """测试TaskChecker模块可导入"""
        try:
            from services.task_checker import TaskExecutionChecker, check_task_executable
            assert TaskExecutionChecker is not None
            assert check_task_executable is not None
        except ImportError as e:
            pytest.fail(f"导入TaskChecker失败: {e}")
    
    @patch('paramiko.SSHClient')
    def test_check_device_connection(self, mock_ssh_class):
        """测试设备连接检查"""
        from services.task_checker import TaskExecutionChecker
        
        # Mock成功连接
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'connection test'
        mock_ssh.exec_command.return_value = (None, mock_stdout, MagicMock())
        
        checker = TaskExecutionChecker()
        device_info = {
            'ip': '192.168.1.100',
            'port': 22,
            'username': 'root',
            'password': 'password'
        }
        
        success, error = checker.check_device_connection(device_info)
        assert success is True
        assert error == ""
    
    @patch('paramiko.SSHClient')
    def test_check_script_directory(self, mock_ssh_class):
        """测试脚本目录检查"""
        from services.task_checker import TaskExecutionChecker
        
        mock_ssh = MagicMock()
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_ssh.exec_command.return_value = (None, mock_stdout, MagicMock())
        
        checker = TaskExecutionChecker()
        success, error = checker.check_script_directory(mock_ssh, '/home/user/scripts')
        
        assert success is True
        assert error == ""
    
    @patch('paramiko.SSHClient')
    def test_check_model_path(self, mock_ssh_class):
        """测试模型路径检查"""
        from services.task_checker import TaskExecutionChecker
        
        mock_ssh = MagicMock()
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_ssh.exec_command.return_value = (None, mock_stdout, MagicMock())
        
        checker = TaskExecutionChecker()
        success, error = checker.check_model_path(mock_ssh, '/data/models')
        
        assert success is True


class TestTaskExecutionErrorHandling:
    """任务执行错误处理测试"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_execute_nonexistent_task(self):
        """测试执行不存在的任务"""
        response = client.post("/api/tasks/99999/execute")
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]
    
    def test_execute_task_wrong_status(self):
        """测试执行状态不正确的任务"""
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "状态测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 先执行一次
        client.post(f"/api/tasks/{task_id}/execute")
        
        # 再次执行应该失败
        response = client.post(f"/api/tasks/{task_id}/execute")
        assert response.status_code == 400
        assert "不能执行" in response.json()["detail"]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
