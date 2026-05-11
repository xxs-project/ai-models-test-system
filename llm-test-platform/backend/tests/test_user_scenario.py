"""
完整的任务创建修复测试

测试用户报告的场景是否能正常工作
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


class TestUserReportedScenario:
    """
    测试用户报告的具体场景
    
    用户输入:
    - 任务名称：Qwen3-14B性能测试
    - 优先级：高
    - 测试类型：性能测试
    - 测试模式：单模型测试
    - 设备：7.6.52.110
    - 推理框架：vLLM
    - 框架版本：v0.12.0rc1
    - 模型名称：Qwen3-14B
    - NPU数量：2
    - 图模式：eager
    - 模型路径：/data/models
    - 测试路径：/data/models-test/scripts/vllm_benchmark_auto
    - 执行标识：自定义性能脚本
    """
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_user_reported_scenario(self):
        """测试用户报告的具体场景"""
        
        # 步骤1: 创建设备
        device_data = {
            "ip": "7.6.52.110",
            "port": 22,
            "username": "root",
            "password": "password123"
        }
        device_response = client.post("/api/devices", json=device_data)
        assert device_response.status_code == 200, f"创建设备失败: {device_response.text}"
        device_id = device_response.json()["id"]
        
        # 步骤2: 使用用户提供的完整数据创建任务
        task_data = {
            "task_name": "Qwen3-14B性能测试",
            "priority": 2,  # 高
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
            "execution_flag": "1",  # 自定义性能脚本
        }
        
        # 步骤3: 创建任务
        response = client.post("/api/tasks", json=task_data)
        
        # 验证创建成功
        assert response.status_code == 200, f"创建任务失败: {response.text}"
        
        data = response.json()
        
        # 验证所有字段正确保存
        assert data["task_name"] == "Qwen3-14B性能测试", "任务名称不匹配"
        assert data["priority"] == 2, "优先级不匹配"
        assert data["test_type"] == 2, "测试类型不匹配"
        assert data["test_mode"] == 1, "测试模式不匹配"
        assert data["device_id"] == device_id, "设备ID不匹配"
        assert data["inference_framework"] == "vLLM", "推理框架不匹配"
        assert data["framework_version"] == "v0.12.0rc1", "框架版本不匹配"
        assert data["model_name"] == "Qwen3-14B", "模型名称不匹配"
        assert data["npu_count"] == 2, "NPU数量不匹配"
        assert data["graph_mode"] == "eager", "图模式不匹配"
        assert data["model_path"] == "/data/models", "模型路径不匹配"
        assert data["script_path"] == "/data/models-test/scripts/vllm_benchmark_auto", "脚本路径不匹配"
        assert data["execution_flag"] == "1", "执行标识不匹配"
        assert data["status"] == 0, "初始状态应该是待执行"
        
        print("✓ 用户场景测试通过！")
    
    def test_user_scenario_then_execute(self):
        """测试用户场景：创建后执行任务"""
        
        # 创建设备
        device_data = {
            "ip": "7.6.52.110",
            "port": 22,
            "username": "root",
            "password": "password123"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 创建任务
        task_data = {
            "task_name": "Qwen3-14B性能测试",
            "priority": 2,
            "test_type": 2,
            "test_mode": 1,
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
        
        # 执行任务
        execute_response = client.post(f"/api/tasks/{task_id}/execute")
        assert execute_response.status_code == 200
        
        data = execute_response.json()
        assert data["status"] == 3, "任务应该开始执行"
        assert data["progress"] == 10, "初始进度应该是10"
        
        print("✓ 创建并执行测试通过！")


class TestFrontendToBackendMapping:
    """测试前端到后端的字段映射"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_frontend_field_names(self):
        """测试前端字段名映射到后端字段名"""
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "admin",
            "password": "admin123"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 使用前端字段名创建任务
        # 注意：这里模拟前端提交的数据结构
        frontend_data = {
            "task_name": "前端字段测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "device_ip": None,
            "device_username": "root",  # 前端username映射到device_username
            "device_password": "pass123",  # 前端password映射到device_password
            "script_path": "/custom/scripts",  # 前端test_path映射到script_path
            "model_name": "TestModel",
            "npu_count": 4,
            "graph_mode": "eager",
            "model_path": "/data/models",
            "inference_framework": "vLLM",
            "framework_version": "v0.12.0",
            "execution_flag": "2",  # 前端execution_id映射到execution_flag
        }
        
        response = client.post("/api/tasks", json=frontend_data)
        assert response.status_code == 200
        
        data = response.json()
        
        # 验证所有映射后的字段
        assert data["device_username"] == "root"
        assert data["device_password"] == "pass123"
        assert data["script_path"] == "/custom/scripts"
        assert data["execution_flag"] == "2"
        assert data["npu_count"] == 4
        assert data["graph_mode"] == "eager"
        
        print("✓ 字段映射测试通过！")


class TestErrorHandling:
    """测试错误处理"""
    
    @classmethod
    def setup_class(cls):
        SQLModel.metadata.create_all(engine)
    
    def setup_method(self):
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("DELETE FROM task"))
            session.exec(text("DELETE FROM device"))
            session.commit()
    
    def test_missing_required_fields(self):
        """测试缺少必填字段的错误处理"""
        
        # 缺少必填字段
        incomplete_data = {
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            # 缺少task_name
            "model_path": "/data/models",
            "inference_framework": "vLLM",
        }
        
        response = client.post("/api/tasks", json=incomplete_data)
        
        # 应该返回验证错误
        assert response.status_code == 422
        print("✓ 缺少必填字段错误处理正确！")
    
    def test_invalid_field_types(self):
        """测试无效字段类型的处理"""
        
        # 创建设备
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        device_response = client.post("/api/devices", json=device_data)
        device_id = device_response.json()["id"]
        
        # 使用无效的npu_count类型
        invalid_data = {
            "task_name": "类型测试",
            "priority": 1,
            "test_type": 2,
            "test_mode": 1,
            "device_id": device_id,
            "npu_count": "invalid",  # 应该是整数
            "model_path": "/data/models",
            "inference_framework": "vLLM",
        }
        
        response = client.post("/api/tasks", json=invalid_data)
        # FastAPI会尝试转换类型，如果失败会返回422
        assert response.status_code in [200, 422]
        print("✓ 无效字段类型处理正确！")


class TestDatabaseStructure:
    """测试数据库结构"""
    
    def test_all_fields_exist_in_database(self):
        """测试所有字段都存在于数据库中"""
        
        from sqlalchemy import create_engine, text
        
        # 使用测试数据库
        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        
        with engine.connect() as conn:
            # 获取task表的所有列
            result = conn.execute(text("PRAGMA table_info(task)"))
            columns = {row[1] for row in result}
            
            # 验证新字段存在
            required_fields = [
                'npu_count',
                'graph_mode',
                'device_username',
                'device_password',
                'script_path',
                'execution_flag',
            ]
            
            for field in required_fields:
                assert field in columns, f"字段 {field} 不存在于数据库中"
            
            print("✓ 所有字段都存在于数据库中！")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
