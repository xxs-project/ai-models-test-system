"""
设备管理完整测试模块
测试设备CRUD、状态刷新、信息获取、备注功能
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, check_device_status_detailed, get_session
from models import Device
from sqlmodel import Session, create_engine, SQLModel
from datetime import datetime
import os

sqlite_file_name = "test_device_complete.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
test_engine = create_engine(sqlite_url, connect_args=connect_args)


@pytest.fixture(scope="module")
def client():
    """创建测试客户端"""
    def get_session_override():
        with Session(test_engine) as session:
            yield session
            
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def db_session():
    """创建测试数据库会话"""
    if os.path.exists(sqlite_file_name):
        os.remove(sqlite_file_name)
        
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
        session.query(Device).delete()
        session.commit()
    
    if os.path.exists(sqlite_file_name):
        os.remove(sqlite_file_name)


class TestDeviceCRUD:
    """设备基本CRUD操作测试"""

    def test_create_device_with_remark(self, client, db_session):
        """测试创建设备时包含备注"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.200",
                "port": 22,
                "username": "root",
                "password": "password123",
                "remark": "测试备注信息"
            }
            response = client.post("/api/devices", json=device_data)
            assert response.status_code == 200
            data = response.json()
            assert data["ip"] == "192.168.1.200"
            assert data["remark"] == "测试备注信息"

    def test_update_device_remark(self, client, db_session):
        """测试更新设备备注"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.201",
                "port": 22,
                "username": "admin",
                "password": "admin123"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        update_data = {"remark": "更新后的备注信息"}
        response = client.put(f"/api/devices/{device_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["remark"] == "更新后的备注信息"

    def test_get_device_includes_remark(self, client, db_session):
        """测试获取设备信息包含备注"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.202",
                "port": 22,
                "username": "user",
                "password": "pass123",
                "remark": "包含备注的设备"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert "remark" in data
        assert data["remark"] == "包含备注的设备"


class TestDeviceRefresh:
    """设备状态刷新功能测试"""

    def test_refresh_device_success(self, client, db_session):
        """测试设备刷新成功"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.203",
                "port": 22,
                "username": "root",
                "password": "password"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.203",
                port=22,
                username="root",
                password="password",
                status="Online",
                os_info="Ubuntu 22.04",
                arch="x86_64",
                accelerator_type="NVIDIA A100",
                accelerator_count=2,
                idle_count=2,
                busy_count=0,
                warning_count=0
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            response = client.post(f"/api/devices/{device_id}/refresh")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "Online"
            assert data["os_info"] == "Ubuntu 22.04"
            assert data["arch"] == "x86_64"

    def test_refresh_device_offline(self, client, db_session):
        """测试设备离线状态刷新"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.204",
                "port": 22,
                "username": "root",
                "password": "wrongpass"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.204",
                port=22,
                username="root",
                password="wrongpass",
                status="Offline",
                error_message="Authentication failed"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            response = client.post(f"/api/devices/{device_id}/refresh")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "Offline"

    def test_refresh_nonexistent_device(self, client):
        """测试刷新不存在的设备"""
        response = client.post("/api/devices/99999/refresh")
        assert response.status_code == 404


class TestDeviceInfoRetrieval:
    """设备信息获取测试"""

    def test_get_device_os_info(self, client, db_session):
        """测试获取设备操作系统信息"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.205",
                "port": 22,
                "username": "root",
                "password": "pass"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.205",
                port=22,
                username="root",
                password="pass",
                status="Online",
                os_info="CentOS Linux 8",
                arch="x86_64"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["os_info"] == "CentOS Linux 8"

    def test_get_device_arch_info(self, client, db_session):
        """测试获取设备架构信息"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.206",
                "port": 22,
                "username": "admin",
                "password": "admin"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.206",
                port=22,
                username="admin",
                password="admin",
                status="Online",
                arch="aarch64"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["arch"] == "aarch64"

    def test_get_device_accelerator_info(self, client, db_session):
        """测试获取设备加速卡信息"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.207",
                "port": 22,
                "username": "user",
                "password": "user123"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.207",
                port=22,
                username="user",
                password="user123",
                status="Online",
                accelerator_type="NVIDIA A100 80GB",
                accelerator_count=4,
                idle_count=3,
                busy_count=1,
                warning_count=0
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            data = response.json()
            assert "A100" in data["accelerator_type"]
            assert data["accelerator_count"] == 4

    def test_get_device_idle_busy_status(self, client, db_session):
        """测试获取设备闲/忙状态"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.208",
                "port": 22,
                "username": "root",
                "password": "root"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.208",
                port=22,
                username="root",
                password="root",
                status="Online",
                accelerator_count=2,
                idle_count=1,
                busy_count=1,
                warning_count=0
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["idle_count"] == 1
            assert data["busy_count"] == 1


