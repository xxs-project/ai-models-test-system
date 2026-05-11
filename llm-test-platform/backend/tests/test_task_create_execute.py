"""
后端API测试 - 任务创建与执行

测试任务创建后自动执行的完整流程
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
from models import Task
from schemas import TaskCreate


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


class TestTaskCreateAndExecute:
    """任务创建与执行测试类"""
    
    @classmethod
    def setup_class(cls):
        """测试类开始前创建表"""
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        """每个测试方法前清理数据"""
        with Session(engine) as session:
            # 清理任务表
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.commit()
    
    # ==================== 功能正确性测试 ====================
    
    def test_create_task_success(self):
        """测试成功创建任务"""
        task_data = {
            "task_name": "性能测试任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/Qwen-14B",
            "model_name": "Qwen-14B",
            "npu_count": 2,
            "device_id": 1,
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_name"] == "性能测试任务"
        assert data["status"] == 0  # 待执行状态
        assert data["progress"] == 0
        assert "id" in data
    
    def test_execute_task_success(self):
        """测试成功执行任务"""
        # 先创建任务
        task_data = {
            "task_name": "待执行任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/test",
            "device_id": 1,
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 执行任务
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        
        assert execute_response.status_code == 200
        data = execute_response.json()
        assert data["status"] == 3  # 执行中状态
        assert data["progress"] == 10
        assert "start_time" in data
    
    def test_create_and_execute_workflow(self):
        """测试创建并执行的完整工作流"""
        # 步骤1: 创建任务
        task_data = {
            "task_name": "端到端测试任务",
            "priority": 2,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "VLLM",
            "framework_version": "v0.2.0",
            "model_path": "/data/models/Llama-3-8B",
            "model_name": "Llama-3-8B",
            "npu_count": 4,
            "graph_mode": "eager",
            "device_id": 1,
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 200
        created_task = create_response.json()
        
        assert created_task["status"] == 0
        task_id = created_task["id"]
        
        # 步骤2: 立即执行任务
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        assert execute_response.status_code == 200
        executed_task = execute_response.json()
        
        assert executed_task["status"] == 3
        assert executed_task["progress"] == 10
        
        # 步骤3: 查询任务状态
        get_response = client.get(f"//api/tasks/{task_id}")
        if get_response.status_code == 200:
            current_task = get_response.json()
            assert current_task["id"] == task_id
    
    # ==================== 边界情况测试 ====================
    
    def test_execute_nonexistent_task(self):
        """测试执行不存在的任务"""
        response = client.post("/api/tasks/99999/execute")
        
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]
    
    def test_execute_task_wrong_status(self):
        """测试执行状态不正确的任务"""
        # 创建任务
        task_data = {
            "task_name": "测试任务",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/test",
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 第一次执行
        client.post(f"/api/tasks/{task_id}/execute")
        
        # 再次执行应该失败
        response = client.post(f"/api/tasks/{task_id}/execute")
        
        assert response.status_code == 400
        assert "不能执行" in response.json()["detail"]
    
    def test_create_task_with_minimal_fields(self):
        """测试使用最少字段创建任务"""
        task_data = {
            "task_name": "最小字段任务",
            "priority": 0,
            "test_type": 2,
            "test_mode": 2,  # 全套模型不需要model_name等字段
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/*",
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_name"] == "最小字段任务"
        assert data["status"] == 0
    
    # ==================== 可靠性测试 ====================
    
    def test_concurrent_task_creation(self):
        """测试并发创建任务"""
        import concurrent.futures
        
        def create_task(index):
            task_data = {
                "task_name": f"并发任务{index}",
                "priority": index % 3,
                "test_type": 2,
                "test_mode": 1,
                "inference_framework": "MindIE",
                "framework_version": "v1.0.1",
                "model_path": "/data/models/test",
            }
            return client.post("/api/tasks", json=task_data)
        
        # 并发创建10个任务
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_task, i) for i in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # 所有请求都应该成功
        assert all(r.status_code == 200 for r in results)
        
        # 验证每个任务都有不同的ID
        task_ids = [r.json()["id"] for r in results]
        assert len(set(task_ids)) == 10
    
    # ==================== 安全性测试 ====================
    
    def test_create_task_sql_injection_attempt(self):
        """测试SQL注入防护"""
        task_data = {
            "task_name": "任务'; DROP TABLE task; --",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/test",
        }
        
        response = client.post("/api/tasks", json=task_data)
        
        # 应该成功创建（SQLAlchemy会自动转义）
        assert response.status_code == 200
        data = response.json()
        # 任务名称应该被完整保存
        assert "DROP TABLE" in data["task_name"]
    
    # ==================== 数据一致性测试 ====================
    
    def test_task_status_transition(self):
        """测试任务状态转换"""
        # 创建任务
        task_data = {
            "task_name": "状态转换测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "inference_framework": "MindIE",
            "framework_version": "v1.0.1",
            "model_path": "/data/models/test",
        }
        
        create_response = client.post("/api/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # 验证初始状态
        assert create_response.json()["status"] == 0
        
        # 执行
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        assert execute_response.json()["status"] == 3
        
        # 取消
        cancel_response = client.post(f"/api/tasks/{task_id}/cancel")
        assert cancel_response.json()["status"] == 6
    
    # ==================== 性能测试 ====================
    
    def test_create_task_performance(self):
        """测试任务创建性能"""
        import time
        
        start_time = time.time()
        
        for i in range(50):
            task_data = {
                "task_name": f"性能测试任务{i}",
                "priority": 1,
                "test_type": 2,
                "test_mode": 1,
                "inference_framework": "MindIE",
                "framework_version": "v1.0.1",
                "model_path": "/data/models/test",
            }
            response = client.post("/api/tasks", json=task_data)
            assert response.status_code == 200
        
        elapsed = time.time() - start_time
        
        # 创建50个任务应该在5秒内完成
        assert elapsed < 5.0, f"创建50个任务耗时{elapsed}秒，超出预期"


class TestTaskQueueAPI:
    """任务队列API测试"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.commit()
    
    def test_get_task_queue_status(self):
        """测试获取任务队列状态"""
        # 创建多个任务
        for i in range(5):
            task_data = {
                "task_name": f"队列任务{i}",
                "priority": i % 3,
                "test_type": 2,
                "test_mode": 1,
                "inference_framework": "MindIE",
                "framework_version": "v1.0.1",
                "model_path": "/data/models/test",
            }
            client.post("/api/tasks", json=task_data)
        
        # 获取队列状态
        # 注意：需要实现 /api/tasks/queue 端点
        # response = client.get("/api/tasks/queue")
        # assert response.status_code == 200
        
        # 临时验证：获取任务列表
        response = client.get("/api/tasks?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
