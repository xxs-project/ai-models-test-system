
import pytest
from unittest.mock import MagicMock, patch
from monitor_impl import check_device
from models import Device
import datetime

# --- Mock Data ---

NVIDIA_OUTPUT = """
Tesla V100, 32510 MiB, 1000 MiB, 45
Tesla V100, 32510 MiB, 28000 MiB, 60
"""
# 1st GPU: ~3% used (Idle)
# 2nd GPU: ~86% used (Busy)

# Huawei NPU Output
# Mimicking the structure expected by the regexes in monitor_impl.py
# Line 1 match: | 0     910B2C              | OK            | 89.5        44                0    / 0             |
# HBM lines: 3632 / 65536
# Process table: | 0       0                 | 1840146       | python                   | 255                     |

HUAWEI_OUTPUT = """
Timestamp...
| 0       910B2C      | OK      | 89.5    44      0    / 0      |
|                     |         |                 3632 / 65536  |
| 1       910B2C      | OK      | 90.0    45      0    / 0      |
|                     |         |                 50000 / 65536 |
| 2       910B2C      | Warning | 90.0    45      0    / 0      |
|                     |         |                 0 / 65536     |
+---------------------+---------------------------------------+
Processes:
| NPU     Chip        | Process id    | Process name             | Process memory          |
| 0       0           | 12345         | python                   | 1000                    |
"""
# NPU 0: OK, 3632/65536 (~5%) used. Has Process 12345. -> BUSY (because has process)
# NPU 1: OK, 50000/65536 (~76%) used. No process. -> BUSY (because memory > 10%)
# NPU 2: Warning. -> WARNING (should not count as idle or busy)

# --- Tests ---

@pytest.fixture
def mock_device():
    return Device(
        ip="192.168.1.100",
        username="test",
        password="password",
        port=22
    )

@patch("monitor_impl.paramiko.SSHClient")
def test_connection_failure(mock_ssh_class, mock_device):
    # Setup mock to raise exception on connect
    mock_client = MagicMock()
    mock_ssh_class.return_value = mock_client
    mock_client.connect.side_effect = Exception("Connection timed out")

    # Run
    updated_device = check_device(mock_device)

    # Verify
    assert updated_device.status == "Offline"
    assert "Connection failed" in updated_device.error_message

@patch("monitor_impl.paramiko.SSHClient")
def test_nvidia_check_success(mock_ssh_class, mock_device):
    # Setup mock
    mock_client = MagicMock()
    mock_ssh_class.return_value = mock_client
    
    # Mock exec_command responses
    def exec_command_side_effect(command, timeout=5):
        mock_stdout = MagicMock()
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b""
        
        if "uname -m" in command:
            mock_stdout.read.return_value = b"x86_64"
        elif "PRETTY_NAME" in command:
            mock_stdout.read.return_value = b"Ubuntu 22.04"
        elif "nvidia-smi" in command:
            # Return our Nvidia mock data
            mock_stdout.read.return_value = NVIDIA_OUTPUT.encode("utf-8")
        elif "npu-smi" in command:
            mock_stdout.read.return_value = b"command not found"
        else:
            mock_stdout.read.return_value = b""
            
        return None, mock_stdout, mock_stderr

    mock_client.exec_command.side_effect = exec_command_side_effect

    # Run
    updated_device = check_device(mock_device)

    # Verify basic info
    assert updated_device.status == "Online"
    assert updated_device.arch == "x86_64"
    assert updated_device.os_info == "Ubuntu 22.04"
    
    # Verify Accelerator info
    # We provided 2 lines in NVIDIA_OUTPUT
    assert updated_device.accelerator_count == 2
    assert updated_device.warning_count == 0
    
    # GPU 1: 1000/32510 = ~3% -> Idle
    # GPU 2: 28000/32510 = ~86% -> Busy
    assert updated_device.idle_count == 1
    assert updated_device.busy_count == 1
    
    # Verify detailed status structure
    details = updated_device.accelerator_status.get("gpus")
    assert len(details) == 2
    assert details[0]["name"] == "Tesla V100"
    assert details[0]["status"] == "idle"
    assert details[1]["status"] == "busy"

@patch("monitor_impl.paramiko.SSHClient")
def test_huawei_npu_check_success(mock_ssh_class, mock_device):
    # Setup mock
    mock_client = MagicMock()
    mock_ssh_class.return_value = mock_client
    
    # Mock exec_command responses
    def exec_command_side_effect(command, timeout=5):
        mock_stdout = MagicMock()
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b""
        
        if "uname -m" in command:
            mock_stdout.read.return_value = b"aarch64"
        elif "PRETTY_NAME" in command:
            mock_stdout.read.return_value = b"Ubuntu 20.04"
        elif "nvidia-smi" in command:
            # Nvidia fail
            mock_stdout.read.return_value = b"" 
        elif "npu-smi" in command:
            # Huawei success
            mock_stdout.read.return_value = HUAWEI_OUTPUT.encode("utf-8")
        else:
            mock_stdout.read.return_value = b""
            
        return None, mock_stdout, mock_stderr

    mock_client.exec_command.side_effect = exec_command_side_effect

    # Run
    updated_device = check_device(mock_device)

    # Verify basic info
    assert updated_device.status == "Online"
    assert updated_device.arch == "aarch64"
    
    # Verify NPU logic
    # We have 3 NPUs in input
    assert updated_device.accelerator_count == 3
    
    # NPU 0: Has process -> Busy
    # NPU 1: High memory -> Busy
    # NPU 2: Warning -> Warning (not idle/busy)
    assert updated_device.busy_count == 2
    assert updated_device.idle_count == 0
    assert updated_device.warning_count == 1
    
    assert "Ascend 910B2C" in updated_device.accelerator_type
    
    details = updated_device.accelerator_status.get("npus")
    assert len(details) == 3
    assert details[0]["id"] == 0
    assert details[0]["status"] == "busy"
    assert details[1]["id"] == 1
    assert details[1]["status"] == "busy"
    assert details[2]["id"] == 2
    assert details[2]["status"] == "warning"
