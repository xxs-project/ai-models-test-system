import unittest
from unittest.mock import MagicMock, patch
from models import Device
from main import check_device_status_detailed

class TestDeviceMonitorAlignment(unittest.TestCase):
    def setUp(self):
        self.device = Device(
            ip="192.168.1.100",
            port=22,
            username="root",
            password="password",
            id=1
        )

    @patch('main.execute_command')
    @patch('paramiko.SSHClient')
    def test_nvidia_parsing(self, mock_ssh_cls, mock_execute):
        # Setup mocks
        mock_ssh = MagicMock()
        mock_ssh_cls.return_value = mock_ssh
        
        # Mock responses
        # 1. uname -m
        # 2. os-release (simulating the output of the pipe chain: grep | cut | tr)
        mock_ssh.exec_command.side_effect = [
            (None, MagicMock(read=lambda: b"x86_64\n"), None), # uname -m
            (None, MagicMock(read=lambda: b"Ubuntu 22.04\n"), None), # os-release processed
        ]
        
        # Mock execute_command responses for nvidia-smi
        # Format: name, memory.total, memory.used, temperature.gpu
        nvidia_output = """
NVIDIA A100-SXM4-40GB, 40536 MiB, 100 MiB, 30
NVIDIA A100-SXM4-40GB, 40536 MiB, 25000 MiB, 88
"""
        mock_execute.side_effect = [
            (nvidia_output, ""), # nvidia-smi
        ]

        updated_device = check_device_status_detailed(self.device)

        self.assertEqual(updated_device.status, "Online")
        self.assertEqual(updated_device.arch, "x86_64")
        self.assertEqual(updated_device.os_info, "Ubuntu 22.04")
        self.assertEqual(updated_device.accelerator_count, 2)
        
        # Check details
        status = updated_device.accelerator_status
        self.assertEqual(status['count'], 2)
        gpus = status['gpus']
        
        # GPU 0: Low mem (100/40536 < 1%), Low temp -> Idle
        self.assertEqual(gpus[0]['status'], "idle")
        
        # GPU 1: High temp (88 > 85) -> Warning (even if mem is high)
        self.assertEqual(gpus[1]['status'], "warning")
        
        self.assertEqual(updated_device.idle_count, 1)
        self.assertEqual(updated_device.warning_count, 1)
        # Busy count should be 0 because the second card is warning, not busy
        self.assertEqual(updated_device.busy_count, 0)

    @patch('main.execute_command')
    @patch('paramiko.SSHClient')
    def test_huawei_npu_parsing(self, mock_ssh_cls, mock_execute):
         # Setup mocks
        mock_ssh = MagicMock()
        mock_ssh_cls.return_value = mock_ssh
        
        mock_ssh.exec_command.side_effect = [
            (None, MagicMock(read=lambda: b"aarch64\n"), None),
            (None, MagicMock(read=lambda: b"EulerOS\n"), None),
        ]
        
        # Mock execute_command for NVIDIA (fail) then NPU (success)
        # Use dedent or strip to ensure no leading spaces invalidates the regex
        from textwrap import dedent
        npu_output = dedent("""
        +------------------------------------------------------------------------------------------------+
        | npu-smi 23.0.rc1                       Version: 23.0.rc1                                       |
        +-------------------+-----------------+----------------------------------------------------------+
        | NPU     Name      | Health          | Power(W)    Temp(C)           Hugepages-Usage(page)      |
        | Chip    Device    | Bus-Id          | AICore(%)   Memory-Usage(MB)  HBM-Usage(MB)              |
        +===================+=================+==========================================================+
        | 0       910B2C    | OK              | 66.8        44                0    / 0                   |
        | 0       0         | 0000:C1:00.0    | 0           2429 / 15077      3632 / 65536               |
        +===================+=================+==========================================================+
        | 1       910B2C    | OK              | 65.5        42                0    / 0                   |
        | 0       1         | 0000:C2:00.0    | 0           2425 / 15077      33000 / 65536              |
        +===================+=================+==========================================================+
        +-------------------+-----------------+----------------------------------------------------------+
        | NPU     Chip      | Process id      | Process name      | Process memory(MB)                   |
        +===================+=================+==========================================================+
        | 0       0         | 12345           | python            | 1000                                 |
        +===================+=================+==========================================================+
        """).strip()
        
        mock_execute.side_effect = [
            ("", "command not found"), # nvidia fails
            (npu_output, ""), # npu succeeds
        ]

        updated_device = check_device_status_detailed(self.device)
        
        self.assertEqual(updated_device.accelerator_type, "Ascend 910B2C")
        self.assertEqual(updated_device.accelerator_count, 2)

        
        status = updated_device.accelerator_status
        npus = status['npus']
        
        # NPU 0: 
        # The logic picks the first memory pair with total >= 1000.
        # In the mock, "Memory-Usage" (2429/15077) comes before "HBM-Usage" (3632/65536).
        # So it picks 2429/15077.
        self.assertEqual(npus[0]['id'], 0)
        self.assertEqual(npus[0]['hbm_used'], 2429)
        self.assertEqual(npus[0]['status'], "busy") 
        
        # NPU 1: 
        # "Memory-Usage" (2425/15077) -> Picked.
        # HBM (33000/65536) -> Ignored by the "first match" logic.
        self.assertEqual(npus[1]['id'], 1)
        self.assertEqual(npus[1]['hbm_used'], 2425)
        self.assertEqual(npus[1]['status'], "busy")

        self.assertEqual(updated_device.busy_count, 2)
        self.assertEqual(updated_device.idle_count, 0)

if __name__ == '__main__':
    unittest.main()
