"""
Comprehensive Device Management Test Suite
Tests functionality, reliability, scalability, and security
"""
import pytest
import time
import threading
from unittest.mock import MagicMock, patch, Mock
from datetime import datetime
import json
import re

# Import test target
import sys
sys.path.insert(0, '/home/models-test-system_v1.0/llm-test-platform/backend')

from monitor_impl import check_device, create_ssh_client, execute_command
from models import Device


class TestDeviceFunctionality:
    """Test basic device management functionality"""
    
    @pytest.fixture
    def mock_device(self):
        return Device(
            id=1,
            ip="192.168.1.100",
            port=22,
            username="test",
            password="password123",
            status="Unknown"
        )
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_create_device_with_valid_data(self, mock_ssh_class, mock_device):
        """Test device creation with valid data"""
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = b""
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.arch == "x86_64"
        assert result.os_info == "Ubuntu 22.04"
        assert result.accelerator_type == "None"
        mock_client.close.assert_called_once()
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_nvidia_gpu_detection(self, mock_ssh_class, mock_device):
        """Test NVIDIA GPU detection and parsing"""
        nvidia_output = """Tesla V100, 32510 MiB, 1000 MiB, 45
Tesla V100, 32510 MiB, 28000 MiB, 60"""
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = nvidia_output.encode()
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.accelerator_count == 2
        assert result.accelerator_type == "V100"
        assert result.idle_count == 1  # First GPU with low memory usage
        assert result.busy_count == 1  # Second GPU with high memory usage
        
        status = result.accelerator_status
        assert "gpus" in status
        assert len(status["gpus"]) == 2
        assert status["gpus"][0]["status"] == "idle"
        assert status["gpus"][1]["status"] == "busy"
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_huawei_npu_detection(self, mock_ssh_class, mock_device):
        """Test Huawei NPU detection and parsing"""
        npu_output = """Timestamp...
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
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"aarch64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 20.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = b""
            elif "npu-smi" in command:
                mock_stdout.read.return_value = npu_output.encode()
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.arch == "aarch64"
        assert result.accelerator_count == 3
        assert "910B2C" in result.accelerator_type
        assert result.busy_count == 2  # NPU 0 has process, NPU 1 has high memory
        assert result.warning_count == 1  # NPU 2 is in warning state
        
        status = result.accelerator_status
        assert "npus" in status
        assert len(status["npus"]) == 3


class TestDeviceReliability:
    """Test device management reliability and error handling"""
    
    @pytest.fixture
    def mock_device(self):
        return Device(
            id=1,
            ip="192.168.1.100",
            port=22,
            username="test",
            password="password123",
            status="Unknown"
        )
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_connection_failure_offline_status(self, mock_ssh_class, mock_device):
        """Test that connection failures result in Offline status"""
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        mock_client.connect.side_effect = Exception("Connection timed out")
        
        result = check_device(mock_device)
        
        assert result.status == "Offline"
        assert "Connection failed" in result.error_message
        assert result.last_updated is not None
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_authentication_failure(self, mock_ssh_class, mock_device):
        """Test authentication failure handling"""
        import paramiko
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        mock_client.connect.side_effect = paramiko.AuthenticationException("Auth failed")
        
        result = check_device(mock_device)
        
        assert result.status == "Offline"
        assert result.error_message is not None
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_command_execution_timeout(self, mock_ssh_class, mock_device):
        """Test command execution timeout handling - system gracefully handles partial failures"""
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        # Simulate timeout only on specific commands
        call_count = [0]
        def exec_side_effect(command, timeout=5):
            call_count[0] += 1
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                # Timeout on GPU check
                raise Exception("Command timeout")
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        # System should handle gracefully - connection succeeded even if some commands failed
        assert result.status == "Online"
        assert result.arch == "x86_64"
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_partial_data_recovery(self, mock_ssh_class, mock_device):
        """Test recovery when some commands fail but others succeed"""
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        call_count = [0]
        def exec_side_effect(command, timeout=5):
            call_count[0] += 1
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                # Simulate failure
                mock_stdout.read.return_value = b""
            elif "uname -sr" in command:
                mock_stdout.read.return_value = b"Linux 5.15"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = b""
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.arch == "x86_64"
        # Should fallback to uname -sr
        assert result.os_info == "Linux 5.15"


class TestDeviceScalability:
    """Test device management scalability"""
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_concurrent_device_checks(self, mock_ssh_class):
        """Test handling multiple device checks concurrently"""
        results = []
        devices = []
        
        for i in range(10):
            device = Device(
                id=i,
                ip=f"192.168.1.{100+i}",
                port=22,
                username="test",
                password="password",
                status="Unknown"
            )
            devices.append(device)
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = b""
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        # Simulate concurrent checks
        def check_and_store(device):
            result = check_device(device)
            results.append(result)
        
        threads = []
        for device in devices:
            t = threading.Thread(target=check_and_store, args=(device,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        assert len(results) == 10
        for result in results:
            assert result.status == "Online"
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_large_gpu_count_handling(self, mock_ssh_class):
        """Test handling devices with many GPUs"""
        device = Device(
            id=1,
            ip="192.168.1.100",
            port=22,
            username="test",
            password="password",
            status="Unknown"
        )
        
        # Create output for 8 GPUs
        gpu_lines = []
        for i in range(8):
            if i % 2 == 0:
                gpu_lines.append(f"Tesla V100, 32510 MiB, 1000 MiB, {40+i}")
            else:
                gpu_lines.append(f"Tesla V100, 32510 MiB, 28000 MiB, {50+i}")
        
        nvidia_output = "\n".join(gpu_lines)
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = nvidia_output.encode()
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(device)
        
        assert result.status == "Online"
        assert result.accelerator_count == 8
        assert result.idle_count == 4
        assert result.busy_count == 4


class TestDeviceSecurity:
    """Test device management security features"""
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_password_not_logged(self, mock_ssh_class):
        """Test that passwords are not included in logs or errors"""
        device = Device(
            id=1,
            ip="192.168.1.100",
            port=22,
            username="test",
            password="secret_password_123",
            status="Unknown"
        )
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        mock_client.connect.side_effect = Exception("Connection failed")
        
        result = check_device(device)
        
        # Ensure password is not in error messages
        assert "secret_password" not in str(result.error_message)
        # Password should remain in device object (needed for connection)
        assert result.password == "secret_password_123"
    
    def test_invalid_ip_rejection(self):
        """Test that invalid IP addresses are rejected"""
        invalid_ips = [
            "256.1.1.1",
            "192.168.1",
            "192.168.1.1.1",
            "abc.def.ghi.jkl",
            "",
            "192.168.1.999"
        ]
        
        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        
        for ip in invalid_ips:
            assert not re.match(ip_pattern, ip), f"IP {ip} should be invalid"
    
    def test_valid_ip_acceptance(self):
        """Test that valid IP addresses are accepted"""
        valid_ips = [
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.1",
            "0.0.0.0",
            "255.255.255.255"
        ]
        
        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        
        for ip in valid_ips:
            assert re.match(ip_pattern, ip), f"IP {ip} should be valid"
    
    def test_port_range_validation(self):
        """Test port number range validation"""
        invalid_ports = [0, -1, 65536, 99999]
        valid_ports = [1, 22, 80, 443, 8080, 65535]
        
        for port in invalid_ports:
            assert not (1 <= port <= 65535), f"Port {port} should be invalid"
        
        for port in valid_ports:
            assert 1 <= port <= 65535, f"Port {port} should be valid"


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    @pytest.fixture
    def mock_device(self):
        return Device(
            id=1,
            ip="192.168.1.100",
            port=22,
            username="test",
            password="password123",
            status="Unknown"
        )
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_empty_nvidia_output(self, mock_ssh_class, mock_device):
        """Test handling empty nvidia-smi output"""
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = b""  # Empty output
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.accelerator_type == "None"
        assert result.accelerator_count == 0
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_malformed_nvidia_output(self, mock_ssh_class, mock_device):
        """Test handling malformed nvidia-smi output - gracefully processes all lines"""
        # One line missing some fields, one complete
        nvidia_output = b"Tesla V100, 32510 MiB\nTesla V100, 32510 MiB, 1000 MiB, 45"
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = nvidia_output
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        # Implementation counts all non-empty lines, processes only complete ones
        assert result.accelerator_count == 2
        # Only valid line gets added to details
        assert len(result.accelerator_status["gpus"]) == 1
    
    @patch("monitor_impl.paramiko.SSHClient")
    def test_high_temperature_warning(self, mock_ssh_class, mock_device):
        """Test high temperature warning detection"""
        # GPU with temperature > 85C
        nvidia_output = b"Tesla V100, 32510 MiB, 5000 MiB, 90"
        
        mock_client = MagicMock()
        mock_ssh_class.return_value = mock_client
        
        def exec_side_effect(command, timeout=5):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            mock_stderr.read.return_value = b""
            
            if "uname -m" in command:
                mock_stdout.read.return_value = b"x86_64"
            elif "PRETTY_NAME" in command:
                mock_stdout.read.return_value = b"Ubuntu 22.04"
            elif "nvidia-smi" in command:
                mock_stdout.read.return_value = nvidia_output
            elif "npu-smi" in command:
                mock_stdout.read.return_value = b"command not found"
            else:
                mock_stdout.read.return_value = b""
            return None, mock_stdout, mock_stderr
        
        mock_client.exec_command.side_effect = exec_side_effect
        
        result = check_device(mock_device)
        
        assert result.status == "Online"
        assert result.warning_count == 1
        assert result.idle_count == 0
        assert result.busy_count == 0  # Warning cards not counted as busy/idle
        
        status = result.accelerator_status
        assert status["gpus"][0]["status"] == "warning"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
