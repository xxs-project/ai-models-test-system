"""
搜索功能增强测试用例
测试范围：搜索功能的正确性，包括多字段搜索和特殊字符处理
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
import sys
import os

# Ensure backend directory is in path
# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, get_session

# 创建测试数据库
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

# 创建测试客户端
@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


class TestSearchFeatures:
    """搜索功能增强测试"""

    @pytest.fixture(autouse=True)
    def setup_data(self, client: TestClient):
        """准备测试数据"""
        # 数据1：MindIE, A100
        resp1 = client.post("/api/benchmarks", json={
            "config": {
                "submitter": "user1",
                "modelName": "Llama2-7B",
                "serverName": "server-A",
                "framework": "MindIE",
                "frameworkVersion": "1.0.0",
                "chipName": "Ascend910B",
                "shardingConfig": "tp=1",
                "testDate": "2024-01-01",
                "operatorAcceleration": "FlashAttention"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 100, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })
        assert resp1.status_code == 200, f"Setup data 1 failed: {resp1.text}"

        # 数据2：VLLM, GPU
        resp2 = client.post("/api/benchmarks", json={
            "config": {
                "submitter": "user2",
                "modelName": "Qwen-14B",
                "serverName": "server-B",
                "framework": "VLLM",
                "frameworkVersion": "0.2.7",
                "chipName": "NVIDIA A100",
                "shardingConfig": "tp=4",
                "testDate": "2024-01-02",
                "operatorAcceleration": "None"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 200, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })
        assert resp2.status_code == 200, f"Setup data 2 failed: {resp2.text}"
        
        # 数据3: DeepSpeed, tp=8
        resp3 = client.post("/api/benchmarks", json={
            "config": {
                "submitter": "admin",
                "modelName": "Llama3-70B",
                "serverName": "server-C",
                "framework": "DeepSpeed",
                "frameworkVersion": "0.1.0",
                "chipName": "NVIDIA H800",
                "shardingConfig": "tp=8",
                "testDate": "2024-01-03",
                "operatorAcceleration": "Triton"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 50, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })
        assert resp3.status_code == 200, f"Setup data 3 failed: {resp3.text}"

    def test_search_by_framework(self, client: TestClient):
        """测试按框架搜索"""
        # Debug: list all
        all_resp = client.get("/api/benchmarks")
        print(f"Total benchmarks: {len(all_resp.json()['items'])}")
        print(f"Items: {all_resp.json()['items']}")

        response = client.get("/api/benchmarks?search=MindIE")
        assert response.status_code == 200
        data = response.json()
        print(f"Search result for MindIE: {data}")
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["framework"] == "MindIE"

        response = client.get("/api/benchmarks?search=VLLM")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["framework"] == "VLLM"

    def test_search_by_submitter(self, client: TestClient):
        """测试按提交人搜索"""
        response = client.get("/api/benchmarks?search=user1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["submitter"] == "user1"

    def test_search_by_chip(self, client: TestClient):
        """测试按芯片搜索"""
        response = client.get("/api/benchmarks?search=Ascend")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["chipName"] == "Ascend910B"
        
        response = client.get("/api/benchmarks?search=A100")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["chipName"] == "NVIDIA A100"

    def test_search_by_sharding(self, client: TestClient):
        """测试按切分配置搜索"""
        response = client.get("/api/benchmarks?search=tp=8")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["shardingConfig"] == "tp=8"

    def test_search_by_operator_acceleration(self, client: TestClient):
        """测试按算子加速搜索"""
        response = client.get("/api/benchmarks?search=FlashAttention")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["operatorAcceleration"] == "FlashAttention"

    def test_search_case_insensitive(self, client: TestClient):
        """测试大小写不敏感搜索"""
        response = client.get("/api/benchmarks?search=mindie")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["framework"] == "MindIE"

    def test_search_partial_match(self, client: TestClient):
        """测试部分匹配"""
        response = client.get("/api/benchmarks?search=Llama")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2  # Llama2-7B and Llama3-70B

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
