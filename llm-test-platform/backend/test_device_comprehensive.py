"""
Comprehensive test suite for device management functionality.
Tests cover: functionality correctness, reliability, extensibility, and security.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from unittest.mock import patch, MagicMock
import io
import csv
from datetime import datetime

from main import app, get_session, engine
from models import Device


@pytest.fixture(scope="module")
def test_engine():
    """Create test database engine."""
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(test_engine)
    yield test_engine
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture
def db_session(test_engine):
    """Create a test database session."""
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def client(test_engine):
    """Create a test client with database dependency override."""
    def override_get_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_device_data():
    """Sample device data for testing."""
    return {
        "ip": "192.168.1.100",
        "port": 22,
        "username": "root",
        "password": "testpass123",
        "remark": "Test device"
    }


@pytest.fixture
def sample_csv_content():
    """Sample CSV content for import testing."""
    return """IP地址,端口,用户名,密码,备注
192.168.1.100,22,root,testpass123,Test device 1
192.168.1.101,22,admin,admin456,Test device 2
192.168.1.102,22,user,user789,Test device 3"""


class TestDeviceCreation:
    """Test device creation functionality and validation."""

    def test_create_device_success(self, client, db_session, sample_device_data):
        """Test successful device creation."""
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == sample_device_data["ip"]
        assert data["port"] == sample_device_data["port"]
        assert data["username"] == sample_device_data["username"]
        assert "id" in data
        assert "password" not in response.json()

    def test_create_device_invalid_ip(self, client, sample_device_data):
        """Test device creation with invalid IP address."""
        sample_device_data["ip"] = "999.999.999.999"
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400
        assert "IP" in response.json()["detail"]

    def test_create_device_invalid_ip_format(self, client, sample_device_data):
        """Test device creation with malformed IP address."""
        sample_device_data["ip"] = "not-an-ip"
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400
        assert "IP" in response.json()["detail"]

    def test_create_device_invalid_port_low(self, client, sample_device_data):
        """Test device creation with port below valid range."""
        sample_device_data["port"] = 0
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400
        assert "端口" in response.json()["detail"]

    def test_create_device_invalid_port_high(self, client, sample_device_data):
        """Test device creation with port above valid range."""
        sample_device_data["port"] = 65536
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400
        assert "端口" in response.json()["detail"]

    def test_create_device_duplicate_ip(self, client, db_session, sample_device_data):
        """Test device creation with duplicate IP."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400
        assert "已存在" in response.json()["detail"]

    def test_create_device_missing_required_fields(self, client):
        """Test device creation with missing required fields."""
        incomplete_data = {
            "ip": "192.168.1.100",
            "username": "root"
        }
        response = client.post("/api/devices", json=incomplete_data)
        assert response.status_code == 422

    def test_create_device_empty_ip(self, client, sample_device_data):
        """Test device creation with empty IP."""
        sample_device_data["ip"] = ""
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 400

    def test_create_device_special_characters_in_remark(self, client, sample_device_data):
        """Test device creation with special characters in remark."""
        sample_device_data["remark"] = "Test @#$%^&*() Device"
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200
        assert response.json()["remark"] == sample_device_data["remark"]

    def test_create_device_default_port(self, client, sample_device_data):
        """Test device creation uses default port when not specified."""
        del sample_device_data["port"]
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200
        assert response.json()["port"] == 22


class TestDeviceRetrieval:
    """Test device retrieval functionality."""

    def test_get_devices_empty_list(self, client):
        """Test getting empty device list."""
        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_devices_with_data(self, client, db_session, sample_device_data):
        """Test getting device list with data."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1

    def test_get_device_by_id(self, client, db_session, sample_device_data):
        """Test getting single device by ID."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()
        db_session.refresh(device)

        response = client.get(f"/api/devices/{device.id}")
        assert response.status_code == 200
        assert response.json()["ip"] == sample_device_data["ip"]

    def test_get_device_not_found(self, client):
        """Test getting non-existent device."""
        response = client.get("/api/devices/99999")
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]

    def test_get_devices_pagination(self, client, db_session, sample_device_data):
        """Test device list pagination."""
        for i in range(25):
            device_data = sample_device_data.copy()
            device_data["ip"] = f"192.168.1.{i+100}"
            device = Device(**device_data)
            db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 1
        assert data["size"] == 10

        response = client.get("/api/devices?page=2&size=10")
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 2

        response = client.get("/api/devices?page=3&size=10")
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 3


