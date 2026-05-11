"""
任务列表状态显示测试

测试任务列表是否正确显示任务状态
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


class TestTaskListStatusDisplay:
    """任务列表状态显示测试类"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_task_list_with_status_column(self):
        """测试任务列表包含状态字段"""
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建不同状态的任务
        statuses = [
            (0, "待执行"),
            (1, "队列中"),
            (2, "准备中"),
            (3, "执行中"),
            (4, "已完成"),
            (5, "失败"),
            (6, "已取消"),
        ]
        
        for status, _ in statuses:
            task_data = {
                "task_name": f"状态测试-{status}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_path": "/data/models",
                "status": status,
                "progress": 0 if status < 3 else (100 if status == 4 else 50),
            }
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
        
        # 获取任务列表
        list_response = client.get("/api/tasks?page=1&size=20")
        assert list_response.status_code == 200
        
        data = list_response.json()
        assert data["total"] == 7
        
        # 验证每个任务都有状态字段
        for task in data["items"]:
            assert "status" in task, "任务应该包含status字段"
            assert isinstance(task["status"], int), "status应该是整数"
    
    def test_task_status_values(self):
        """测试不同状态值的显示"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 测试各种状态
        test_cases = [
            {"status": 0, "name": "待执行任务", "progress": 0},
            {"status": 3, "name": "执行中任务", "progress": 50},
            {"status": 4, "name": "已完成任务", "progress": 100},
            {"status": 5, "name": "失败任务", "progress": 0},
        ]
        
        for case in test_cases:
            task_data = {
                "task_name": case["name"],
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_path": "/data/models",
                "status": case["status"],
                "progress": case["progress"],
            }
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
            
            task_id = response.json()["id"]
            
            # 获取任务详情验证状态
            detail_response = client.get(f"/api/tasks/{task_id}")
            assert detail_response.status_code == 200
            
            data = detail_response.json()
            assert data["status"] == case["status"]
            assert data["progress"] == case["progress"]
    
    def test_task_status_filter(self):
        """测试按状态筛选任务"""
        
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建不同状态的任务
        for i in range(3):
            task_data = {
                "task_name": f"待执行任务-{i}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_path": "/data/models",
                "status": 0,  # 待执行
            }
            client.post("/api/tasks", json=task_data)
        
        for i in range(2):
            task_data = {
                "task_name": f"已完成任务-{i}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "device_id": device_id,
                "inference_framework": "vLLM",
                "model_path": "/data/models",
                "status": 4,  # 已完成
            }
            client.post("/api/tasks", json=task_data)
        
        # 按状态筛选 - 待执行
        response = client.get("/api/tasks?page=1&size=10&status=0")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        for task in data["items"]:
            assert task["status"] == 0
        
        # 按状态筛选 - 已完成
        response = client.get("/api/tasks?page=1&size=10&status=4")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        for task in data["items"]:
            assert task["status"] == 4
    
    def test_task_status_update(self):
        """测试任务状态更新"""
        
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
            "task_name": "状态更新测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
            "status": 0,
        }
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 更新状态为执行中
        update_response = client.put(f"/api/tasks/{task_id}", json={
            "status": 3,
            "progress": 50
        })
        assert update_response.status_code == 200
        
        data = update_response.json()
        assert data["status"] == 3
        assert data["progress"] == 50
        
        # 再更新为已完成
        update_response = client.put(f"/api/tasks/{task_id}", json={
            "status": 4,
            "progress": 100
        })
        assert update_response.status_code == 200
        
        data = update_response.json()
        assert data["status"] == 4
        assert data["progress"] == 100
    
    def test_task_status_transition(self):
        """测试任务状态流转"""
        
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
            "task_name": "状态流转测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "inference_framework": "vLLM",
            "model_path": "/data/models",
        }
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 200
        assert create_response.json()["status"] == 0  # 默认待执行
        
        task_id = create_response.json()["id"]
        
        # 执行
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        assert execute_response.status_code == 200
        assert execute_response.json()["status"] == 3  # 执行中
        
        # 取消
        cancel_response = client.post(f"/api/tasks/{task_id}/cancel")
        assert cancel_response.status_code == 200
        assert cancel_response.json()["status"] == 6  # 已取消


class TestTaskStatusConfig:
    """任务状态配置测试"""
    
    def test_status_config_complete(self):
        """测试状态配置完整"""
        
        # 验证所有状态都有对应的配置
        status_config = {
            0: { "color": "bg-gray-100 text-gray-800", "label": "待执行" },
            1: { "color": "bg-blue-100 text-blue-800", "label": "队列中" },
            2: { "color": "bg-yellow-100 text-yellow-800", "label": "准备中" },
            3: { "color": "bg-orange-100 text-orange-800", "label": "执行中" },
            4: { "color": "bg-green-100 text-green-800", "label": "已完成" },
            5: { "color": "bg-red-100 text-red-800", "label": "失败" },
            6: { "color": "bg-gray-100 text-gray-800", "label": "已取消" },
            7: { "color": "bg-red-100 text-red-800", "label": "超时" },
        }
        
        # 验证配置完整性
        for status in range(8):
            assert status in status_config, f"状态 {status} 应该有配置"
            assert "color" in status_config[status], f"状态 {status} 应该有颜色配置"
            assert "label" in status_config[status], f"状态 {status} 应该有标签配置"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
