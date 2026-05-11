import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, get_session
from models import Benchmark

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

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_get_all_benchmarks_large_list(client: TestClient):
    """Test retrieving a large list of benchmarks (e.g. > 100) to ensure pagination defaults or limits don't hide data."""
    # Create 150 benchmarks
    for i in range(150):
        benchmark_data = {
            "config": {
                "submitter": "admin",
                "modelName": f"Model-{i}",
                "serverName": "server-01",
                "framework": "MindIE",
                "chipName": "GPU-A100",
                "testDate": "2024-01-01", 
                "frameworkVersion": "1.0",
                "shardingConfig": "tp=1"
            },
            "metrics": [{"concurrency": 1, "inputLength": 1024, "outputLength": 128, "ttft": 45.2, "tpot": 12.5, "tokensPerSecond": 156.3}]
        }
        client.post("/api/benchmarks", json=benchmark_data)

    # Request with a large size explicitly (simulating what the frontend *should* do or what we fixed defaults to if we changed default)
    # We changed default to 1000, so even without params it should return all.
    response = client.get("/api/benchmarks")
    assert response.status_code == 200
    data = response.json()
    
    # We expect all 150 items because we changed default size to 1000
    assert data["total"] == 150
    assert len(data["items"]) == 150

def test_get_benchmarks_filtered_large_list(client: TestClient):
    """Test retrieving a filtered large list (e.g. for Trend Graph version selection)."""
    # Create 120 benchmarks for "Model-A"
    for i in range(120):
        benchmark_data = {
            "config": {
                "submitter": "admin",
                "modelName": "Model-A",
                "serverName": "server-01",
                "framework": "MindIE",
                "chipName": "GPU-A100",
                "testDate": f"2024-01-{i%30+1:02d}", 
                "frameworkVersion": f"1.0.{i}",
                "shardingConfig": "tp=1"
            },
            "metrics": []
        }
        client.post("/api/benchmarks", json=benchmark_data)
        
    # Create 10 benchmarks for "Model-B" (noise)
    for i in range(10):
        benchmark_data = {
            "config": {
                "submitter": "admin",
                "modelName": "Model-B",
                "serverName": "server-01",
                "framework": "MindIE",
                "chipName": "GPU-A100",
                "testDate": "2024-01-01", 
                "frameworkVersion": "1.0",
                "shardingConfig": "tp=1"
            },
            "metrics": []
        }
        client.post("/api/benchmarks", json=benchmark_data)

    # Request filtered by Model-A
    response = client.get("/api/benchmarks?model_name=Model-A")
    assert response.status_code == 200
    data = response.json()
    
    # Should return all 120 versions of Model-A
    assert data["total"] == 120
    assert len(data["items"]) == 120
    # Verify we didn't get Model-B
    for item in data["items"]:
        assert item["config"]["modelName"] == "Model-A"

def test_pagination_explicit_size(client: TestClient):
    """Test that explicit size parameter is respected and works correctly."""
    # Create 60 benchmarks
    for i in range(60):
        benchmark_data = {
            "config": {
                "submitter": "admin",
                "modelName": f"Model-{i}",
                "serverName": "server-01",
                "framework": "MindIE",
                "chipName": "GPU-A100",
                "testDate": "2024-01-01", 
                "frameworkVersion": "1.0",
                "shardingConfig": "tp=1"
            },
            "metrics": []
        }
        client.post("/api/benchmarks", json=benchmark_data)

    # Request size=25
    response = client.get("/api/benchmarks?size=25")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 25
    assert data["total"] == 60
    assert data["size"] == 25

def test_pagination_page_traversal(client: TestClient):
    """Test traversing pages to ensure data continuity."""
    # Create 30 benchmarks with predictable names
    for i in range(30):
        benchmark_data = {
            "config": {
                "submitter": "admin",
                "modelName": f"Sequential-{i:02d}", # 00, 01, ... 29
                "serverName": "server-01",
                "framework": "MindIE",
                "chipName": "GPU-A100",
                "testDate": "2024-01-01", 
                "frameworkVersion": "1.0",
                "shardingConfig": "tp=1"
            },
            "metrics": []
        }
        client.post("/api/benchmarks", json=benchmark_data)

    # Page 1, size 10
    resp1 = client.get("/api/benchmarks?page=1&size=10")
    items1 = resp1.json()["items"]
    assert len(items1) == 10
    
    # Page 2, size 10
    resp2 = client.get("/api/benchmarks?page=2&size=10")
    items2 = resp2.json()["items"]
    assert len(items2) == 10
    
    # Ensure items are different (checking IDs)
    ids1 = {item["id"] for item in items1}
    ids2 = {item["id"] for item in items2}
    assert ids1.isdisjoint(ids2)

def test_pagination_limits(client: TestClient):
    """Test boundary conditions for pagination."""
    # Test size < 1 (should be rejected by FastAPI validation)
    response = client.get("/api/benchmarks?size=0")
    assert response.status_code == 422 # Unprocessable Entity

    # Test page < 1
    response = client.get("/api/benchmarks?page=0")
    assert response.status_code == 422

