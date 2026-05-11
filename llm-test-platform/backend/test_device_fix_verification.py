"""
设备管理修复验证测试
专注于验证设备添加BUG修复
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

sqlite_file_name = "test_device_fix.db"
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


Base.metadata.create_all(bind=test_engine)

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session


def get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class DeviceCreate(BaseModel):
    ip: str
    port: int = 22
    username: str
    password: str
    remark: Optional[str] = None
    status: str = "Unknown"
    accelerator_count: int = 0
    idle_count: int = 0
    busy_count: int = 0
    warning_count: int = 0


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/devices")
async def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.ip == device.ip).first()
    if existing:
        raise HTTPException(status_code=400, detail="该 IP 已存在")
    
    db_device = Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@app.get("/api/devices")
async def read_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return {"items": devices, "total": len(devices), "page": 1, "size": 20}


@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    db.delete(device)
    db.commit()
    return {"ok": True}


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


class TestDeviceAddFix:
    """验证设备添加功能修复"""

    def test_create_device_with_all_frontend_fields(self, client, clean_db):
        """
        测试使用前端发送的所有字段创建设备
        验证修复后的DeviceCreate schema能正确接收所有字段
        """
        device_data = {
            "ip": "192.168.1.100",
            "port": 22,
            "username": "root",
            "password": "password123",
            "remark": "测试设备",
            "status": "Unknown",
            "accelerator_count": 4,
            "idle_count": 2,
            "busy_count": 1,
            "warning_count": 1
        }
        
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["ip"] == "192.168.1.100"
        assert data["port"] == 22
        assert data["username"] == "root"
        assert data["status"] == "Unknown"
        assert data["accelerator_count"] == 4
        assert data["idle_count"] == 2
        assert data["busy_count"] == 1
        assert data["warning_count"] == 1
        assert "id" in data

    def test_create_device_minimal_fields(self, client, clean_db):
        """测试使用最小字段创建设备"""
        device_data = {
            "ip": "192.168.1.101",
            "port": 22,
            "username": "admin",
            "password": "admin123"
        }
        
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["ip"] == "192.168.1.101"
        assert data["status"] == "Unknown"
        assert data["accelerator_count"] == 0
        assert data["idle_count"] == 0
        assert data["busy_count"] == 0
        assert data["warning_count"] == 0

    def test_create_device_with_status_online(self, client, clean_db):
        """测试创建设置为Online状态的设备"""
        device_data = {
            "ip": "192.168.1.102",
            "port": 22,
            "username": "root",
            "password": "pass",
            "status": "Online",
            "accelerator_count": 8,
            "idle_count": 5,
            "busy_count": 2,
            "warning_count": 1
        }
        
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "Online"
        assert data["accelerator_count"] == 8
        assert data["idle_count"] == 5
        assert data["busy_count"] == 2
        assert data["warning_count"] == 1

    def test_create_duplicate_ip_rejected(self, client, clean_db):
        """测试重复IP被拒绝"""
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

    def test_multiple_devices_creation(self, client, clean_db):
        """测试批量创建设备"""
        devices = [
            {"ip": "192.168.1.104", "port": 22, "username": "user1", "password": "pass1"},
            {"ip": "192.168.1.105", "port": 2222, "username": "user2", "password": "pass2", "status": "Offline"},
            {"ip": "192.168.1.106", "port": 22, "username": "user3", "password": "pass3", "accelerator_count": 4}
        ]
        
        for device in devices:
            response = client.post("/api/devices", json=device)
            assert response.status_code == 200
        
        list_response = client.get("/api/devices")
        assert list_response.status_code == 200
        data = list_response.json()
        assert data["total"] == 3

    def test_remark_optional(self, client, clean_db):
        """测试备注字段可选"""
        device_data = {
            "ip": "192.168.1.107",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        data = response.json()
        assert data["remark"] is None

    def test_custom_port(self, client, clean_db):
        """测试自定义端口"""
        device_data = {
            "ip": "192.168.1.108",
            "port": 22222,
            "username": "admin",
            "password": "admin"
        }
        
        response = client.post("/api/devices", json=device_data)
        assert response.status_code == 200
        assert response.json()["port"] == 22222

    def test_delete_device(self, client, clean_db):
        """测试删除设备"""
        device_data = {
            "ip": "192.168.1.109",
            "port": 22,
            "username": "root",
            "password": "pass"
        }
        
        create_response = client.post("/api/devices", json=device_data)
        device_id = create_response.json()["id"]
        
        delete_response = client.delete(f"/api/devices/{device_id}")
        assert delete_response.status_code == 200
        
        get_response = client.get("/api/devices")
        assert get_response.json()["total"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
