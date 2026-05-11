import unittest
from unittest.mock import MagicMock
from datetime import datetime, timedelta
import sys
import os

# Adjust path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.resource_manager import ResourceManager
from models import Device

class TestResourceManager(unittest.TestCase):
    def setUp(self):
        self.manager = ResourceManager()
        self.device = Device(id=1, ip="1.2.3.4", status="Online", username="root", password="password")
        
    def test_cooldown(self):
        # Initial check should pass
        self.assertTrue(self.manager._check_cooldown(1))
        
        # Record dispatch
        self.manager.record_dispatch(1)
        
        # Immediate check should fail
        self.assertFalse(self.manager._check_cooldown(1))
        
        # Hack internal state to simulate time passing
        self.manager._device_last_dispatch[1] = datetime.now() - timedelta(minutes=5, seconds=1)
        self.assertTrue(self.manager._check_cooldown(1))

    def test_cooldown_with_running_tasks(self):
        # Initial check should pass even if just dispatched, IF no running tasks
        self.manager.record_dispatch(1)
        
        # Case 1: No running tasks -> Should allow immediate dispatch (if resources allow)
        task = {'npu_count': 1}
        self.device.accelerator_status = {"gpus": [{"status": "idle"}]} # Assume resources OK
        self.manager._check_resources = MagicMock(return_value=(True, "OK"))
        
        can_run, _ = self.manager.can_execute(task, self.device, [])
        self.assertTrue(can_run, "Should allow immediate dispatch if device is idle")
        
        # Case 2: Running tasks exist -> Should enforce cooldown
        running_tasks = [{'device_id': 1}]
        can_run, reason = self.manager.can_execute(task, self.device, running_tasks)
        self.assertFalse(can_run, "Should enforce cooldown if tasks are running")
        self.assertIn("冷却期", reason)
        
        # Case 3: Running tasks exist + Time passed -> Should allow
        self.manager._device_last_dispatch[1] = datetime.now() - timedelta(minutes=5, seconds=1)
        can_run, _ = self.manager.can_execute(task, self.device, running_tasks)
        self.assertTrue(can_run, "Should allow dispatch after cooldown even if tasks running")

    def test_mindie_exclusive(self):
        task = {'inference_framework': ResourceManager.FRAMEWORK_MINDIE}
        running_tasks = [{'device_id': 1}] # Another task running on device 1
        
        # Should fail
        can_run, reason = self.manager.can_execute(task, self.device, running_tasks)
        self.assertFalse(can_run)
        self.assertIn("MindIE任务需要独占", reason)
        
        # Should pass if no tasks running
        can_run, reason = self.manager.can_execute(task, self.device, [])
        # Note: Resource check might fail if device has no cards, so we mock _check_resources or ensure device has cards
        # Let's mock _check_resources to return True for this test
        self.manager._check_resources = MagicMock(return_value=(True, "OK"))
        can_run, reason = self.manager.can_execute(task, self.device, [])
        self.assertTrue(can_run)

    def test_resource_count(self):
        # 4 cards idle
        self.device.accelerator_status = {"gpus": [{"status": "idle"} for _ in range(4)]}
        
        # Need 2 -> OK
        task = {'npu_count': 2, 'test_mode': 1}
        can_run, _ = self.manager._check_resources(task, self.device)
        self.assertTrue(can_run)
        
        # Need 8 -> Fail
        task = {'npu_count': 8, 'test_mode': 1}
        can_run, reason = self.manager._check_resources(task, self.device)
        self.assertFalse(can_run)
        self.assertIn("不足", reason)

    def test_topology_single_model(self):
        # Need 2 cards.
        # Case 1: 0, 1 idle (OK)
        self.device.accelerator_status = {"npus": [{"id": 0, "status": "idle"}, {"id": 1, "status": "idle"}]}
        task = {'npu_count': 2, 'test_mode': 1}
        can_run, _ = self.manager._check_resources(task, self.device)
        self.assertTrue(can_run)
        
        # Case 2: 0, 9 idle (Fail - split across 0-7 and 8-15)
        self.device.accelerator_status = {"npus": [{"id": 0, "status": "idle"}, {"id": 9, "status": "idle"}]}
        can_run, reason = self.manager._check_resources(task, self.device)
        self.assertFalse(can_run)
        self.assertIn("拓扑", reason)

    def test_topology_all_models(self):
        task = {'test_mode': 2} # All models
        
        # Case 1: 4 cards idle, indices 0,1,2,3 (OK)
        self.device.accelerator_status = {"npus": [{"id": i, "status": "idle"} for i in [0,1,2,3]]}
        can_run, _ = self.manager._check_resources(task, self.device)
        self.assertTrue(can_run)
        
        # Case 2: 4 cards idle, indices 0,1,2,9 (Fail)
        self.device.accelerator_status = {"npus": [{"id": i, "status": "idle"} for i in [0,1,2,9]]}
        can_run, reason = self.manager._check_resources(task, self.device)
        self.assertFalse(can_run)
        
        # Case 3: < 4 cards (Fail)
        self.device.accelerator_status = {"npus": [{"id": i, "status": "idle"} for i in [0,1,2]]}
        can_run, reason = self.manager._check_resources(task, self.device)
        self.assertFalse(can_run)

if __name__ == '__main__':
    unittest.main()
