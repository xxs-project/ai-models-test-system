import pytest
import os
import tempfile
import csv
from unittest.mock import MagicMock, patch
from datetime import datetime
from sqlmodel import Session, create_engine, SQLModel
from backend.models import Task, Device, Benchmark
from backend.services.auto_import_service import auto_import_single_model_result, download_remote_results_with_sftp
from backend.schemas import BenchmarkConfig

# Mock data
MOCK_TASK_ID = 4
MOCK_DEVICE_ID = 1
MOCK_FRAMEWORK_VERSION = "v0.12.0rc1"
MOCK_FRAMEWORK_VERSION_SPACED = " v0.12.0rc1"

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture
def mock_task():
    return Task(
        id=MOCK_TASK_ID,
        task_name="Qwen3-0.6B Performance Test",
        test_type=1,
        test_mode=1,
        inference_framework=1, # vLLM
        model_name="Qwen3-0.6B",
        framework_version=MOCK_FRAMEWORK_VERSION,
        npu_count=1,
        script_path="/data/models-test/scripts/vllm_benchmark_auto",
        device_id=MOCK_DEVICE_ID,
        status=4, # COMPLETED
        created_at=datetime.now(),
        end_time=datetime.now()
    )

@pytest.fixture
def mock_device():
    return Device(
        id=MOCK_DEVICE_ID,
        ip="192.168.1.100",
        port=22,
        username="root",
        password="password",
        arch="x86_64",
        accelerator_type="Ascend910B",
        status="Online"
    )

@pytest.fixture
def mock_ssh_client():
    with patch("paramiko.SSHClient") as mock_ssh:
        mock_client = MagicMock()
        mock_ssh.return_value = mock_client
        mock_sftp = MagicMock()
        mock_client.open_sftp.return_value = mock_sftp
        yield mock_client, mock_sftp

def test_download_remote_results_normal(mock_task, mock_device, mock_ssh_client):
    """Test normal download scenario"""
    mock_client, mock_sftp = mock_ssh_client
    
    # Mock remote directory structure
    mock_entry = MagicMock()
    mock_entry.filename = "vllm_v0.12.0rc1"
    mock_entry.st_mode = 0o40755 # Directory
    
    # listdir_attr for results_vllm_single
    mock_sftp.listdir_attr.side_effect = [
        [mock_entry], # First call: list results dir
        [MagicMock(filename="x86_64_vllm_results_Qwen3-0.6B_1_npu_eager.csv")], # Second call: list version dir
        [MagicMock(filename="test.log")] # Third call: list log dir
    ]
    
    with tempfile.TemporaryDirectory() as temp_dir:
        local_path = download_remote_results_with_sftp(mock_task, mock_device, temp_dir)
        
        assert "vllm_v0.12.0rc1" in local_path
        # Verify SFTP calls
        mock_sftp.get.assert_called()

def test_download_remote_results_with_space(mock_task, mock_device, mock_ssh_client):
    """Test download when remote directory has a space (simulation of the bug)"""
    mock_client, mock_sftp = mock_ssh_client
    
    # Set task framework version to have a space
    mock_task.framework_version = MOCK_FRAMEWORK_VERSION_SPACED
    
    # Mock remote directory structure with SPACED directory
    mock_entry = MagicMock()
    mock_entry.filename = "vllm_ v0.12.0rc1" # Directory with space
    mock_entry.st_mode = 0o40755
    
    mock_sftp.listdir_attr.side_effect = [
        [mock_entry],
        [MagicMock(filename="x86_64_vllm_results_Qwen3-0.6B_1_npu_eager.csv")],
        []
    ]
    
    with tempfile.TemporaryDirectory() as temp_dir:
        local_path = download_remote_results_with_sftp(mock_task, mock_device, temp_dir)
        
        assert "vllm_ v0.12.0rc1" in local_path
        mock_sftp.get.assert_called()

def test_auto_import_integration(session, mock_task, mock_device, mock_ssh_client):
    """Test the full auto import flow with mocked SSH"""
    mock_client, mock_sftp = mock_ssh_client
    
    # Mock remote files
    mock_entry_dir = MagicMock()
    mock_entry_dir.filename = "vllm_v0.12.0rc1"
    mock_entry_dir.st_mode = 0o40755
    
    mock_csv = MagicMock()
    mock_csv.filename = "x86_64_vllm_results_Qwen3-0.6B_1_npu_eager.csv"
    
    mock_sftp.listdir_attr.side_effect = [
        [mock_entry_dir],
        [mock_csv],
        [] # No logs
    ]
    
    # Determine the CSV content to write locally
    csv_content = [
        ['concurrency', 'inputLength', 'outputLength', 'ttft', 'tpot', 'tokensPerSecond', 'totalTimeMs'],
        ['1', '1024', '128', '10.5', '12.3', '85.4', '1500.0']
    ]
    
    # We need to hook into the sftp.get to actually create a local file
    def side_effect_get(remote_path, local_path):
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(csv_content)
    
    mock_sftp.get.side_effect = side_effect_get
    
    # Run import
    result = None
    import asyncio
    
    # Since auto_import_single_model_result is async, we need to run it
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(auto_import_single_model_result(session, mock_task, mock_device))
    loop.close()
    
    assert result['success'] is True
    assert result['count'] == 1
    
    # Verify DB
    benchmark = session.query(Benchmark).first()
    assert benchmark is not None
    assert benchmark.config['modelName'] == "Qwen3-0.6B"
    assert benchmark.config['framework'] == "vLLM"
    assert benchmark.metrics[0]['concurrency'] == 1.0
    assert benchmark.metrics[0]['tokensPerSecond'] == 85.4

def test_auto_import_invalid_filename(session, mock_task, mock_device, mock_ssh_client):
    """Test import with invalid filename format"""
    mock_client, mock_sftp = mock_ssh_client
    
    mock_entry_dir = MagicMock()
    mock_entry_dir.filename = "vllm_v0.12.0rc1"
    mock_entry_dir.st_mode = 0o40755
    
    # Invalid filename (matches glob but fails parsing)
    mock_csv = MagicMock()
    mock_csv.filename = "x86_64_vllm_results_badname.csv"
    
    mock_sftp.listdir_attr.side_effect = [
        [mock_entry_dir],
        [mock_csv],
        []
    ]
    
    # sftp.get creates empty file
    def side_effect_get(remote, local):
        os.makedirs(os.path.dirname(local), exist_ok=True)
        with open(local, 'w') as f:
            f.write("header\nvalue")

    mock_sftp.get.side_effect = side_effect_get
    
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Should raise ValueError because filename parsing fails
    with pytest.raises(ValueError) as exc:
         loop.run_until_complete(auto_import_single_model_result(session, mock_task, mock_device))
    
    assert "无法从文件名解析元数据" in str(exc.value)
    loop.close()

