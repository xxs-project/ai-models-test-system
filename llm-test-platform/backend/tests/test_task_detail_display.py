"""
任务详情显示测试

测试任务详情是否正确显示所有字段，包括：
- NPU数量
- 图模式
- 测试路径
- 执行标识
"""

import pytest
import sys
import os

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


class TestTaskDetailDisplay:
    """任务详情显示测试类"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_single_model_task_detail_fields(self):
        """测试单模型测试任务详情显示所有字段"""
        
        # 创建设备
        device_data = {
            "ip": "7.6.52.110",
            "port": 22,
            "username": "root",
            "password": "password123"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建单模型测试任务
        task_data = {
            "task_name": "Qwen3-14B性能测试",
            "priority": 2,
            "test_type": 2,  # 性能测试
            "test_mode": 1,  # 单模型测试
            "device_id": device_id,
            "inference_framework": "vLLM",
            "framework_version": "v0.12.0rc1",
            "model_name": "Qwen3-14B",
            "npu_count": 2,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "script_path": "/data/models-test/scripts/vllm_benchmark_auto",
            "execution_flag": "1",
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # 获取任务详情
        get_response = client.get(f"/api/tasks/{task_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        
        # 验证所有字段都正确返回
        assert data["task_name"] == "Qwen3-14B性能测试"
        assert data["test_type"] == 2
        assert data["test_mode"] == 1
        assert data["model_name"] == "Qwen3-14B"
        assert data["npu_count"] == 2, "NPU数量应该正确返回"
        assert data["graph_mode"] == "eager", "图模式应该正确返回"
        assert data["script_path"] == "/data/models-test/scripts/vllm_benchmark_auto", "测试路径应该正确返回"
        assert data["execution_flag"] == "1", "执行标识应该正确返回"
    
    def test_all_models_task_detail(self):
        """测试全套模型测试任务详情"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建全套模型测试任务
        task_data = {
            "task_name": "全套模型测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 2,  # 全套模型
            "device_id": device_id,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.0",
            "model_path": "/data/models/*",
            "script_path": "/home/user/scripts",
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        get_response = client.get(f"/api/tasks/{task_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        
        # 全套模型测试不应该显示单模型特有字段
        assert data["test_mode"] == 2
        # 这些字段可能为空或不显示
        assert data.get("model_name") is None or data.get("model_name") == ""
    
    def test_execution_flag_values(self):
        """测试执行标识的不同值"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        execution_flags = [
            ("1", "自定义性能脚本"),
            ("2", "VLLM基准测试脚本"),
        ]
        
        for flag, description in execution_flags:
            task_data = {
                "task_name": f"执行标识测试-{description}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_name": "Test",
                "npu_count": 2,
                "graph_mode": "eager",
                "model_path": "/data/models",
                "execution_flag": flag,
            }
            
            create_response = client.post("/api/tasks", json=task_data)
            assert create_response.status_code == 200
            task_id = create_response.json()["id"]
            
            get_response = client.get(f"/api/tasks/{task_id}")
            data = get_response.json()
            
            assert data["execution_flag"] == flag, f"执行标识应该是 {flag}"
    
    def test_graph_mode_values(self):
        """测试不同图模式的显示"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        graph_modes = ["eager", "mindie", "graph"]
        
        for mode in graph_modes:
            task_data = {
                "task_name": f"图模式测试-{mode}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "MindIE",
                "model_name": "Test",
                "npu_count": 2,
                "graph_mode": mode,
                "model_path": "/data/models",
            }
            
            create_response = client.post("/api/tasks", json=task_data)
            assert create_response.status_code == 200
            task_id = create_response.json()["id"]
            
            get_response = client.get(f"/api/tasks/{task_id}")
            data = get_response.json()
            
            assert data["graph_mode"] == mode, f"图模式应该是 {mode}"
    
    def test_npu_count_range(self):
        """测试NPU数量的不同值"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        npu_counts = [1, 2, 4, 8, 16]
        
        for count in npu_counts:
            task_data = {
                "task_name": f"NPU测试-{count}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_name": "Test",
                "npu_count": count,
                "graph_mode": "eager",
                "model_path": "/data/models",
            }
            
            create_response = client.post("/api/tasks", json=task_data)
            assert create_response.status_code == 200
            task_id = create_response.json()["id"]
            
            get_response = client.get(f"/api/tasks/{task_id}")
            data = get_response.json()
            
            assert data["npu_count"] == count, f"NPU数量应该是 {count}"
    
    def test_script_path_display(self):
        """测试测试路径的显示"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        script_paths = [
            "/data/models-test/scripts/vllm_benchmark_auto",
            "/home/user/scripts",
            "/opt/test/scripts",
        ]
        
        for path in script_paths:
            task_data = {
                "task_name": f"路径测试-{path.split('/')[-1]}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_name": "Test",
                "npu_count": 2,
                "graph_mode": "eager",
                "model_path": "/data/models",
                "script_path": path,
            }
            
            create_response = client.post("/api/tasks", json=task_data)
            assert create_response.status_code == 200
            task_id = create_response.json()["id"]
            
            get_response = client.get(f"/api/tasks/{task_id}")
            data = get_response.json()
            
            assert data["script_path"] == path, f"测试路径应该是 {path}"
    
    def test_null_optional_fields(self):
        """测试可选字段为空时的处理"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务时省略可选字段
        task_data = {
            "task_name": "可选字段测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_name": "Test",
            "model_path": "/data/models",
            # 省略 npu_count, graph_mode, script_path, execution_flag
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        get_response = client.get(f"/api/tasks/{task_id}")
        data = get_response.json()
        
        # 验证使用默认值
        assert data["npu_count"] == 1  # 默认值
        assert data["graph_mode"] is None or data["graph_mode"] == ""
        assert data["script_path"] == "/home/user/scripts"  # 默认值
        assert data["execution_flag"] == "1"  # 默认值


class TestTaskListDisplay:
    """任务列表显示测试"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_task_list_with_all_fields(self):
        """测试任务列表正确显示"""
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建多个任务
        tasks = [
            {
                "task_name": "性能测试1",
                "priority": 2,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_name": "Qwen3-14B",
                "npu_count": 2,
                "graph_mode": "eager",
                "model_path": "/data/models",
                "script_path": "/data/scripts",
                "execution_flag": "1",
            },
            {
                "task_name": "性能测试2",
                "priority": 1,
                "test_type": 2,
                "test_mode": 2,
                "device_id": device_id,
                "inference_framework": "MindIE",
                "model_path": "/data/models/*",
                "script_path": "/home/scripts",
            },
        ]
        
        for task_data in tasks:
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
        
        # 获取任务列表
        list_response = client.get("/api/tasks?page=1&size=10")
        assert list_response.status_code == 200
        
        data = list_response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        
        # 验证列表中的字段
        for item in data["items"]:
            assert "task_name" in item
            assert "test_type" in item
            assert "test_mode" in item
            assert "inference_framework" in item


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