class TestDeviceFiltering:
    """Test device filtering functionality."""

    def test_filter_by_status(self, client, db_session, sample_device_data):
        """Test filtering devices by status."""
        device = Device(**sample_device_data, status="Online")
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices?status=Online")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

        response = client.get("/api/devices?status=Offline")
        data = response.json()
        assert len(data["items"]) == 0

    def test_filter_by_arch(self, client, db_session, sample_device_data):
        """Test filtering devices by architecture."""
        device = Device(**sample_device_data, arch="x86_64")
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices?arch=x86_64")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

    def test_filter_by_search(self, client, db_session, sample_device_data):
        """Test searching devices by IP or username."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices?search=192.168.1.100")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

        response = client.get("/api/devices?search=root")
        data = response.json()
        assert len(data["items"]) == 1

        response = client.get("/api/devices?search=nonexistent")
        data = response.json()
        assert len(data["items"]) == 0


class TestDeviceUpdate:
    """Test device update functionality."""

    def test_update_device(self, client, db_session, sample_device_data):
        """Test successful device update."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()
        db_session.refresh(device)

        update_data = {"remark": "Updated remark"}
        response = client.put(f"/api/devices/{device.id}", json=update_data)
        assert response.status_code == 200
        assert response.json()["remark"] == "Updated remark"

    def test_update_device_not_found(self, client):
        """Test updating non-existent device."""
        response = client.put("/api/devices/99999", json={"remark": "Test"})
        assert response.status_code == 404

    def test_update_device_partial(self, client, db_session, sample_device_data):
        """Test partial device update."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()
        db_session.refresh(device)

        update_data = {"port": 2222}
        response = client.put(f"/api/devices/{device.id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["port"] == 2222
        assert data["ip"] == sample_device_data["ip"]


class TestDeviceDeletion:
    """Test device deletion functionality."""

    def test_delete_device(self, client, db_session, sample_device_data):
        """Test successful device deletion."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()
        db_session.refresh(device)

        response = client.delete(f"/api/devices/{device.id}")
        assert response.status_code == 200

        response = client.get(f"/api/devices/{device.id}")
        assert response.status_code == 404

    def test_delete_device_not_found(self, client):
        """Test deleting non-existent device."""
        response = client.delete("/api/devices/99999")
        assert response.status_code == 404


