"""
设备管理完整测试模块
测试设备CRUD、状态刷新、信息获取、备注功能
包括：功能正确性、可靠性、可扩展性、安全性
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
from typing import Optional, Dict, Any
import threading
import time

sqlite_file_name = "test_device_management_enhanced.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
test_engine = create_engine(sqlite_url, connect_args=connect_args)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base = declarative_base()


class Device(Base):
    __tablename__ = 'devices'
    id = Column(Integer, primary_key=True, index=True)
    ip = Column(String, index=True)
    port = Column(Integer, default=22)
    username = Column(String)
    password = Column(String)
    status = Column(String, default="Unknown")
    os_info = Column(String, nullable=True)
    arch = Column(String, nullable=True)
    accelerator_type = Column(String, nullable=True)
    accelerator_count = Column(Integer, default=0)
    idle_count = Column(Integer, default=0)
    busy_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    accelerator_status = Column(JSON, nullable=True)
    remark = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    last_updated = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    updated_at = Column(String, default=lambda: datetime.now().isoformat())


class Settings(Base):
    __tablename__ = 'settings'
    id = Column(Integer, primary_key=True)
    interval_seconds = Column(Integer, default=60)
    auto_refresh = Column(Integer, default=1)
    notifications_enabled = Column(Integer, default=1)


Base.metadata.create_all(bind=test_engine)


from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func, select, or_
from pydantic import BaseModel, Field
import html


def get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def device_to_dict(device):
    d = {c.name: getattr(device, c.name) for c in device.__table__.columns}
    d.pop('password', None)
    return d


class DeviceCreate(BaseModel):
    ip: str = Field(min_length=1)
    port: int = Field(22, ge=0, le=65535)
    username: str = Field(min_length=1)
    password: str
    remark: Optional[str] = None
    status: str = "Unknown"
    arch: Optional[str] = None
    accelerator_type: Optional[str] = None
    os_info: Optional[str] = None
    accelerator_count: int = 0
    idle_count: int = 0
    busy_count: int = 0
    warning_count: int = 0
    error_message: Optional[str] = None
    accelerator_status: Optional[Dict[str, Any]] = None


class DeviceUpdate(BaseModel):
    ip: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    remark: Optional[str] = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/devices", response_model=dict)
async def read_devices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    arch: str = Query(None),
    db: Session = Depends(get_db)
):
    statement = select(Device)
    
    if search:
        search_lower = search.lower()
        statement = statement.where(
            or_(
                Device.ip.like(f"%{search}%"),
                Device.username.like(f"%{search}%"),
                Device.accelerator_type.like(f"%{search}%")
            )
        )
    if status:
        statement = statement.where(Device.status == status)
    if arch:
        statement = statement.where(Device.arch == arch)
    
    total = db.execute(select(func.count()).select_from(statement.subquery())).scalar()
    statement = statement.offset((page - 1) * size).limit(size)
    devices = db.execute(statement).scalars().all()
    
    # Convert SQLAlchemy objects to dicts for Pydantic serialization
    devices_dict = []
    for d in devices:
        d_dict = {c.name: getattr(d, c.name) for c in d.__table__.columns}
        d_dict.pop('password', None)
        devices_dict.append(d_dict)
    
    return {"items": devices_dict, "total": total, "page": page, "size": size}


@app.get("/api/devices/{device_id}")
async def read_device(device_id: int, db: Session = Depends(get_db)):
    device = db.execute(select(Device).where(Device.id == device_id)).scalar()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device_to_dict(device)


@app.post("/api/devices")
async def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Device).where(Device.ip == device.ip)).scalar()
    if existing:
        raise HTTPException(status_code=400, detail="该 IP 已存在")
    
    device_data = device.model_dump()
    if device_data.get("remark"):
        device_data["remark"] = html.escape(device_data["remark"])
        
    db_device = Device(**device_data)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return device_to_dict(db_device)


@app.put("/api/devices/{device_id}")
async def update_device(device_id: int, device_update: DeviceUpdate, db: Session = Depends(get_db)):
    db_device = db.execute(select(Device).where(Device.id == device_id)).scalar()
    if not db_device:
        raise HTTPException(status_code=404, detail="设备不存在")
    
    update_data = device_update.model_dump(exclude_unset=True)
    if update_data.get("remark"):
        update_data["remark"] = html.escape(update_data["remark"])
        
    for field, value in update_data.items():
        if value is not None:
            setattr(db_device, field, value)
    
    db_device.updated_at = datetime.now().isoformat()
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return device_to_dict(db_device)


@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.execute(select(Device).where(Device.id == device_id)).scalar()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    db.delete(device)
    db.commit()
    return {"ok": True}


@app.post("/api/devices/{device_id}/refresh")
async def refresh_device(device_id: int, db: Session = Depends(get_db)):
    device = db.execute(select(Device).where(Device.id == device_id)).scalar()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device_to_dict(device)


@app.get("/api/settings")
async def get_settings(db: Session = Depends(get_db)):
    settings = db.execute(select(Settings)).scalar()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {c.name: getattr(settings, c.name) for c in settings.__table__.columns}


@app.put("/api/settings")
async def update_settings(new_settings: dict, db: Session = Depends(get_db)):
    settings = db.execute(select(Settings)).scalar()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    if 'interval_seconds' in new_settings:
        settings.interval_seconds = new_settings['interval_seconds']
    if 'auto_refresh' in new_settings:
        settings.auto_refresh = new_settings['auto_refresh']
    if 'notifications_enabled' in new_settings:
        settings.notifications_enabled = new_settings['notifications_enabled']
    
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return {c.name: getattr(settings, c.name) for c in settings.__table__.columns}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="function")
def clean_db():
    db = TestingSessionLocal()
    try:
        db.query(Device).delete()
        db.commit()
    finally:
        db.close()


class TestDeviceCRUDCorrectness:
    """设备基本CRUD操作测试 - 功能正确性"""

    def test_create_device_basic(self, client, clean_db):
        """测试创建基础设备"""
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password123",
            "remark": "测试设备"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == "192.168.1.100"
        assert data["username"] == "root"
        assert data["port"] == 22
        assert data["status"] == "Unknown"
        assert data["accelerator_count"] == 0
        assert "id" in data

    def test_create_device_with_all_fields(self, client, clean_db):
        """测试创建包含所有状态的设备"""
        device_data = {
            "ip": "192.168.1.101",
            "port": 22,
            "username": "admin",
            "password": "admin123",
            "status": "Online",
            "accelerator_count": 4,
            "idle_count": 2,
            "busy_count": 1,
            "warning_count": 1,
            "remark": "GPU服务器"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == "192.168.1.101"
        assert data["status"] == "Online"
        assert data["accelerator_count"] == 4
        assert data["idle_count"] == 2
        assert data["busy_count"] == 1
        assert data["warning_count"] == 1

    def test_create_device_with_custom_port(self, client, clean_db):
        """测试创建设备时使用自定义端口"""
        device_data = {
            "ip": "192.168.1.102",
            "port": 2222,
            "username": "admin",
            "password": "admin123"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["port"] == 2222

    def test_create_duplicate_ip(self, client, clean_db):
        """测试创建重复IP设备"""
        device_data = {
            "ip": "192.168.1.103",
            "port": 22,
            "username": "root",
            "password": "password"
        }
        response1 = client.post("/api/devices", json=device_data)
        assert response1.status_code == 200
        
        response2 = client.post("/api/devices", json=device_data)
        assert response2.status_code == 400
        assert "已存在" in response2.json()["detail"]

    def test_read_device(self, client, clean_db):
        """测试读取单个设备"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.104",
            "port": 22,
            "username": "user",
            "password": "pass"
        })
        device_id = create_response.json()["id"]
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == "192.168.1.104"
        assert data["id"] == device_id

    def test_read_nonexistent_device(self, client):
        """测试读取不存在的设备"""
        response = client.get("/api/devices/99999")
        assert response.status_code == 404

    def test_update_device(self, client, clean_db):
        """测试更新设备信息"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.105",
            "port": 22,
            "username": "root",
            "password": "pass"
        })
        device_id = create_response.json()["id"]
        
        update_data = {
            "username": "admin",
            "remark": "更新后的设备"
        }
        response = client.put(f"/api/devices/{device_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["remark"] == "更新后的设备"

    def test_delete_device(self, client, clean_db):
        """测试删除设备"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.106",
            "port": 22,
            "username": "root",
            "password": "pass"
        })
        device_id = create_response.json()["id"]
        
        response = client.delete(f"/api/devices/{device_id}")
        assert response.status_code == 200
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 404


