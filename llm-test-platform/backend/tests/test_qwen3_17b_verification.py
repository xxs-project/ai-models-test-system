
import pytest
import sys
import os
from unittest.mock import MagicMock, patch, ANY

# 添加项目根目录到python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder
from services.task_executor import TaskExecutor
from main import app, get_session
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from models import Task
from sqlalchemy.pool import StaticPool

# 使用内存数据库进行测试，使用 StaticPool 允许跨线程共享
engine = create_engine(
    "sqlite:///:memory:", 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

def get_test_session():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = get_test_session
client = TestClient(app)

class TestQwen3_17B_Verification:
    
    def setup_method(self):
        SQLModel.metadata.create_all(engine)
        
    def teardown_method(self):
        SQLModel.metadata.drop_all(engine)
        
    def test_qwen3_17b_task_creation_and_command_generation(self):
        """
        验证Qwen3-1.7B任务的功能正确性
        """
        # 1. 准备任务数据
        task_data = {
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
        
        # 2. 调用API创建任务
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 200, f"创建任务失败: {response.text}"
        created_task = response.json()
        
        # 3. 验证数据库存储
        with Session(engine) as session:
            db_task = session.get(Task, created_task["id"])
            assert db_task is not None
            assert db_task.execution_flag == "1"
            
        # 4. 验证命令构建
        task_dict = db_task.model_dump()
        command = CommandBuilder.build_command(task_dict)
        print(f"\n生成的命令: {command}")
        
        assert "bash run_benchmark_all_models.sh" in command
        assert "-b /data/models" in command or "-b '/data/models'" in command
        assert "-m Qwen3-1.7" in command or "-m 'Qwen3-1.7'" in command
        assert "-n 1" in command
        assert "-e 1" in command or "-e '1'" in command
        
    @pytest.mark.asyncio
    @patch('services.task_executor.SSHManager')
    async def test_task_execution_flow(self, mock_ssh_manager_class):
        """
        验证任务执行流程
        """
        mock_ssh_client = MagicMock()
        mock_ssh_manager = mock_ssh_manager_class.return_value
        mock_ssh_manager.connect.return_value = mock_ssh_client
        mock_ssh_manager.execute_command.side_effect = [
            (0, "/data/models-test/scripts/vllm_benchmark_auto", ""), 
            (0, "Benchmark finished successfully", "")
        ]
        
        executor = TaskExecutor(ssh_manager=mock_ssh_manager)
        
        task_info = {
            'id': 1,
            'task_name': "Qwen3-1.7B性能测试",
            'test_type': 1,
            'test_mode': 1,
            'script_path': "/data/models-test/scripts/vllm_benchmark_auto",
            'model_name': "Qwen3-1.7",
            'model_path': "/data/models",
            'npu_count': 1,
            'graph_mode': "eager",
            'execution_flag': "1",
            'framework_version': "v0.12.0rc1",
            'inference_framework': "vllm"
        }
        
        device_info = {
            'ip': "7.6.52.110",
            'port': 22,
            'username': "root",
            'password': "Xfusion@123"
        }
        
        result = await executor.execute_task(task_info, device_info)
        assert result.success is True

    def test_security_input_validation(self):
        """
        安全性测试：验证输入注入防护
        """
        task_dict = {
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7; rm -rf /',
            'execution_flag': '1 && echo hacked',
            'model_path': '/data/models'
        }
        
        command = CommandBuilder.build_command(task_dict)
        
        # 1. 分号应该被移除
        assert ";" not in command
        # 2. && 应该被移除
        assert "&&" not in command
        # 3. 整个参数应该被引用，防止作为命令执行
        # command 类似: ... -m 'Qwen3-1.7 rm -rf /' ...
        # 我们验证它不再构成危险的 shell 命令序列
        assert "rm -rf /" in command # 它作为字符串存在
        assert "; rm -rf /" not in command # 但不作为分隔命令存在