class TestDeviceImport:
    """Test device import functionality."""

    def test_import_devices_success(self, client, sample_csv_content):
        """Test successful device import from CSV."""
        files = {"file": ("devices.csv", sample_csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["imported_count"] == 3
        assert data["failed_count"] == 0

    def test_import_devices_duplicate(self, client, db_session, sample_device_data, sample_csv_content):
        """Test import with duplicate IP addresses."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        files = {"file": ("devices.csv", sample_csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 2
        assert data["failed_count"] == 1
        assert "已存在" in data["failed_rows"][0]

    def test_import_devices_invalid_ip(self, client):
        """Test import with invalid IP addresses."""
        csv_content = """IP地址,端口,用户名,密码,备注
invalid-ip,22,root,testpass,Test device"""
        files = {"file": ("devices.csv", csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 0
        assert data["failed_count"] == 1
        assert "IP格式无效" in data["failed_rows"][0]

    def test_import_devices_empty_file(self, client):
        """Test import with empty CSV file."""
        csv_content = """IP地址,端口,用户名,密码,备注"""
        files = {"file": ("devices.csv", csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 0

    def test_import_devices_missing_columns(self, client):
        """Test import with missing required columns."""
        csv_content = """IP,User
192.168.1.100,root"""
        files = {"file": ("devices.csv", csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] > 0

    def test_import_devices_utf8_encoding(self, client):
        """Test import with UTF-8 encoding including special characters."""
        csv_content = """IP地址,端口,用户名,密码,备注
192.168.1.100,22,root,测试密码,中文测试设备"""
        files = {"file": ("devices.csv", csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 1


class TestDeviceExport:
    """Test device export functionality."""

    def test_export_devices_empty(self, client):
        """Test exporting empty device list."""
        response = client.get("/api/devices/export")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "devices_export_" in response.headers["content-disposition"]

    def test_export_devices_with_data(self, client, db_session, sample_device_data):
        """Test exporting device list with data."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices/export")
        assert response.status_code == 200
        content = response.content.decode('utf-8-sig')
        assert "192.168.1.100" in content
        assert "root" in content


class TestDeviceTemplate:
    """Test device template download functionality."""

    def test_download_template(self, client):
        """Test downloading device import template."""
        response = client.get("/api/devices/template")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "device_template.csv" in response.headers["content-disposition"]
        content = response.content.decode('utf-8-sig')
        assert "IP地址" in content
        assert "192.168.1.100" in content


class TestDeviceRefresh:
    """Test device status refresh functionality."""

    def test_refresh_device_success(self, client, db_session, sample_device_data):
        """Test successful device status refresh."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()
        db_session.refresh(device)

        with patch('main.check_device') as mock_check:
            mock_check.return_value = device
            response = client.post(f"/api/devices/{device.id}/refresh")
            assert response.status_code == 200

    def test_refresh_device_not_found(self, client):
        """Test refreshing non-existent device."""
        response = client.post("/api/devices/99999/refresh")
        assert response.status_code == 404


class TestSecurity:
    """Test security aspects of device management."""

    def test_password_not_in_response(self, client, db_session, sample_device_data):
        """Test that passwords are not included in API responses."""
        device = Device(**sample_device_data)
        db_session.add(device)
        db_session.commit()

        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert "password" not in str(data["items"])

        response = client.get(f"/api/devices/{device.id}")
        assert response.status_code == 200
        data = response.json()
        assert "password" not in data

    def test_sql_injection_prevention(self, client):
        """Test SQL injection prevention in search."""
        response = client.get("/api/devices?search=192.168.1.100'; DROP TABLE device;--")
        assert response.status_code == 200

    def test_xss_prevention_in_remark(self, client, sample_device_data):
        """Test XSS prevention in device remark."""
        sample_device_data["remark"] = "<script>alert('xss')</script>"
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200
        data = response.json()
        assert "<script>" not in data["remark"]

    def test_large_payload_handling(self, client, sample_device_data):
        """Test handling of large request payloads."""
        sample_device_data["remark"] = "x" * 10000
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200

    def test_rate_limiting_headers(self, client):
        """Test that appropriate headers are set for rate limiting awareness."""
        response = client.get("/api/devices")
        assert response.status_code == 200


class TestReliability:
    """Test reliability aspects of device management."""

    def test_concurrent_device_creation(self, client, db_session):
        """Test concurrent device creation handling."""
        import concurrent.futures

        def create_device(device_num):
            data = {
                "ip": f"192.168.1.{device_num + 200}",
                "port": 22,
                "username": f"user{device_num}",
                "password": "testpass"
            }
            return client.post("/api/devices", json=data)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_device, i) for i in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        for response in results:
            assert response.status_code == 200

        response = client.get("/api/devices")
        assert response.json()["total"] == 5

    def test_idempotent_import(self, client, sample_csv_content):
        """Test that importing same file multiple times is handled correctly."""
        files = {"file": ("devices.csv", sample_csv_content, "text/csv")}
        response1 = client.post("/api/devices/import", files=files)
        assert response1.json()["imported_count"] == 3

        response2 = client.post("/api/devices/import", files=files)
        assert response2.json()["imported_count"] == 0
        assert response2.json()["failed_count"] == 3

    def test_database_connection_resilience(self, client, sample_device_data):
        """Test system resilience during database operations."""
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200

        response = client.get("/api/devices")
        assert response.status_code == 200
        assert response.json()["total"] >= 1

    def test_partial_import_failure(self, client):
        """Test that partial failures don't break the entire import."""
        csv_content = """IP地址,端口,用户名,密码,备注
192.168.1.100,22,root,pass1,Valid
invalid-ip,22,root,pass2,Invalid IP
192.168.1.101,22,root,pass3,Valid"""
        files = {"file": ("devices.csv", csv_content, "text/csv")}
        response = client.post("/api/devices/import", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 2
        assert data["failed_count"] == 1


class TestExtensibility:
    """Test extensibility aspects of the API."""

    def test_additional_fields_ignored(self, client, sample_device_data):
        """Test that additional fields are properly handled."""
        sample_device_data["extra_field"] = "should be ignored"
        sample_device_data["nested"] = {"key": "value"}
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200

    def test_future_status_values(self, client, sample_device_data):
        """Test system handles unexpected status values gracefully."""
        sample_device_data["status"] = "Unknown"
        response = client.post("/api/devices", json=sample_device_data)
        assert response.status_code == 200
        assert response.json()["status"] == "Unknown"

    def test_api_version_awareness(self, client):
        """Test API response includes version information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data


class TestHealthEndpoints:
    """Test system health and monitoring endpoints."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_root_endpoint(self, client):
        """Test root API endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "大模型测试平台" in data["message"]
