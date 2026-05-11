
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.abspath("backend"))

from main import app, get_session

# Create test database
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

# Create test client
@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

class TestAdvancedSearchComplete:
    """Comprehensive tests for Advanced Search functionality"""

    @pytest.fixture(autouse=True)
    def setup_data(self, client: TestClient):
        """Prepare test data"""
        print("Setting up data...")
        # Data 1
        resp = client.post("/api/benchmarks", json={
            "config": {
                "submitter": "Alice",
                "modelName": "Llama2-7B",
                "serverName": "Server-Alpha",
                "framework": "MindIE",
                "frameworkVersion": "1.0.0",
                "chipName": "Ascend910B",
                "shardingConfig": "tp=1",
                "testDate": "2024-01-01",
                "graphMode": "static",
                "operatorAcceleration": "FlashAttention",
                "notes": "Base baseline"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 100, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })
        print(f"Data 1 resp: {resp.status_code}, {resp.text}")

        # Data 2
        client.post("/api/benchmarks", json={
            "config": {
                "submitter": "Bob",
                "modelName": "Qwen-14B",
                "serverName": "Server-Beta",
                "framework": "VLLM",
                "frameworkVersion": "0.2.7",
                "chipName": "NVIDIA A100",
                "shardingConfig": "tp=4",
                "testDate": "2024-01-02",
                "graphMode": "dynamic",
                "operatorAcceleration": "None",
                "notes": "Performance test"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 200, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })
        
        # Data 3
        client.post("/api/benchmarks", json={
            "config": {
                "submitter": "Charlie",
                "modelName": "Llama3-70B",
                "serverName": "Server-Gamma",
                "framework": "DeepSpeed",
                "frameworkVersion": "0.1.0",
                "chipName": "NVIDIA H800",
                "shardingConfig": "tp=8",
                "testDate": "2024-01-03",
                "graphMode": "static",
                "operatorAcceleration": "Triton",
                "notes": "Large model"
            },
            "metrics": [{"concurrency": 1, "tokensPerSecond": 50, "inputLength": 1024, "outputLength": 128, "ttft": 0.1, "tpot": 0.05}]
        })

    def test_individual_field_search(self, client: TestClient):
        """Test searching by individual fields"""
        # Submitter
        resp = client.get("/api/benchmarks?submitter=Alice")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["submitter"] == "Alice"

        # Model Name
        resp = client.get("/api/benchmarks?model_name=Qwen-14B")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["modelName"] == "Qwen-14B"

        # Server Name
        resp = client.get("/api/benchmarks?serverName=Server-Gamma")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["serverName"] == "Server-Gamma"

        # Chip Name
        resp = client.get("/api/benchmarks?chipName=Ascend910B")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["chipName"] == "Ascend910B"

        # Framework
        resp = client.get("/api/benchmarks?framework=VLLM")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["framework"] == "VLLM"
        
        # Framework Version
        resp = client.get("/api/benchmarks?frameworkVersion=0.1.0")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["frameworkVersion"] == "0.1.0"

    def test_graph_mode_search(self, client: TestClient):
        """Test searching by Graph Mode"""
        resp = client.get("/api/benchmarks?graphMode=static")
        data = resp.json()
        assert len(data["items"]) == 2  # Alice and Charlie
        for item in data["items"]:
            assert item["config"]["graphMode"] == "static"

        resp = client.get("/api/benchmarks?graphMode=dynamic")
        data = resp.json()
        assert len(data["items"]) == 1  # Bob
        assert data["items"][0]["config"]["graphMode"] == "dynamic"

    def test_combined_search(self, client: TestClient):
        """Test arbitrary combination of search filters"""
        # Graph Mode + Framework
        resp = client.get("/api/benchmarks?graphMode=static&framework=MindIE")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["submitter"] == "Alice"

        # Chip Name + Sharding Config
        resp = client.get("/api/benchmarks?chipName=NVIDIA A100&shardingConfig=tp=4")
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["config"]["submitter"] == "Bob"

        # Partial Model Name + Graph Mode
        resp = client.get("/api/benchmarks?model_name=Llama&graphMode=static")
        data = resp.json()
        assert len(data["items"]) == 2  # Llama2-7B and Llama3-70B

    def test_case_insensitivity(self, client: TestClient):
        """Test case insensitivity for search"""
        resp = client.get("/api/benchmarks?submitter=alice")
        data = resp.json()
        assert len(data["items"]) == 1
        
        resp = client.get("/api/benchmarks?framework=mindie")
        data = resp.json()
        assert len(data["items"]) == 1

        resp = client.get("/api/benchmarks?graphMode=STATIC")
        data = resp.json()
        assert len(data["items"]) == 2

    def test_partial_matches(self, client: TestClient):
        """Test partial matches for relevant fields"""
        # Notes
        resp = client.get("/api/benchmarks?notes=baseline")
        data = resp.json()
        assert len(data["items"]) == 1
        
        # Model Name
        resp = client.get("/api/benchmarks?model_name=Llama")
        data = resp.json()
        assert len(data["items"]) == 2

    def test_reliability_empty_results(self, client: TestClient):
        """Test queries that should return no results"""
        resp = client.get("/api/benchmarks?submitter=NonExistent")
        data = resp.json()
        assert len(data["items"]) == 0
        
        resp = client.get("/api/benchmarks?graphMode=InvalidMode")
        data = resp.json()
        assert len(data["items"]) == 0

    def test_security_injection(self, client: TestClient):
        """Test basic safety against injection attempts"""
        # Try a basic SQL injection pattern in a string field
        resp = client.get("/api/benchmarks?submitter=' OR '1'='1")
        # Should return 0 because it searches for literally "' OR '1'='1" or fails safely
        # It shouldn't return all records
        data = resp.json()
        assert len(data["items"]) == 0 

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
