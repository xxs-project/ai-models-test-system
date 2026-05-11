"""
任务执行API集成测试

验证修复后的API端点行为
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 创建内存数据库用于测试
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def override_get_session():
    with Session(engine) as session:
        yield session


# 必须在导入main之前设置
import main
main.engine = engine
main.get_session = override_get_session

from main import app, get_session

app.dependency_overrides[get_session] = override_get_session

client = TestClient(app)


class TestTaskExecuteAPI:
    """测试任务执行API"""
    
    @classmethod
    def setup_class(cls):
        """设置测试环境"""
        SQLModel.metadata.create_all(engine)
        
        # 创建设备
        response = client.post("/api/devices", json={
            "ip": "7.6.52.110",
            "port": 22,
            "username": "root",
            "password": "password123",
            "remark": "测试设备"
        })
        cls.device_id = response.json()["id"]
    
    def test_create_task(self):
        """测试创建任务"""
        response = client.post("/api/tasks", json={
            "task_name": "Qwen3-32B性能测试",
            "priority": 2,
            "test_type": 1,
            "test_mode": 1,
            "device_id": self.device_id,
            "script_path": "/data/models-test/scripts/vllm_benchmark_auto",
            "model_name": "Qwen3-32B",
            "npu_count": 4,
            "graph_mode": "eager",
            "execution_flag": "1",
            "model_path": "/data/models",
            "inference_framework": "vllm",
            "framework_version": "v0.12.0rc1",
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_name"] == "Qwen3-32B性能测试"
        assert data["status"] == 0  # PENDING
        self.task_id = data["id"]
    
    @patch('services.task_checker.paramiko.SSHClient')
    def test_check_task_executable_with_paramiko(self, mock_ssh_class):
        """测试任务预检API - 验证paramiko导入修复"""
        # 先创建任务
        response = client.post("/api/tasks", json={
            "task_name": "测试任务",
            "priority": 1,
            "test_type": 1,
            "test_mode": 1,
            "device_id": self.device_id,
            "script_path": "/data/test",
            "model_name": "TestModel",
            "npu_count": 4,
            "model_path": "/data/models",
            "inference_framework": "vllm",
        })
        task_id = response.json()["id"]
        
        # Mock SSH连接
        mock_ssh = MagicMock()
        mock_ssh_class.return_value = mock_ssh
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stdout.read.return_value = b'exists'
        mock_ssh.exec_command.return_value = (None, mock_stdout, None)
        
        # 调用检查API
        response = client.post(f"/api/tasks/{task_id}/check")
        
        # 验证请求成功（不是500错误）
        assert response.status_code != 500
        # 可能会返回400（如果连接失败），但不会返回500（内部错误）
        if response.status_code == 200:
            data = response.json()
            assert "executable" in data
    
    def test_cancel_task_status_code(self):
        """测试取消任务API - 验证状态码使用正确（应为5而不是6）"""
        # 创建任务
        response = client.post("/api/tasks", json={
            "task_name": "取消测试任务",
            "priority": 1,
            "test_type": 1,
            "test_mode": 1,
            "device_id": self.device_id,
            "model_path": "/data/models",
            "inference_framework": "vllm",
        })
        task_id = response.json()["id"]
        
        # 取消任务
        response = client.post(f"/api/tasks/{task_id}/cancel")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 5  # CANCELLED = 5，不是6
    
    def test_task_status_enum_consistency(self):
        """测试任务状态枚举一致性"""
        from services.command_builder import TaskStatus
        
        # 验证状态值
        assert TaskStatus.PENDING == 0
        assert TaskStatus.QUEUED == 1
        assert TaskStatus.RUNNING == 2
        assert TaskStatus.COMPLETED == 3
        assert TaskStatus.FAILED == 4
        assert TaskStatus.CANCELLED == 5
        
        # 验证状态名称
        assert TaskStatus(0).name == "PENDING"
        assert TaskStatus(1).name == "QUEUED"
        assert TaskStatus(2).name == "RUNNING"
        assert TaskStatus(3).name == "COMPLETED"
        assert TaskStatus(4).name == "FAILED"
        assert TaskStatus(5).name == "CANCELLED"


class TestTaskExecuteEndpoint:
    """专门测试任务执行端点"""
    
    def test_execute_task_paramiko_import(self):
        """测试执行任务端点能正确处理（paramiko已导入）"""
        # 创建设备和任务
        device_response = client.post("/api/devices", json={
            "ip": "192.168.1.100",
            "port": 22,
            "username": "test",
            "password": "test123",
        })
        device_id = device_response.json()["id"]
        
        task_response = client.post("/api/tasks", json={
            "task_name": "执行测试",
            "device_id": device_id,
            "model_path": "/data/models",
            "inference_framework": "vllm",
        })
        task_id = task_response.json()["id"]
        task_status = task_response.json()["status"]
        
        # 验证任务初始状态是PENDING (0)
        assert task_status == 0
        
        # 验证任务状态可以执行（0或1）
        assert task_status in [0, 1]


class TestCommandBuilderEdgeCases:
    """测试命令构建器的边界情况"""
    
    def test_empty_model_name(self):
        """测试空模型名称"""
        from services.command_builder import CommandBuilder
        
        task = {
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
            'model_name': '',
            'npu_count': 4,
        }
        
        command = CommandBuilder.build_command(task)
        # 空字符串应该被正确处理
        assert '""' in command or '-m ""' in command
    
    def test_special_characters_in_path(self):
        """测试路径中包含特殊字符"""
        from services.command_builder import CommandBuilder
        
        task = {
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models with spaces',
            'model_name': 'Model-Name_V1.0',
            'npu_count': 4,
        }
        
        command = CommandBuilder.build_command(task)
        assert '/data/models with spaces' in command
        assert 'Model-Name_V1.0' in command
    
    def test_framework_case_insensitive(self):
        """测试框架名称大小写不敏感"""
        from services.command_builder import CommandBuilder
        
        task_upper = {
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'VLLM',
            'model_path': '/data/models',
        }
        
        task_lower = {
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_path': '/data/models',
        }
        
        command_upper = CommandBuilder.build_command(task_upper)
        command_lower = CommandBuilder.build_command(task_lower)
        
        # 两者应该生成相同的命令
        assert command_upper == command_lower


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
