"""
任务创建字段映射测试

测试创建任务时的字段映射和数据验证
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 导入后端应用
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


class TestTaskCreateFieldMapping:
    """任务创建字段映射测试类"""
    
    @classmethod
    def setup_class(cls):
        """测试类开始前创建表"""
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        """每个测试方法前清理数据"""
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_create_task_with_all_fields(self):
        """测试使用所有字段创建任务（对应用户场景）"""
        # 先创建设备
        device_data = {
            "ip": "7.6.52.110",
            "port": 22,
            "username": "root",
            "password": "password123"
        }
        device_response = client.post("/api/devices", json=device_data)
        assert device_response.status_code == 200
        device_id = device_response.json()["id"]
        
        # 创建任务 - 模拟用户提供的完整数据
        task_data = {
            "task_name": "Qwen3-14B性能测试",
            "priority": 2,  # 高
            "test_type": 2,  # 性能测试
            "test_mode": 1,  # 单模型测试
            "device_id": device_id,  # 设备7.6.52.110
            "device_ip": None,
            "device_username": None,
            "device_password": None,
            "script_path": "/data/models-test/scripts/vllm_benchmark_auto",
            "model_name": "Qwen3-14B",
            "npu_count": 2,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "inference_framework": "vLLM",
            "framework_version": "v0.12.0rc1",
            "execution_flag": "1",  # 自定义性能脚本
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        # 验证创建成功
        assert response.status_code == 200, f"创建失败: {response.text}"
        data = response.json()
        
        # 验证所有字段正确保存
        assert data["task_name"] == "Qwen3-14B性能测试"
        assert data["priority"] == 2
        assert data["test_type"] == 2
        assert data["test_mode"] == 1
        assert data["device_id"] == device_id
        assert data["script_path"] == "/data/models-test/scripts/vllm_benchmark_auto"
        assert data["model_name"] == "Qwen3-14B"
        assert data["npu_count"] == 2
        assert data["graph_mode"] == "eager"
        assert data["model_path"] == "/data/models"
        assert data["inference_framework"] == "vLLM"
        assert data["framework_version"] == "v0.12.0rc1"
        assert data["execution_flag"] == "1"
        assert data["status"] == 0  # 待执行
    
    def test_create_task_with_manual_device(self):
        """测试使用手动设备信息创建任务"""
        task_data = {
            "task_name": "手动设备测试任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": None,
            "device_ip": "192.168.1.100",
            "device_username": "admin",
            "device_password": "admin123",
            "script_path": "/home/user/scripts",
            "model_name": "TestModel",
            "npu_count": 4,
            "graph_mode": "mindie",
            "model_path": "/data/models/test",
            "inference_framework": "MindIE",
            "framework_version": "v1.0.0",
            "execution_flag": "2",
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["device_id"] is None
        assert data["device_ip"] == "192.168.1.100"
        assert data["device_username"] == "admin"
        assert data["device_password"] == "admin123"
    
    def test_create_task_default_values(self):
        """测试创建任务时使用默认值"""
        # 先创建设备
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务时省略可选字段
        task_data = {
            "task_name": "默认字段测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "model_path": "/data/models",
            "inference_framework": "MindIE",
            # 省略其他可选字段
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证默认值
        assert data["script_path"] == "/home/user/scripts"  # 默认值
        assert data["npu_count"] == 1  # 默认值
        assert data["execution_flag"] == "1"  # 默认值
        assert data["concurrencies"] == "1,8,16,32,64"  # 默认值
        assert data["context_lengths"] == "1024,2048,4096"  # 默认值
    
    def test_create_task_missing_required_field(self):
        """测试缺少必填字段时的错误处理"""
        # 缺少必填字段 task_name
        task_data = {
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "model_path": "/data/models",
            "inference_framework": "MindIE",
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        # 应该返回验证错误
        assert response.status_code == 422
    
    def test_create_task_invalid_npu_count(self):
        """测试无效的NPU数量"""
        # 先创建设备
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        task_data = {
            "task_name": "NPU测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "npu_count": 0,  # 无效的NPU数量
            "model_path": "/data/models",
            "inference_framework": "MindIE",
        }
        
        # 应该能接受0值（虽然业务上可能不合理）
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["npu_count"] == 0
    
    def test_update_task_fields(self):
        """测试更新任务字段"""
        # 先创建任务
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        task_data = {
            "task_name": "原始任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "npu_count": 2,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "inference_framework": "MindIE",
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 更新任务
        update_data = {
            "task_name": "更新后的任务",
            "npu_count": 4,
            "graph_mode": "mindie",
            "framework_version": "v2.0.0"
        }
        
        update_response = client.put(f"/api/tasks/{task_id}", json=update_data)
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert data["task_name"] == "更新后的任务"
        assert data["npu_count"] == 4
        assert data["graph_mode"] == "mindie"
        assert data["framework_version"] == "v2.0.0"
        # 未更新的字段保持不变
        assert data["test_type"] == 2
    
    def test_get_task_with_all_fields(self):
        """测试获取任务时返回所有字段"""
        # 先创建设备
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "完整字段任务",
            "priority": 2,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "device_ip": None,
            "device_username": None,
            "device_password": None,
            "script_path": "/custom/path",
            "model_name": "Qwen3-14B",
            "npu_count": 2,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "inference_framework": "vLLM",
            "framework_version": "v0.12.0rc1",
            "execution_flag": "1",
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 获取任务
        get_response = client.get(f"/api/tasks/{task_id}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        # 验证所有字段都返回
        assert "task_name" in data
        assert "priority" in data
        assert "test_type" in data
        assert "test_mode" in data
        assert "device_id" in data
        assert "script_path" in data
        assert "model_name" in data
        assert "npu_count" in data
        assert "graph_mode" in data
        assert "model_path" in data
        assert "inference_framework" in data
        assert "framework_version" in data
        assert "execution_flag" in data


class TestTaskFieldValidation:
    """任务字段验证测试"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_npu_count_boundary_values(self):
        """测试NPU数量的边界值"""
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        test_cases = [
            (1, True),   # 最小有效值
            (128, True), # 最大有效值
            (64, True),  # 中间值
        ]
        
        for npu_count, should_succeed in test_cases:
            task_data = {
                "task_name": f"NPU测试{npu_count}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "npu_count": npu_count,
                "model_path": "/data/models",
                "inference_framework": "MindIE",
            }
            
            response = client.post("/api/tasks", json=task_data)
            
            if should_succeed:
                assert response.status_code == 200, f"NPU数量{npu_count}应该成功"
                assert response.json()["npu_count"] == npu_count
    
    def test_execution_flag_values(self):
        """测试执行标识的不同值"""
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        execution_flags = ["1", "2"]  # 1=自定义脚本, 2=VLLM基准测试
        
        for flag in execution_flags:
            task_data = {
                "task_name": f"执行标识测试{flag}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "execution_flag": flag,
                "model_path": "/data/models",
                "inference_framework": "MindIE",
            }
            
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
            assert response.json()["execution_flag"] == flag
    
    def test_graph_mode_values(self):
        """测试图模式的不同值"""
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        graph_modes = ["eager", "mindie", "graph"]
        
        for mode in graph_modes:
            task_data = {
                "task_name": f"图模式测试{mode}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "graph_mode": mode,
                "model_path": "/data/models",
                "inference_framework": "MindIE",
            }
            
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
            assert response.json()["graph_mode"] == mode
    
    def test_framework_version_format(self):
        """测试框架版本格式"""
        device_data = {"ip": "192.168.1.1", "port": 22, "username": "root", "password": "pass"}
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        versions = [
            "v0.12.0rc1",  # 用户提供的版本
            "v1.0.0",
            "v2.5.3-beta",
        ]
        
        for version in versions:
            task_data = {
                "task_name": f"版本测试{version}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "framework_version": version,
                "model_path": "/data/models",
                "inference_framework": "MindIE",
            }
            
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
            assert response.json()["framework_version"] == version


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