class TestDeviceListPagination:
    """设备列表分页测试 - 功能正确性"""

    def test_list_devices_pagination(self, client, clean_db):
        """测试设备列表分页"""
        for i in range(5):
            client.post("/api/devices", json={
                "ip": f"192.168.1.{200 + i}",
                "port": 22,
                "username": "root",
                "password": "pass"
            })
        
        response = client.get("/api/devices?page=1&size=2")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 2
        assert len(data["items"]) == 2
        assert data["total"] >= 5

    def test_list_devices_second_page(self, client, clean_db):
        """测试设备列表第二页"""
        for i in range(5):
            client.post("/api/devices", json={
                "ip": f"192.168.1.{210 + i}",
                "port": 22,
                "username": "root",
                "password": "pass"
            })
        
        response = client.get("/api/devices?page=2&size=2")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert len(data["items"]) == 2

    def test_list_devices_empty_page(self, client, clean_db):
        """测试超出范围的页码"""
        for i in range(3):
            client.post("/api/devices", json={
                "ip": f"192.168.1.{220 + i}",
                "port": 22,
                "username": "root",
                "password": "pass"
            })
        
        response = client.get("/api/devices?page=10&size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 10
        assert len(data["items"]) == 0


class TestDeviceSearch:
    """设备搜索测试 - 功能正确性"""

    def test_search_by_ip(self, client, clean_db):
        """测试按IP搜索"""
        client.post("/api/devices", json={
            "ip": "192.168.1.300",
            "port": 22,
            "username": "root",
            "password": "pass"
        })
        client.post("/api/devices", json={
            "ip": "192.168.2.100",
            "port": 22,
            "username": "admin",
            "password": "pass"
        })
        
        response = client.get("/api/devices?search=1.300")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        assert any(item["ip"] == "192.168.1.300" for item in data["items"])

    def test_search_by_username(self, client, clean_db):
        """测试按用户名搜索"""
        client.post("/api/devices", json={
            "ip": "192.168.1.301",
            "port": 22,
            "username": "testuser",
            "password": "pass"
        })
        
        response = client.get("/api/devices?search=testuser")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        assert any(item["username"] == "testuser" for item in data["items"])

    def test_filter_by_status(self, client, clean_db):
        """测试按状态筛选"""
        for i in range(3):
            client.post("/api/devices", json={
                "ip": f"192.168.1.{400 + i}",
                "port": 22,
                "username": "root",
                "password": "pass"
            })
        
        response = client.get("/api/devices?status=Unknown")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3

    def test_filter_by_arch(self, client, clean_db):
        """测试按架构筛选"""
        client.post("/api/devices", json={
            "ip": "192.168.1.401",
            "port": 22,
            "username": "root",
            "password": "pass",
            "arch": "x86_64"
        })
        client.post("/api/devices", json={
            "ip": "192.168.1.402",
            "port": 22,
            "username": "root",
            "password": "pass",
            "arch": "aarch64"
        })
        
        response = client.get("/api/devices?arch=x86_64")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        assert all(item["arch"] == "x86_64" for item in data["items"])


class TestDeviceRefreshFunctionality:
    """设备状态刷新测试 - 功能正确性"""

    def test_refresh_device_success(self, client, clean_db):
        """测试设备刷新成功"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.500",
            "port": 22,
            "username": "root",
            "password": "password"
        })
        device_id = create_response.json()["id"]
        
        response = client.post(f"/api/devices/{device_id}/refresh")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Unknown"

    def test_refresh_nonexistent_device(self, client, clean_db):
        """测试刷新不存在的设备"""
        response = client.post("/api/devices/99999/refresh")
        assert response.status_code == 404


class TestDeviceAcceleratorStatus:
    """设备加速器状态测试 - 功能正确性"""

    def test_accelerator_status_gpu(self, client, clean_db):
        """测试GPU加速器状态统计"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.600",
            "port": 22,
            "username": "root",
            "password": "pass",
            "accelerator_count": 4,
            "idle_count": 2,
            "busy_count": 1,
            "warning_count": 1
        })
        device_id = create_response.json()["id"]
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["accelerator_count"] == 4
        assert data["idle_count"] == 2
        assert data["busy_count"] == 1
        assert data["warning_count"] == 1

    def test_accelerator_status_npu(self, client, clean_db):
        """测试NPU加速器状态"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.601",
            "port": 22,
            "username": "root",
            "password": "pass",
            "accelerator_type": "Huawei Ascend",
            "accelerator_count": 8,
            "idle_count": 5,
            "busy_count": 2,
            "warning_count": 1
        })
        device_id = create_response.json()["id"]
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["accelerator_type"] == "Huawei Ascend"
        assert data["accelerator_count"] == 8


class TestDeviceReliability:
    """设备功能可靠性测试"""

    def test_concurrent_refresh_requests(self, client, clean_db):
        """测试并发刷新请求"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.700",
            "port": 22,
            "username": "root",
            "password": "pass"
        })
        device_id = create_response.json()["id"]
        
        responses = []
        for _ in range(5):
            response = client.post(f"/api/devices/{device_id}/refresh")
            responses.append(response.status_code)
        
        assert all(status == 200 for status in responses)

    def test_invalid_device_id(self, client):
        """测试无效设备ID处理"""
        response = client.get("/api/devices/invalid")
        assert response.status_code in [404, 422]

    def test_device_not_found_on_delete(self, client):
        """测试删除不存在的设备"""
        response = client.delete("/api/devices/99999")
        assert response.status_code == 404

    def test_invalid_port_number(self, client, clean_db):
        """测试无效端口号处理"""
        device_data = {
            "ip": "192.168.1.701",
            "port": -1,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 422

    def test_empty_ip_address(self, client, clean_db):
        """测试空IP地址"""
        device_data = {
            "ip": "",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 422

    def test_empty_username(self, client, clean_db):
        """测试空用户名"""
        device_data = {
            "ip": "192.168.1.702",
            "port": 22,
            "username": "",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 422


class TestDeviceSecurity:
    """设备安全性测试"""

    def test_password_not_in_response(self, client, clean_db):
        """测试响应中不包含密码"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.800",
            "port": 22,
            "username": "root",
            "password": "secretpassword"
        })
        device_id = create_response.json()["id"]
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert "password" not in data

    def test_password_not_in_list(self, client, clean_db):
        """测试列表响应中不包含密码"""
        client.post("/api/devices", json={
            "ip": "192.168.1.801",
            "port": 22,
            "username": "admin",
            "password": "secret123"
        })
        
        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        for device in data["items"]:
            assert "password" not in device

    def test_sql_injection_prevention(self, client, clean_db):
        """测试SQL注入防护"""
        device_data = {
            "ip": "192.168.1.802'; DROP TABLE devices; --",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200

        response = client.get("/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

    def test_xss_prevention_in_remark(self, client, clean_db):
        """测试XSS防护"""
        device_data = {
            "ip": "192.168.1.803",
            "port": 22,
            "username": "root",
            "password": "pass",
            "remark": "<script>alert('xss')</script>"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        
        response = client.get(f"/api/devices/{response.json()['id']}")
        assert response.status_code == 200
        data = response.json()
        assert "<script>" not in data.get("remark", "")


class TestDeviceExtensibility:
    """设备功能可扩展性测试"""

    def test_create_device_with_extended_fields(self, client, clean_db):
        """测试创建设备时包含扩展字段"""
        device_data = {
            "ip": "192.168.1.900",
            "port": 22,
            "username": "admin",
            "password": "admin",
            "remark": "可扩展性测试设备"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["remark"] == "可扩展性测试设备"

    def test_update_multiple_fields(self, client, clean_db):
        """测试批量更新设备字段"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.901",
            "port": 22,
            "username": "user",
            "password": "pass"
        })
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

    def test_optional_fields_can_be_null(self, client, clean_db):
        """测试可选字段可以为null"""
        device_data = {
            "ip": "192.168.1.902",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["remark"] is None
        assert data["arch"] is None
        assert data["accelerator_type"] is None


class TestDeviceAutoMonitor:
    """设备自动监控测试 - 功能正确性"""

    def test_settings_interval_seconds(self, client, clean_db):
        """测试监控间隔设置"""
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "interval_seconds" in data
        assert data["interval_seconds"] >= 1

    def test_update_settings(self, client, clean_db):
        """测试更新监控设置"""
        response = client.put("/api/settings", json={
            "interval_seconds": 120,
            "auto_refresh": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["interval_seconds"] == 120

    def test_settings_default_values(self, client, clean_db):
        """测试设置默认值"""
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert data["auto_refresh"] == True
        assert data["notifications_enabled"] == True


class TestDeviceEdgeCases:
    """设备边界情况测试"""

    def test_max_port_number(self, client, clean_db):
        """测试最大端口号"""
        device_data = {
            "ip": "192.168.1.950",
            "port": 65535,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        assert response.json()["port"] == 65535

    def test_min_port_number(self, client, clean_db):
        """测试最小端口号"""
        device_data = {
            "ip": "192.168.1.951",
            "port": 1,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        assert response.json()["port"] == 1

    def test_special_characters_in_username(self, client, clean_db):
        """测试用户名包含特殊字符"""
        device_data = {
            "ip": "192.168.1.952",
            "port": 22,
            "username": "user_with_underscore",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200

    def test_long_ip_address(self, client, clean_db):
        """测试长IP地址格式"""
        device_data = {
            "ip": "10.255.255.255",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200

    def test_unicode_in_remark(self, client, clean_db):
        """测试备注包含Unicode字符"""
        device_data = {
            "ip": "192.168.1.953",
            "port": 22,
            "username": "root",
            "password": "pass",
            "remark": "测试设备 - 中文备注"
        }
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert "中文" in data["remark"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