class TestDeviceListWithRemark:
    """设备列表备注功能测试"""

    def test_list_devices_with_remarks(self, client, db_session):
        """测试列表显示设备备注"""
        with patch('main.refresh_single_device'):
            for i in range(3):
                client.post("/api/devices", json={
                    "ip": f"192.168.1.{210+i}",
                    "port": 22,
                    "username": "root",
                    "password": "pass",
                    "remark": f"设备{i+1}备注"
                })

        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3
        for device in data["items"]:
            assert "remark" in device

    def test_filter_devices_by_remark(self, client, db_session):
        """测试按备注搜索设备"""
        with patch('main.refresh_single_device'):
            client.post("/api/devices", json={
                "ip": "192.168.1.220",
                "port": 22,
                "username": "root",
                "password": "pass",
                "remark": "生产环境服务器"
            })

        response = client.get("/api/devices?search=生产环境")
        assert response.status_code == 200
        data = response.json()
        for device in data["items"]:
            assert "生产环境" in (device.get("remark") or "")


class TestDeviceStatusMonitoring:
    """设备状态监控测试"""

    def test_device_status_online(self, client, db_session):
        """测试在线设备状态"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.230",
                "port": 22,
                "username": "admin",
                "password": "admin"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.230",
                port=22,
                username="admin",
                password="admin",
                status="Online"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            assert response.json()["status"] == "Online"

    def test_device_status_offline(self, client, db_session):
        """测试离线设备状态"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.231",
                "port": 22,
                "username": "user",
                "password": "wrong"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.231",
                port=22,
                username="user",
                password="wrong",
                status="Offline",
                error_message="Connection timeout"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            client.post(f"/api/devices/{device_id}/refresh")

            response = client.get(f"/api/devices/{device_id}")
            assert response.status_code == 200
            assert response.json()["status"] == "Offline"


class TestDeviceSecurity:
    """设备安全性测试"""

    def test_password_not_in_response(self, client, db_session):
        """测试响应中不包含密码"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.240",
                "port": 22,
                "username": "root",
                "password": "secretpassword"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert "password" not in data

    def test_password_not_in_list(self, client, db_session):
        """测试列表响应中不包含密码"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.241",
                "port": 22,
                "username": "admin",
                "password": "secret123"
            }
            client.post("/api/devices", json=device_data)

        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        for device in data["items"]:
            assert "password" not in device


class TestDeviceReliability:
    """设备功能可靠性测试"""

    def test_concurrent_refresh_requests(self, client, db_session):
        """测试并发刷新请求"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.250",
                "port": 22,
                "username": "root",
                "password": "pass"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        with patch('main.check_device_status_detailed') as mock_check:
            mock_device = Device(
                id=device_id,
                ip="192.168.1.250",
                port=22,
                username="root",
                password="pass",
                status="Online"
            )
            
            def side_effect(device_arg):
                for k, v in mock_device.model_dump().items():
                    setattr(device_arg, k, v)
                return device_arg
            mock_check.side_effect = side_effect

            responses = []
            for _ in range(5):
                response = client.post(f"/api/devices/{device_id}/refresh")
                responses.append(response.status_code)

            assert all(status == 200 for status in responses)

    def test_invalid_device_id(self, client):
        """测试无效设备ID处理"""
        response = client.post("/api/devices/invalid/refresh")
        assert response.status_code in [404, 422]

    def test_device_not_found_on_delete(self, client):
        """测试删除不存在的设备"""
        response = client.delete("/api/devices/99999")
        assert response.status_code == 404


class TestDeviceExtensibility:
    """设备功能可扩展性测试"""

    def test_create_device_with_extended_fields(self, client, db_session):
        """测试创建设备时包含扩展字段"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.260",
                "port": 22,
                "username": "admin",
                "password": "admin",
                "remark": "可扩展性测试设备"
            }
            response = client.post("/api/devices", json=device_data)
            assert response.status_code == 200
            data = response.json()
            assert data["remark"] == "可扩展性测试设备"

    def test_update_multiple_fields(self, client, db_session):
        """测试批量更新设备字段"""
        with patch('main.refresh_single_device'):
            device_data = {
                "ip": "192.168.1.261",
                "port": 22,
                "username": "user",
                "password": "pass"
            }
            create_response = client.post("/api/devices", json=device_data)
            device_id = create_response.json()["id"]

        update_data = {
            "remark": "更新后的备注",
            "username": "newuser"
        }
        response = client.put(f"/api/devices/{device_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["remark"] == "更新后的备注"
        assert data["username"] == "newuser"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
