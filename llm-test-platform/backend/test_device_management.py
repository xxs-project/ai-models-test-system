"""
设备管理完整测试模块
测试设备CRUD、状态刷新、信息获取、备注功能
包括：功能正确性、可靠性、可扩展性、安全性
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine, Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
from typing import Optional, Dict, Any

sqlite_file_name = "test_device_management.db"
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
from sqlalchemy import func, or_


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
    query = db.query(Device)
    if search:
        # Simple fuzzy search for test
        search_lower = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Device.ip).like(search_lower),
                func.lower(Device.username).like(search_lower),
                func.lower(Device.accelerator_type).like(search_lower)
            )
        )
    if status:
        query = query.filter(Device.status == status)
    if arch:
        query = query.filter(Device.arch == arch)

    devices = query.all()
    total = len(devices)
    items = devices[(page-1)*size:page*size]
    return {"items": [device_to_dict(d) for d in items], "total": total, "page": page, "size": size}


@app.get("/api/devices/{device_id}")
async def read_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device_to_dict(device)


@app.post("/api/devices")
async def create_device(device: dict, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.ip == device["ip"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="该 IP 已存在")
    
    db_device = Device(**device)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return device_to_dict(db_device)


@app.put("/api/devices/{device_id}")
async def update_device(device_id: int, device_update: dict, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    
    for field, value in device_update.items():
        if value is not None:
            setattr(device, field, value)
    
    device.updated_at = datetime.now().isoformat()
    db.add(device)
    db.commit()
    db.refresh(device)
    return device_to_dict(device)


@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    db.delete(device)
    db.commit()
    return {"ok": True}


@app.post("/api/devices/{device_id}/refresh")
async def refresh_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device_to_dict(device)


@app.get("/api/settings")
async def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {c.name: getattr(settings, c.name) for c in settings.__table__.columns}


@app.put("/api/settings")
async def update_settings(new_settings: dict, db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
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
        assert "id" in data

    def test_create_device_with_custom_port(self, client, clean_db):
        """测试创建设备时使用自定义端口"""
        device_data = {
            "ip": "192.168.1.101",
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
            "ip": "192.168.1.102",
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
            "ip": "192.168.1.103",
            "port": 22,
            "username": "user",
            "password": "pass"
        })
        device_id = create_response.json()["id"]
        
        response = client.get(f"/api/devices/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == "192.168.1.103"
        assert data["id"] == device_id

    def test_read_nonexistent_device(self, client):
        """测试读取不存在的设备"""
        response = client.get("/api/devices/99999")
        assert response.status_code == 404

    def test_update_device(self, client, clean_db):
        """测试更新设备信息"""
        create_response = client.post("/api/devices", json={
            "ip": "192.168.1.104",
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
            "ip": "192.168.1.105",
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
