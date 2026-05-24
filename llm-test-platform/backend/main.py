from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select, func, or_
from sqlalchemy import Column, String, Integer, Boolean, Text, and_, or_ as sql_or_, func as sql_func
from typing import Optional, List, Dict, Any
from datetime import datetime
import threading
import json
import uuid
import re
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from models import Device, Task, Benchmark, Report, Settings, EvalTask
from schemas import DeviceCreate, DeviceUpdate, TaskCreate, TaskUpdate, BenchmarkCreate, ReportCreate, PaginatedResponse, DeviceRead
from monitor_impl import check_device

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

scheduler = BackgroundScheduler()

def refresh_all_devices():
    """刷新所有设备状态"""
    logger.info("开始刷新所有设备状态...")
    try:
        with Session(engine) as session:
            devices = session.exec(select(Device)).all()
            for device in devices:
                try:
                    updated_device = check_device(device)
                    session.add(updated_device)
                except Exception as e:
                    logger.error(f"刷新设备 {device.ip} 失败: {e}")
            session.commit()
    except Exception as e:
        logger.error(f"刷新设备状态失败: {e}")
    logger.info("设备状态刷新完成")

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def initialize_scheduler():
    """初始化调度器并启动监控任务"""
    try:
        with Session(engine) as session:
            settings = session.exec(select(Settings)).first()
            if not settings:
                settings = Settings(interval_seconds=60, auto_refresh=True)
                session.add(settings)
                session.commit()
            
            if settings.auto_refresh:
                scheduler.add_job(
                    auto_monitor_all_devices,
                    trigger=IntervalTrigger(seconds=settings.interval_seconds),
                    id='device_monitor_job',
                    name='设备状态自动监控',
                    replace_existing=True
                )
                scheduler.start()
                logger.info(f"设备自动监控任务已启动，间隔: {settings.interval_seconds}秒")
    except Exception as e:
        logger.error(f"初始化调度器失败: {e}")

def refresh_single_device(device_id):
    """刷新单个设备状态"""
    with Session(engine) as session:
        device = session.get(Device, device_id)
        if device:
            updated = check_device(device)
            session.add(updated)
            session.commit()

def auto_monitor_all_devices():
    """自动监控所有设备状态"""
    logger.info("开始自动监控所有设备状态...")
    try:
        with Session(engine) as session:
            devices = session.exec(select(Device)).all()
            for device in devices:
                try:
                    updated = check_device(device)
                    updated.updated_at = datetime.now().isoformat()
                    session.add(updated)
                except Exception as e:
                    logger.error(f"自动监控设备 {device.ip} 失败: {e}")
            session.commit()
            logger.info(f"自动监控完成，共监控 {len(devices)} 台设备")
    except Exception as e:
        logger.error(f"自动监控设备状态失败: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    initialize_scheduler()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan, title="大模型测试平台 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "大模型测试平台 API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/devices", response_model=PaginatedResponse)
async def read_devices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    arch: str = Query(None),
    acc_type: str = Query(None, description="Filter by accelerator type: HasAcc, NoAcc, Idle, Busy, Warning"),
    session: Session = Depends(get_session)
):
    """Get device list with filtering and pagination support.
    
    Args:
        page: Page number (1-based)
        size: Items per page
        search: Search by IP, username, or accelerator type
        status: Filter by device status (Online, Offline, Error, Unknown)
        arch: Filter by architecture (x86_64, aarch64)
        acc_type: Filter by accelerator status (HasAcc, NoAcc, Idle, Busy, Warning)
    """
    statement = select(Device)
    
    if search:
        search_lower = search.lower()
        statement = statement.where(
            or_(
                func.lower(Device.ip).contains(search_lower),
                func.lower(Device.username).contains(search_lower),
                func.lower(Device.accelerator_type).contains(search_lower)
            )
        )
    if status:
        statement = statement.where(Device.status == status)
    if arch:
        statement = statement.where(Device.arch == arch)
    if acc_type:
        if acc_type == "HasAcc":
            statement = statement.where(Device.accelerator_count > 0)
        elif acc_type == "NoAcc":
            statement = statement.where(Device.accelerator_count == 0)
        elif acc_type == "Idle":
            statement = statement.where(Device.idle_count > 0)
        elif acc_type == "Busy":
            statement = statement.where(Device.busy_count > 0)
        elif acc_type == "Warning":
            statement = statement.where(Device.warning_count > 0)
    
    # Get total count with filters
    total = session.exec(select(func.count()).select_from(statement.subquery())).one()
    
    # Get paginated results
    statement = statement.offset((page - 1) * size).limit(size)
    devices = session.exec(statement).all()
    
    # Include password in response so frontend can display it when requested
    items = []
    for d in devices:
        d_dict = d.model_dump()
        items.append(d_dict)
    
    return {"items": items, "total": total, "page": page, "size": size}

# ========== 设备导入导出功能 (必须放在 /api/devices/{device_id} 之前) ==========

from fastapi.responses import StreamingResponse
from fastapi import UploadFile
import csv
import io
from pydantic import BaseModel

class DeviceImportItem(BaseModel):
    ip: str
    port: int = 22
    username: str
    password: str
    remark: Optional[str] = None

@app.get("/api/devices/export")
async def export_devices(
    session: Session = Depends(get_session)
):
    """导出所有设备"""
    try:
        devices = session.exec(select(Device)).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow(['ID', 'IP地址', '端口', '用户名', '密码', '状态', '操作系统', '架构', 
                        '加速卡类型', '加速卡数量', '闲置卡数', '忙碌卡数', '异常卡数', '备注'])
        
        # 写入数据
        for device in devices:
            writer.writerow([
                device.id,
                device.ip,
                device.port,
                device.username,
                device.password,
                device.status,
                device.os_info or '',
                device.arch or '',
                device.accelerator_type or '',
                device.accelerator_count,
                device.idle_count,
                device.busy_count,
                device.warning_count,
                device.remark or ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=devices_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except Exception as e:
        logger.error(f"导出设备失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@app.get("/api/devices/template")
async def download_device_template():
    """下载设备导入模板"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # 写入表头
    writer.writerow(['IP地址', '端口', '用户名', '密码', '备注'])
    # 写入示例数据
    writer.writerow(['192.168.1.100', '22', 'root', 'password123', '测试服务器'])
    writer.writerow(['192.168.1.101', '22', 'admin', 'admin456', '生产服务器'])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=device_template.csv"}
    )

@app.post("/api/devices/import")
async def import_devices(
    file: UploadFile,
    session: Session = Depends(get_session)
):
    """导入设备列表"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8-sig')
        csv_reader = csv.reader(io.StringIO(content_str))

        header = next(csv_reader, None)
        if not header:
            raise HTTPException(status_code=400, detail="CSV文件为空或格式错误")

        header_map = {}
        for idx, col in enumerate(header):
            col_lower = col.strip().lower()
            if 'ip' in col_lower or '地址' in col_lower:
                header_map['ip'] = idx
            elif '端口' in col_lower or 'port' in col_lower:
                header_map['port'] = idx
            elif '用户' in col_lower or 'username' in col_lower:
                header_map['username'] = idx
            elif '密码' in col_lower or 'password' in col_lower:
                header_map['password'] = idx
            elif '备注' in col_lower or 'remark' in col_lower:
                header_map['remark'] = idx

        required_cols = ['ip', 'username', 'password']
        for col in required_cols:
            if col not in header_map:
                raise HTTPException(status_code=400, detail=f"CSV缺少必要列: {col}")

        imported_count = 0
        failed_count = 0
        failed_rows = []
        imported_devices = []

        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'

        for row_num, row in enumerate(csv_reader, start=2):
            try:
                if len(row) <= max(header_map.values()):
                    failed_rows.append(f"第{row_num}行: 数据列数不足")
                    failed_count += 1
                    continue

                ip = row[header_map['ip']].strip()
                port = int(row[header_map['port']].strip()) if 'port' in header_map and row[header_map['port']].strip() else 22
                username = row[header_map['username']].strip()
                password = row[header_map['password']].strip()
                remark = row[header_map['remark']].strip() if 'remark' in header_map and len(row) > header_map['remark'] else None

                if not ip:
                    failed_rows.append(f"第{row_num}行: IP地址不能为空")
                    failed_count += 1
                    continue

                if not re.match(ip_pattern, ip):
                    failed_rows.append(f"第{row_num}行: IP格式无效 {ip}")
                    failed_count += 1
                    continue

                if not username:
                    failed_rows.append(f"第{row_num}行: 用户名不能为空")
                    failed_count += 1
                    continue

                existing = session.exec(select(Device).where(Device.ip == ip)).first()
                if existing:
                    failed_rows.append(f"第{row_num}行: IP已存在 {ip}")
                    failed_count += 1
                    continue

                device = Device(
                    ip=ip,
                    port=port,
                    username=username,
                    password=password,
                    remark=remark,
                    status='Unknown',
                    accelerator_count=0,
                    idle_count=0,
                    busy_count=0,
                    warning_count=0
                )
                session.add(device)
                imported_devices.append(device)
                imported_count += 1

            except Exception as e:
                failed_rows.append(f"第{row_num}行: {str(e)}")
                failed_count += 1

        session.commit()

        for device in imported_devices:
            try:
                device_id = device.id
                threading.Thread(target=lambda d_id=device_id: refresh_single_device(d_id), args=(device_id,)).start()
            except Exception as e:
                logger.warning(f"启动设备 {device.ip} 状态检查失败: {e}")

        return {
            "success": True,
            "imported_count": imported_count,
            "failed_count": failed_count,
            "failed_rows": failed_rows
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导入设备失败: {e}")
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

# ========== 动态路由放在静态路由之后 ==========

@app.get("/api/devices/{device_id}", response_model=DeviceRead)
async def read_device(device_id: int, session: Session = Depends(get_session)):
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device

@app.post("/api/devices", response_model=DeviceRead)
async def create_device(device: DeviceCreate, session: Session = Depends(get_session)):
    """Create a new device and trigger initial status check.

    Args:
        device: Device creation data

    Returns:
        Created device with ID
    """
    try:
        import re
        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        if not re.match(ip_pattern, device.ip):
            raise HTTPException(status_code=400, detail="无效的IP地址格式")

        if device.port < 1 or device.port > 65535:
            raise HTTPException(status_code=400, detail="端口号必须在1-65535之间")

        existing = session.exec(select(Device).where(Device.ip == device.ip)).first()
        if existing:
            raise HTTPException(status_code=400, detail="该 IP 已存在")

        db_device = Device(**device.model_dump())
        session.add(db_device)
        session.commit()
        session.refresh(db_device)

        logger.info(f"Device created: {device.ip}, triggering background check")
        threading.Thread(target=lambda: refresh_single_device(db_device.id)).start()

        response_device = db_device.model_dump()
        return response_device
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create device: {e}")
        raise HTTPException(status_code=500, detail=f"创建设备失败: {str(e)}")

@app.put("/api/devices/{device_id}", response_model=DeviceRead)
async def update_device(
    device_id: int,
    device_update: DeviceUpdate,
    session: Session = Depends(get_session)
):
    db_device = session.get(Device, device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="设备不存在")
    
    update_data = device_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(db_device, field, value)
    
    db_device.updated_at = datetime.now().isoformat()
    session.add(db_device)
    session.commit()
    session.refresh(db_device)
    return db_device

@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: int, session: Session = Depends(get_session)):
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    session.delete(device)
    session.commit()
    return {"ok": True}

@app.post("/api/devices/{device_id}/refresh", response_model=DeviceRead)
async def refresh_device(device_id: int, session: Session = Depends(get_session)):
    """Manually refresh device status and accelerator information.
    
    Args:
        device_id: Device ID to refresh
        
    Returns:
        Updated device with latest status
    """
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    
    try:
        logger.info(f"Manually refreshing device: {device.ip}")
        updated_device = check_device(device)
        session.add(updated_device)
        session.commit()
        session.refresh(updated_device)
        logger.info(f"Device {device.ip} refreshed successfully: {updated_device.status}")
        return updated_device
    except Exception as e:
        logger.error(f"Failed to refresh device {device.ip}: {e}")
        raise HTTPException(status_code=500, detail=f"刷新设备失败: {str(e)}")

@app.get("/api/tasks", response_model=PaginatedResponse)
async def read_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    test_type: str = Query(None),
    test_mode: str = Query(None),
    session: Session = Depends(get_session)
):
    statement = select(Task)
    
    if search:
        search_lower = search.lower()
        statement = statement.where(func.lower(Task.task_name) == search_lower)
    if status:
        statement = statement.where(Task.status == int(status))
    if test_type:
        statement = statement.where(Task.test_type == int(test_type))
    if test_mode:
        statement = statement.where(Task.test_mode == int(test_mode))
    
    total = session.exec(select(func.count()).select_from(statement.subquery())).one()
    statement = statement.offset((page - 1) * size).limit(size)
    tasks = session.exec(statement).all()
    
    return {"items": tasks, "total": total, "page": page, "size": size}

@app.get("/api/tasks/{task_id}")
async def read_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

@app.post("/api/tasks")
async def create_task(task: TaskCreate, session: Session = Depends(get_session)):
    db_task = Task(**task.model_dump(), status=0, progress=0)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    session: Session = Depends(get_session)
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(db_task, field, value)
    
    db_task.updated_at = datetime.now().isoformat()
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    session.delete(task)
    session.commit()
    return {"ok": True}

@app.post("/api/tasks/{task_id}/check")
async def check_task_executable(task_id: int, session: Session = Depends(get_session)):
    """
    检查任务是否可以执行
    
    在真正执行前进行预检，检查设备连接、路径等
    """
    from services.task_checker import TaskExecutionChecker
    
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 获取设备信息
    device_info = None
    if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
        import urllib.parse
        parsed_url = urllib.parse.urlparse(task.base_url) if task.base_url else None
        api_ip = parsed_url.hostname if parsed_url and parsed_url.hostname else (task.base_url.split('://')[-1].split(':')[0].split('/')[0] if task.base_url else '')
        api_password = task.api_key or ''
        device_info = {
            'ip': api_ip,
            'port': 22,
            'username': 'root',
            'password': api_password
        }

    if not device_info and task.device_id:
        device = session.get(Device, task.device_id)
        if device:
            device_info = {
                'ip': device.ip,
                'port': device.port,
                'username': device.username,
                'password': device.password
            }
    
    if not device_info and task.device_ip:
        device_info = {
            'ip': task.device_ip,
            'port': 22,
            'username': task.device_username or 'root',
            'password': task.device_password or ''
        }
    
    if not device_info:
        raise HTTPException(status_code=400, detail="没有可用的设备信息")
    
    # 执行任务预检
    task_data = {
        'task_name': task.task_name,
        'model_path': task.model_path,
        'inference_framework': task.inference_framework,
    }
    
    checker = TaskExecutionChecker()
    success, error_msg = checker.preflight_check(task_data, device_info)
    
    if success:
        # 进一步检查
        import paramiko
        try:
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh_client.connect(
                hostname=device_info['ip'],
                port=device_info['port'],
                username=device_info['username'],
                password=device_info['password'],
                timeout=10
            )
            
            # 检查脚本目录
            script_ok, script_error = checker.check_script_directory(ssh_client, task.script_path or '/home/user/scripts')
            
            # 检查模型路径
            model_ok, model_error = checker.check_model_path(ssh_client, task.model_path)
            
            # 检查NPU资源
            npu_ok, npu_error, available_npus = checker.check_npu_resources(ssh_client, task.npu_count or 1)
            
            ssh_client.close()
            
            warnings = []
            if not script_ok:
                warnings.append(f"脚本目录问题: {script_error}")
            if model_error:
                warnings.append(f"模型路径问题: {model_error}")
            if npu_error:
                warnings.append(f"NPU资源问题: {npu_error}")
            
            return {
                "executable": True,
                "message": "任务可以执行" + (f"，但有警告: {'; '.join(warnings)}" if warnings else ""),
                "warnings": warnings,
                "device_ip": device_info['ip'],
                "available_npus": available_npus
            }
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"执行前检查失败: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail=f"任务检查未通过: {error_msg}")


@app.post("/api/tasks/{task_id}/execute")
async def execute_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status not in [0, 1]:
        raise HTTPException(status_code=400, detail="任务当前状态不能执行")
    
    # 执行前检查
    from services.task_checker import TaskExecutionChecker
    
    device_info = None
    if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
        import urllib.parse
        parsed_url = urllib.parse.urlparse(task.base_url) if task.base_url else None
        api_ip = parsed_url.hostname if parsed_url and parsed_url.hostname else (task.base_url.split('://')[-1].split(':')[0].split('/')[0] if task.base_url else '')
        api_password = task.api_key or ''
        device_info = {
            'ip': api_ip,
            'port': 22,
            'username': 'root',
            'password': api_password
        }

    if not device_info and task.device_id:
        device = session.get(Device, task.device_id)
        if device:
            device_info = {
                'ip': device.ip,
                'port': device.port,
                'username': device.username,
                'password': device.password
            }
    
    if not device_info and task.device_ip:
        device_info = {
            'ip': task.device_ip,
            'port': 22,
            'username': task.device_username or 'root',
            'password': task.device_password or ''
        }
    
    if device_info:
        task_data = {
            'task_name': task.task_name,
            'model_path': task.model_path,
            'inference_framework': task.inference_framework,
        }
        
        checker = TaskExecutionChecker()
        success, error_msg = checker.preflight_check(task_data, device_info)
        
        if not success:
            task.status = 5  # FAILED - 失败
            task.error_message = f"执行前检查失败: {error_msg}"
            task.end_time = datetime.now().isoformat()
            session.add(task)
            session.commit()
            raise HTTPException(status_code=400, detail=task.error_message)

    task.status = 2  # RUNNING - 执行中
    task.start_time = datetime.now().isoformat()
    task.progress = 10
    session.add(task)
    session.commit()
    session.refresh(task)
    
    threading.Thread(target=execute_task_background, args=(task_id,)).start()
    
    return task

@app.post("/api/tasks/{task_id}/cancel")
async def cancel_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.status = 6  # CANCELLED - 已取消
    task.end_time = datetime.now().isoformat()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.post("/api/tasks/{task_id}/auto-import")
async def auto_import_task_result(task_id: int, session: Session = Depends(get_session)):
    """
    自动导入测试任务结果到基准测试列表

    支持单模型性能测试和全套模型性能测试两种模式
    """
    try:
        from services.auto_import_service import auto_import_task_result
        from services.command_builder import TaskStatus

        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        # 检查任务是否完成
        if task.status != TaskStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="任务未完成，无法导入")

        # 执行自动导入
        result = await auto_import_task_result(session, task_id)

        return {
            "success": True,
            "message": result.get('message', '导入成功'),
            "data": result
        }

    except FileNotFoundError as e:
        logger.error(f"自动导入失败 - 文件不存在: {e}")
        raise HTTPException(status_code=404, detail=f"结果文件不存在: {str(e)}")
    except ValueError as e:
        logger.error(f"自动导入失败 - 验证错误: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"自动导入失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

def execute_task_background(task_id):
    import os
    """
    后台执行测试任务（增强版）

    支持实时监控任务执行状态：
    1. 获取任务和设备信息
    2. 建立SSH连接
    3. 构建测试命令
    4. 在远程设备上后台启动测试脚本
    5. 监控脚本执行状态（每分钟更新）
    6. 状态变更：RUNNING(2) -> TESTING(3) -> COMPLETED(4)/FAILED(5)
    7. 收集执行结果和日志
    """
    import time
    import paramiko
    import socket
    from services.command_builder import CommandBuilder, TaskStatus
    from services.task_monitor import RemoteScriptExecutor, get_task_monitor

    # 增加详细日志
    logger.info("=" * 80)
    logger.info(f"开始执行任务 {task_id}")
    logger.info("=" * 80)

    with Session(engine) as session:
        task = session.get(Task, task_id)
        if not task:
            logger.error(f"任务 {task_id} 不存在")
            return

        # 记录任务基本信息
        logger.info(f"任务基本信息:")
        logger.info(f"  名称: {task.task_name}")
        logger.info(f"  类型: {task.test_type} (1=性能测试, 2=精度测试)")
        logger.info(f"  模式: {task.test_mode} (1=单模型, 2=全套模型)")
        logger.info(f"  框架: {task.inference_framework}")
        logger.info(f"  模型: {task.model_name}")

        # 记录设备信息
        logger.info(f"设备信息:")
        logger.info(f"  device_id: {task.device_id}")
        logger.info(f"  device_ip: {task.device_ip}")
        logger.info(f"  device_username: {task.device_username}")
        logger.info(f"  device_password: {'存在' if task.device_password else '缺失'}")

        # 记录配置信息
        logger.info(f"配置信息:")
        logger.info(f"  script_path: {task.script_path}")
        logger.info(f"  model_path: {task.model_path}")
        logger.info(f"  framework_version: {task.framework_version}")
        logger.info(f"  npu_count: {task.npu_count}")
        logger.info(f"  graph_mode: {task.graph_mode}")
        logger.info(f"  execution_flag: {task.execution_flag}")

        try:
            # 1. 获取设备信息
            device_info = None
            
            # API模式下设备IP来自base_url，密码来自api_key
            if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
                import urllib.parse
                parsed_url = urllib.parse.urlparse(task.base_url)
                api_ip = parsed_url.hostname if parsed_url.hostname else task.base_url.split('://')[-1].split(':')[0].split('/')[0]
                api_password = task.api_key
                logger.info(f"API模式，从配置解析目标机器 IP: {api_ip}")
                
                device_info = {
                    'ip': api_ip,
                    'port': 22,
                    'username': 'root', # 默认root
                    'password': api_password
                }
            
            if not device_info and task.device_id:
                device = session.get(Device, task.device_id)
                if device:
                    device_info = {
                        'ip': device.ip,
                        'port': device.port,
                        'username': device.username,
                        'password': device.password
                    }
                    logger.info(f"使用设备列表中的设备: {device.ip}")

            # 如果没有设备ID，使用任务中手动填写的设备信息
            if not device_info:
                if task.device_ip:
                    logger.info(f"尝试使用手动设备信息: IP={task.device_ip}, Username={task.device_username}")

                    # 验证必要字段
                    if not task.device_username:
                        logger.error(f"手动设备信息不完整: username缺失")
                        raise Exception("手动设备信息不完整: 缺少用户名")

                    if not task.device_password:
                        logger.error(f"手动设备信息不完整: password缺失")
                        raise Exception("手动设备信息不完整: 缺少密码")

                    device_info = {
                        'ip': task.device_ip,
                        'port': 22,
                        'username': task.device_username,
                        'password': task.device_password
                    }
                    logger.info(f"使用手动填写的设备: {task.device_ip}")
                else:
                    logger.error("没有可用的设备信息: device_id和device_ip都为空")
                    raise Exception("没有可用的设备信息: 请选择设备或手动填写设备信息")

            if not device_info:
                raise Exception("没有可用的设备信息")

            # 2. 建立SSH连接
            logger.info(f"尝试连接到设备: {device_info['ip']}:{device_info['port']}, 用户: {device_info['username']}")
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            try:
                ssh_client.connect(
                    hostname=device_info['ip'],
                    port=device_info['port'],
                    username=device_info['username'],
                    password=device_info['password'],
                    timeout=30,
                    allow_agent=False,
                    look_for_keys=False
                )
                logger.info(f"SSH连接成功: {device_info['ip']}")

                # 测试执行命令
                logger.info("测试执行命令: 'hostname'")
                stdin, stdout, stderr = ssh_client.exec_command('hostname')
                hostname = stdout.read().decode().strip()
                logger.info(f"远程主机名: {hostname}")

            except paramiko.AuthenticationException as e:
                error_msg = f"SSH认证失败: 用户名或密码错误 (IP: {device_info['ip']}, 用户: {device_info['username']})"
                logger.error(error_msg)
                raise Exception(error_msg)
            except paramiko.SSHException as e:
                error_msg = f"SSH连接异常: {str(e)} (IP: {device_info['ip']})"
                logger.error(error_msg)
                raise Exception(error_msg)
            except socket.timeout as e:
                error_msg = f"SSH连接超时: 无法在30秒内连接到 {device_info['ip']}:{device_info['port']}"
                logger.error(error_msg)
                raise Exception(error_msg)
            except socket.gaierror as e:
                error_msg = f"DNS解析失败: 无法解析主机名 {device_info['ip']}"
                logger.error(error_msg)
                raise Exception(error_msg)
            except Exception as e:
                error_msg = f"SSH连接失败: {str(e)} (IP: {device_info['ip']})"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # 3. 准备任务数据
            task_data = {
                'id': task.id,
                'task_name': task.task_name,
                'test_type': task.test_type,
                'test_mode': task.test_mode,
                'startup_mode': task.startup_mode,
                'base_url': task.base_url,
                'api_key': task.api_key,
                'parameter_combination': task.parameter_combination,
                'processor_type': task.processor_type,
                'inference_framework': task.inference_framework,
                'framework_version': task.framework_version,
                'model_path': task.model_path,
                'model_name': task.model_name,
                'npu_count': task.npu_count,
                'graph_mode': task.graph_mode,
                'execution_flag': task.execution_flag or '1',
                'dataset_name': task.dataset_name,
                'dataset_args': task.dataset_args,
            }
            
            # 4. 构建测试命令
            try:
                command = CommandBuilder.build_command(task_data)
                logger.info(f"构建的命令: {command[:100]}...")
            except Exception as e:
                raise Exception(f"构建命令失败: {str(e)}")
            
            # 5. 进入测试脚本目录
            script_path = task.script_path or '/home/user/scripts'
            logger.info(f"验证脚本路径: {script_path}")

            # 验证脚本路径存在
            stdin, stdout, stderr = ssh_client.exec_command(f'test -d {script_path} && echo "exists" || echo "not_exists"')
            path_check = stdout.read().decode().strip()

            if path_check == "not_exists":
                error_msg = f"脚本目录不存在: {script_path}"
                logger.error(error_msg)
                raise Exception(error_msg)


            logger.info(f"[OK] 脚本路径存在: {script_path}")

            # ----- ADDED CODE: 拷贝 perf_test 目录到远端 -----
            local_perf_test_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'perf_test')
            if os.path.exists(local_perf_test_dir):
                logger.info(f"打包本地 perf_test 目录: {local_perf_test_dir}")
                tar_cmd = f"cd {os.path.dirname(local_perf_test_dir)} && tar -czf /tmp/perf_test.tar.gz {os.path.basename(local_perf_test_dir)}"
                os.system(tar_cmd)
                
                logger.info("通过SFTP上传 perf_test.tar.gz 到目标机器")
                sftp = ssh_client.open_sftp()
                sftp.put("/tmp/perf_test.tar.gz", f"{script_path}/perf_test.tar.gz")
                sftp.close()
                
                logger.info("在目标机器上解压 perf_test.tar.gz")
                stdin, stdout, stderr = ssh_client.exec_command(f"cd {script_path} && tar -xzf perf_test.tar.gz")
                # Wait for command to finish
                exit_status = stdout.channel.recv_exit_status()
                if exit_status != 0:
                    err = stderr.read().decode()
                    logger.warning(f"解压可能遇到问题: {err}")
                else:
                    logger.info("解压 perf_test 完成")
            else:
                logger.warning(f"本地未找到 perf_test 目录: {local_perf_test_dir}，跳过拷贝")
            # --------------------------------------------------

            # 验证模型路径存在

            model_path = task.model_path
            logger.info(f"验证模型路径: {model_path}")

            stdin, stdout, stderr = ssh_client.exec_command(f'test -d {model_path} && echo "exists" || echo "not_exists"')
            model_check = stdout.read().decode().strip()

            if model_check == "not_exists":
                error_msg = f"模型路径不存在: {model_path}"
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(f"[OK] 模型路径存在: {model_path}")

            # 进入脚本目录
            stdin, stdout, stderr = ssh_client.exec_command(f'cd {script_path} && pwd')
            exit_status = stdout.channel.recv_exit_status()

            if exit_status != 0:
                error_msg = stderr.read().decode()
                raise Exception(f"无法进入脚本目录 {script_path}: {error_msg}")

            logger.info(f"[OK] 成功进入脚本目录: {script_path}")
            
            # 6. 生成日志和PID文件路径
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_file = f"/tmp/task_{task_id}_{timestamp}.log"
            pid_file = f"/tmp/task_{task_id}_{timestamp}.pid"
            
            # 7. 在远程设备上后台启动测试脚本
            logger.info("在远程设备上启动后台测试脚本")
            executor = RemoteScriptExecutor()
            success, pid, message = executor.execute_in_background(
                ssh_client=ssh_client,
                script_path=script_path,
                command=command,
                log_file=log_file,
                pid_file=pid_file
            )
            
            if not success:
                raise Exception(f"启动测试脚本失败: {message}")
            
            logger.info(f"测试脚本已启动，{message}")
            
            # 8. 更新任务状态为 TESTING（测试中）
            task.status = TaskStatus.TESTING  # 3 - 测试中
            task.progress = 10
            task.start_time = datetime.now().isoformat()
            task.error_message = f"测试正在设备上运行，PID: {pid}, 日志: {log_file}"
            session.add(task)
            session.commit()
            
            # 9. 设置状态更新回调函数
            def status_callback(tid, status, message):
                """状态变更回调"""
                try:
                    with Session(engine) as update_session:
                        t = update_session.get(Task, tid)
                        if t:
                            t.status = status
                            t.updated_at = datetime.now().isoformat()
                            if message:
                                t.error_message = message
                            # 任务完成时设置结束时间
                            if status == TaskStatus.COMPLETED:
                                t.end_time = datetime.now().isoformat()
                            update_session.add(t)
                            update_session.commit()
                            logger.info(f"任务 {tid} 状态更新为 {status}: {message}")

                            # 任务成功完成时，自动导入测试结果
                            if status == TaskStatus.COMPLETED:
                                try:
                                    logger.info(f"任务 {tid} 已完成，开始自动导入测试结果...")
                                    from services.auto_import_service import auto_import_task_result
                                    import asyncio

                                    # 在后台执行自动导入（不阻塞状态更新）
                                    async def do_auto_import():
                                        try:
                                            result = await auto_import_task_result(update_session, tid)
                                            logger.info(f"任务 {tid} 自动导入成功: {result.get('message', '成功')}")
                                        except Exception as import_error:
                                            logger.error(f"任务 {tid} 自动导入失败: {import_error}")

                                    # 创建新的事件循环来运行异步任务
                                    try:
                                        loop = asyncio.get_event_loop()
                                        if loop.is_running():
                                            # 如果事件循环已在运行，使用 create_task
                                            asyncio.create_task(do_auto_import())
                                        else:
                                            # 否则运行直到完成
                                            loop.run_until_complete(do_auto_import())
                                    except RuntimeError:
                                        # 没有事件循环，创建一个新的
                                        asyncio.run(do_auto_import())
                                except Exception as auto_import_error:
                                    logger.error(f"启动自动导入失败: {auto_import_error}")
                except Exception as e:
                    logger.error(f"更新任务 {tid} 状态时出错: {e}")
            
            def progress_callback(tid, progress):
                """进度更新回调"""
                try:
                    with Session(engine) as update_session:
                        t = update_session.get(Task, tid)
                        if t:
                            t.progress = progress
                            t.updated_at = datetime.now().isoformat()
                            update_session.add(t)
                            update_session.commit()
                except Exception as e:
                    logger.error(f"更新任务 {tid} 进度时出错: {e}")
            
            # 10. 启动任务监控（每分钟检查一次）
            monitor = get_task_monitor()
            monitor.start_monitoring(
                task_id=task_id,
                ssh_client=ssh_client,
                script_path=script_path,
                command=command,
                log_file=log_file,
                pid_file=pid_file,
                status_callback=status_callback,
                progress_callback=progress_callback
            )
            
            logger.info(f"任务 {task_id} 监控已启动，将每分钟检查执行状态")
            
        except Exception as e:
            logger.error(f"任务 {task_id} 执行异常: {str(e)}")
            task.status = TaskStatus.FAILED  # 5 - 失败
            task.progress = 0
            task.end_time = datetime.now().isoformat()
            task.error_message = str(e)[:500]
            session.add(task)
            session.commit()

@app.get("/api/benchmarks", response_model=PaginatedResponse)
async def read_benchmarks(
    page: int = Query(1, ge=1),
    size: int = Query(1000, ge=1, le=10000),
    search: str = Query(None),
    framework: str = Query(None),
    model_name: str = Query(None),
    submitter: str = Query(None),
    serverName: str = Query(None),
    shardingConfig: str = Query(None),
    chipName: str = Query(None),
    frameworkVersion: str = Query(None),
    operatorAcceleration: str = Query(None),
    notes: str = Query(None),
    frameworkParams: str = Query(None),
    graphMode: str = Query(None),
    startDate: str = Query(None),
    endDate: str = Query(None),
    session: Session = Depends(get_session)
):
    statement = select(Benchmark)
    
    if search:
        search_lower = search.lower()
        statement = statement.where(
            or_(
                func.lower(Benchmark.unique_id).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.modelName')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.serverName')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.chipName')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.framework')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.shardingConfig')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.submitter')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.operatorAcceleration')).contains(search_lower),
                func.lower(func.json_extract(Benchmark.config, '$.graphMode')).contains(search_lower)
            )
        )
    
    if framework:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.framework')) == framework.lower())
    
    if model_name:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.modelName')).contains(model_name.lower()))
    
    if submitter:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.submitter')).contains(submitter.lower()))
    
    if serverName:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.serverName')).contains(serverName.lower()))
    
    if shardingConfig:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.shardingConfig')).contains(shardingConfig.lower()))
    
    if chipName:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.chipName')).contains(chipName.lower()))
    
    if frameworkVersion:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.frameworkVersion')).contains(frameworkVersion.lower()))
    
    if operatorAcceleration:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.operatorAcceleration')).contains(operatorAcceleration.lower()))
    
    if notes:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.notes')).contains(notes.lower()))
    
    if frameworkParams:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.frameworkParams')).contains(frameworkParams.lower()))
    
    if graphMode:
        statement = statement.where(func.lower(func.json_extract(Benchmark.config, '$.graphMode')).contains(graphMode.lower()))
    
    if startDate:
        statement = statement.where(func.json_extract(Benchmark.config, '$.testDate') >= startDate)
    
    if endDate:
        statement = statement.where(func.json_extract(Benchmark.config, '$.testDate') <= endDate)
    
    # Sort by created_at descending (newest first)
    statement = statement.order_by(Benchmark.created_at.desc())

    total = session.exec(select(func.count()).select_from(statement.subquery())).one()
    statement = statement.offset((page - 1) * size).limit(size)
    benchmarks = session.exec(statement).all()
    
    return {"items": benchmarks, "total": total, "page": page, "size": size}

@app.get("/api/benchmarks/{benchmark_id}")
async def read_benchmark(benchmark_id: int, session: Session = Depends(get_session)):
    benchmark = session.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(status_code=404, detail="基准测试不存在")
    return benchmark

@app.post("/api/benchmarks")
async def create_benchmark(benchmark: BenchmarkCreate, session: Session = Depends(get_session)):
    unique_id = f"BM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    db_benchmark = Benchmark(
        unique_id=unique_id,
        config=benchmark.config.model_dump() if hasattr(benchmark.config, 'model_dump') else dict(benchmark.config),
        metrics=[m.model_dump() if hasattr(m, 'model_dump') else dict(m) for m in benchmark.metrics]
    )
    session.add(db_benchmark)
    session.commit()
    session.refresh(db_benchmark)
    return db_benchmark

@app.put("/api/benchmarks/{benchmark_id}")
async def update_benchmark(
    benchmark_id: int,
    benchmark: BenchmarkCreate,
    session: Session = Depends(get_session)
):
    db_benchmark = session.get(Benchmark, benchmark_id)
    if not db_benchmark:
        raise HTTPException(status_code=404, detail="基准测试不存在")
    
    db_benchmark.config = benchmark.config.model_dump() if hasattr(benchmark.config, 'model_dump') else dict(benchmark.config)
    db_benchmark.metrics = [m.model_dump() if hasattr(m, 'model_dump') else dict(m) for m in benchmark.metrics]
    
    session.commit()
    session.refresh(db_benchmark)
    return db_benchmark

@app.delete("/api/benchmarks/{benchmark_id}")
async def delete_benchmark(benchmark_id: int, session: Session = Depends(get_session)):
    benchmark = session.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(status_code=404, detail="基准测试不存在")
    session.delete(benchmark)
    session.commit()
    return {"ok": True}

@app.get("/api/reports")
async def read_reports(session: Session = Depends(get_session)):
    reports = session.exec(select(Report).order_by(Report.created_at)).all()
    return reports

@app.post("/api/reports/check")
async def check_existing_report(
    data: Dict[str, int],
    session: Session = Depends(get_session)
):
    benchmark_id1 = data.get("benchmark_id1")
    benchmark_id2 = data.get("benchmark_id2")
    
    if not benchmark_id1 or not benchmark_id2:
        raise HTTPException(status_code=400, detail="需要提供 benchmark_id1 和 benchmark_id2")
    
    report = session.exec(
        select(Report).where(
            ((Report.benchmark_id1 == benchmark_id1) & (Report.benchmark_id2 == benchmark_id2)) |
            ((Report.benchmark_id1 == benchmark_id2) & (Report.benchmark_id2 == benchmark_id1))
        )
    ).first()
    
    if report:
        return {"exists": True, "report": report}
    return {"exists": False}

@app.post("/api/reports")
async def create_report(report: ReportCreate, session: Session = Depends(get_session)):
    unique_id = f"RP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    db_report = Report(
        unique_id=unique_id,
        **report.model_dump()
    )
    session.add(db_report)
    session.commit()
    session.refresh(db_report)
    return db_report

@app.put("/api/reports/{report_id}")
async def update_report(
    report_id: int,
    report_update: ReportCreate,
    session: Session = Depends(get_session)
):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report.benchmark_id1 = report_update.benchmark_id1
    report.benchmark_id2 = report_update.benchmark_id2
    report.model_name1 = report_update.model_name1
    report.model_name2 = report_update.model_name2
    report.summary = report_update.summary
    
    session.commit()
    session.refresh(report)
    return report

@app.delete("/api/reports/{report_id}")
async def delete_report(report_id: int, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    session.delete(report)
    session.commit()
    return {"ok": True}

@app.get("/api/settings")
async def get_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(Settings)).first()
    if not settings:
        settings = Settings(interval_seconds=60, auto_refresh=True)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@app.put("/api/settings")
async def update_settings(
    new_settings: dict,
    session: Session = Depends(get_session)
):
    settings = session.exec(select(Settings)).first()
    if not settings:
        settings = Settings(interval_seconds=60, auto_refresh=True)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    
    if 'interval_seconds' in new_settings:
        settings.interval_seconds = new_settings['interval_seconds']
    if 'auto_refresh' in new_settings:
        settings.auto_refresh = new_settings['auto_refresh']
    if 'notifications_enabled' in new_settings:
        settings.notifications_enabled = new_settings['notifications_enabled']
    
    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    # 如果自动刷新设置改变，更新调度器
    if 'auto_refresh' in new_settings or 'interval_seconds' in new_settings:
        try:
            scheduler.remove_job('device_monitor_job')
        except:
            pass
        
        if settings.auto_refresh:
            scheduler.add_job(
                refresh_all_devices,
                trigger=IntervalTrigger(seconds=settings.interval_seconds),
                id='device_monitor_job',
                name='设备状态监控',
                replace_existing=True
            )
            logger.info(f"设备监控任务已更新，间隔: {settings.interval_seconds}秒")

    return settings


# ========== 任务执行状态监控API ==========

@app.get("/api/tasks/{task_id}/status")
async def get_task_execution_status(task_id: int, session: Session = Depends(get_session)):
    """
    获取任务执行状态（实时监控）

    返回任务当前状态、进度、设备执行信息等
    """
    from services.task_monitor import get_task_monitor
    from services.command_builder import TaskStatus

    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取基础信息
    status_info = {
        "task_id": task.id,
        "task_name": task.task_name,
        "status": task.status,
        "status_name": TaskStatus(task.status).name if 0 <= task.status <= 7 else "UNKNOWN",
        "progress": task.progress,
        "start_time": task.start_time,
        "end_time": task.end_time,
        "error_message": task.error_message,
        "updated_at": task.updated_at,
    }

    # 如果任务正在监控中，获取更详细的信息
    monitor = get_task_monitor()
    monitored_tasks = monitor.get_monitored_tasks()

    if task_id in monitored_tasks:
        task_info = monitored_tasks[task_id]
        status_info["monitor_status"] = {
            "is_monitoring": True,
            "monitor_status": task_info.get('status').name if task_info.get('status') else None,
            "start_time": task_info.get('start_time').isoformat() if task_info.get('start_time') else None,
            "last_check_time": task_info.get('last_check_time').isoformat() if task_info.get('last_check_time') else None,
            "log_file": task_info.get('log_file'),
            "pid_file": task_info.get('pid_file'),
        }
    else:
        status_info["monitor_status"] = {
            "is_monitoring": False,
        }

    return status_info


@app.get("/api/tasks/{task_id}/logs")
async def get_task_logs(
    task_id: int,
    lines: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    """
    获取任务执行日志

    从远程设备读取测试脚本的执行日志
    """
    from services.command_builder import TaskStatus
    import paramiko

    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 只有正在执行或已完成的任务才能查看日志
    if task.status not in [TaskStatus.TESTING, TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.TIMEOUT]:
        return {"logs": [], "message": "任务尚未开始执行或正在准备中"}

    # 获取设备信息
    device_info = None
    if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
        import urllib.parse
        parsed_url = urllib.parse.urlparse(task.base_url) if task.base_url else None
        api_ip = parsed_url.hostname if parsed_url and parsed_url.hostname else (task.base_url.split('://')[-1].split(':')[0].split('/')[0] if task.base_url else '')
        api_password = task.api_key or ''
        device_info = {
            'ip': api_ip,
            'port': 22,
            'username': 'root',
            'password': api_password
        }

    if not device_info and task.device_id:
        device = session.get(Device, task.device_id)
        if device:
            device_info = {
                'ip': device.ip,
                'port': device.port,
                'username': device.username,
                'password': device.password
            }

    if not device_info and task.device_ip:
        device_info = {
            'ip': task.device_ip,
            'port': 22,
            'username': task.device_username or 'root',
            'password': task.device_password or ''
        }

    if not device_info:
        raise HTTPException(status_code=400, detail="没有可用的设备信息")

    try:
        # 连接到设备读取日志
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(
            hostname=device_info['ip'],
            port=device_info['port'],
            username=device_info['username'],
            password=device_info['password'],
            timeout=10
        )

        # 查找日志文件
        # 日志文件命名格式: /tmp/task_{task_id}_YYYYMMDD_HHMMSS.log
        stdin, stdout, stderr = ssh_client.exec_command(
            f'ls -t /tmp/task_{task_id}_*.log 2>/dev/null | head -1'
        )
        log_file = stdout.read().decode().strip()

        if not log_file:
            ssh_client.close()
            return {"logs": [], "message": "尚未找到日志文件，测试可能刚开始"}

        # 读取日志内容
        stdin, stdout, stderr = ssh_client.exec_command(f'tail -n {lines} {log_file}')
        log_content = stdout.read().decode('utf-8', errors='replace')
        error_msg = stderr.read().decode()

        ssh_client.close()

        # 解析日志行
        logs = []
        for line in log_content.strip().split('\n'):
            if line.strip():
                # 尝试解析日志级别
                level = "INFO"
                if "ERROR" in line or "FAIL" in line:
                    level = "ERROR"
                elif "WARN" in line:
                    level = "WARNING"
                elif "SUCCESS" in line or "completed" in line.lower():
                    level = "SUCCESS"

                logs.append({
                    "level": level,
                    "message": line.strip()
                })

        return {
            "logs": logs,
            "log_file": log_file,
            "total_lines": len(logs),
        }

    except Exception as e:
        logger.error(f"读取任务 {task_id} 日志失败: {e}")
        raise HTTPException(status_code=500, detail=f"读取日志失败: {str(e)}")


@app.get("/api/tasks/{task_id}/process")
async def get_task_process_info(task_id: int, session: Session = Depends(get_session)):
    """
    获取任务进程信息

    查询远程设备上测试脚本的进程状态
    """
    import paramiko
    from services.task_monitor import TaskExecutionMonitor

    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取设备信息
    device_info = None
    if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
        import urllib.parse
        parsed_url = urllib.parse.urlparse(task.base_url) if task.base_url else None
        api_ip = parsed_url.hostname if parsed_url and parsed_url.hostname else (task.base_url.split('://')[-1].split(':')[0].split('/')[0] if task.base_url else '')
        api_password = task.api_key or ''
        device_info = {
            'ip': api_ip,
            'port': 22,
            'username': 'root',
            'password': api_password
        }

    if not device_info and task.device_id:
        device = session.get(Device, task.device_id)
        if device:
            device_info = {
                'ip': device.ip,
                'port': device.port,
                'username': device.username,
                'password': device.password
            }

    if not device_info and task.device_ip:
        device_info = {
            'ip': task.device_ip,
            'port': 22,
            'username': task.device_username or 'root',
            'password': task.device_password or ''
        }

    if not device_info:
        raise HTTPException(status_code=400, detail="没有可用的设备信息")

    try:
        # 连接到设备
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(
            hostname=device_info['ip'],
            port=device_info['port'],
            username=device_info['username'],
            password=device_info['password'],
            timeout=10
        )

        # 查找PID文件
        stdin, stdout, stderr = ssh_client.exec_command(
            f'ls -t /tmp/task_{task_id}_*.pid 2>/dev/null | head -1'
        )
        pid_file = stdout.read().decode().strip()

        if not pid_file:
            ssh_client.close()
            return {
                "has_process": False,
                "message": "未找到进程，测试可能已完成或未开始"
            }

        # 读取PID
        stdin, stdout, stderr = ssh_client.exec_command(f'cat {pid_file}')
        pid_str = stdout.read().decode().strip()

        if not pid_str.isdigit():
            ssh_client.close()
            return {
                "has_process": False,
                "pid_file": pid_file,
                "message": "PID文件内容无效"
            }

        pid = int(pid_str)

        # 获取进程状态
        monitor = TaskExecutionMonitor()
        process_status = monitor._get_process_status(ssh_client, pid)

        ssh_client.close()

        if process_status.exists:
            return {
                "has_process": True,
                "pid": process_status.pid,
                "cpu_percent": process_status.cpu_percent,
                "memory_percent": process_status.memory_percent,
                "status": process_status.status,
                "runtime_seconds": process_status.runtime_seconds,
                "runtime_formatted": f"{process_status.runtime_seconds // 3600:02d}:{(process_status.runtime_seconds % 3600) // 60:02d}:{process_status.runtime_seconds % 60:02d}",
            }
        else:
            return {
                "has_process": False,
                "pid": pid,
                "message": "进程已结束"
            }

    except Exception as e:
        logger.error(f"获取任务 {task_id} 进程信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取进程信息失败: {str(e)}")


@app.get("/api/monitoring/tasks")
async def get_monitored_tasks():
    """
    获取所有正在监控的任务列表

    返回当前正在监控的任务概览
    """
    from services.task_monitor import get_task_monitor

    monitor = get_task_monitor()
    monitored_tasks = monitor.get_monitored_tasks()

    tasks_summary = []
    for task_id, task_info in monitored_tasks.items():
        tasks_summary.append({
            "task_id": task_id,
            "status": task_info.get('status').name if task_info.get('status') else "UNKNOWN",
            "start_time": task_info.get('start_time').isoformat() if task_info.get('start_time') else None,
            "last_check_time": task_info.get('last_check_time').isoformat() if task_info.get('last_check_time') else None,
            "elapsed_seconds": (datetime.now() - task_info.get('start_time')).total_seconds() if task_info.get('start_time') else 0,
        })

    return {
        "total": len(tasks_summary),
        "tasks": tasks_summary
    }


class EvalStartRequest(BaseModel):
    packs: str
    model_name: str
    base_url: str
    api_key: str


@app.get("/api/eval/logs")
async def get_eval_logs():
    import os
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_runner.log")
    if not os.path.exists(log_file):
        return {"logs": []}
    with open(log_file, "r") as f:
        lines = f.readlines()
    return {"logs": [line.strip() for line in lines]}

@app.get("/api/eval/status")
async def get_eval_status(pid: int):
    import os
    try:
        os.kill(pid, 0)
        return {"status": "running"}
    except OSError:
        return {"status": "completed"}

@app.get("/api/eval/tasks")
async def get_eval_tasks(session: Session = Depends(get_session)):
    tasks = session.exec(select(EvalTask).order_by(EvalTask.id.desc())).all()
    # check if any running tasks actually stopped
    import os
    updated = False
    for t in tasks:
        if t.status == "running" and t.pid:
            try:
                os.kill(t.pid, 0)
            except OSError:
                t.status = "completed"
                session.add(t)
                updated = True
    if updated:
        session.commit()
    return {"tasks": session.exec(select(EvalTask).order_by(EvalTask.id.desc())).all()}

@app.post("/api/eval/tasks")
async def create_eval_task(req: EvalStartRequest, session: Session = Depends(get_session)):
    from datetime import datetime
    packs_list = req.packs.split(',')
    has_ipd = "IPD" in packs_list
    has_bench = any(p != "IPD" for p in packs_list)
    types = []
    if has_bench:
        types.append("BenchLocal")
    if has_ipd:
        types.append("IPD")
    eval_type = ",".join(types)
    
    task = EvalTask(
        model_name=req.model_name,
        base_url=req.base_url,
        api_key=req.api_key,
        packs=req.packs,
        eval_type=eval_type,
        status="pending",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.post("/api/eval/tasks/{task_id}/start")
async def start_eval_task(task_id: int, session: Session = Depends(get_session)):
    import os
    import asyncio
    
    task = session.get(EvalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    packs_list = task.packs.split(',')
    has_ipd = "IPD" in packs_list
    standard_packs = [p for p in packs_list if p != "IPD"]
    
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal")
    ipd_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "ipd_bench_test")
    
    commands = []
    if standard_packs:
        standard_packs_str = ",".join(standard_packs)
        cmd_standard = f"cd {bench_dir} && bash run_benchlocal.sh {standard_packs_str} {task.model_name} {task.base_url} {task.api_key}"
        commands.append(cmd_standard)
        
    if has_ipd:
        cmd_ipd = f"cd {ipd_dir} && python3 idp_bench_test.py --model {task.model_name} --base_url {task.base_url} --api_key {task.api_key} && cp results/*_report.md ../BenchLocal/results/ 2>/dev/null || true"
        commands.append(cmd_ipd)
        
    if not commands:
        raise HTTPException(status_code=400, detail="No valid packs selected")
        
    final_cmd = " ; ".join(commands)
    
    try:
        log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_runner.log")
        with open(log_file, "w") as f:
            f.write(f"Starting evaluation with command: {final_cmd}\n")
            
        out_file = open(log_file, "a")
        process = await asyncio.create_subprocess_shell(
            final_cmd,
            stdout=out_file,
            stderr=out_file,
            executable='/bin/bash',
            preexec_fn=os.setsid
        )
        task.status = "running"
        task.pid = process.pid
        session.add(task)
        session.commit()
        return {"status": "success", "message": "Evaluation started", "pid": process.pid}
    except Exception as e:
        task.status = "failed"
        session.add(task)
        session.commit()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/eval/tasks/{task_id}")
async def delete_eval_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(EvalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete running task")
    session.delete(task)
    session.commit()
    return {"status": "success"}

@app.post("/api/eval/stop")

async def stop_eval(pid: int = Body(..., embed=True)):
    import os
    import signal
    try:
        os.killpg(os.getpgid(pid), signal.SIGKILL)
        return {"status": "success", "message": "Evaluation stopped"}
    except OSError as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/eval/results")
async def get_eval_results():
    import os
    import re
    from datetime import datetime
    
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal", "results")
    if not os.path.exists(bench_dir):
        return {"reports": []}
        
    reports = []
    for filename in os.listdir(bench_dir):
        if (filename.startswith("benchmark_") or filename.startswith("ipd_bench_")) and filename.endswith("_report.md"):
            filepath = os.path.join(bench_dir, filename)
            
            with open(filepath, "r", encoding="utf-8") as f:
                md_content = f.read()
                
            is_ipd = filename.startswith("ipd_bench_")
            
            if is_ipd:
                model_match = re.search(r"【(.*?)】大模型企业级选型", md_content)
                model_name = model_match.group(1).strip() if model_match else "Unknown"
                
                time_match = re.search(r"评测时间: (.*)", md_content)
                test_time = time_match.group(1).strip() if time_match else ""
                
                ipd_cases = []
                # parse IPD table for cases
                ipd_lines = md_content.split("\n")

                parsing_cases = False
                for line in ipd_lines:
                    if "----------------------------" in line:
                        parsing_cases = True
                        continue
                    if line.startswith("## 三"):
                        parsing_cases = False
                        break
                    
                    if parsing_cases and "|" in line and "评测维度 (AI Capability)" not in line:
                        parts = [p.strip() for p in line.split("|")]
                        if len(parts) >= 6:
                            ipd_cases.append({
                                "id": f"{parts[0]} - {parts[1]}",
                                "pass": True,
                                "score": parts[2],
                                "error": f"格式: {parts[3]}, 逻辑: {parts[4]}, 指令: {parts[5]}"
                            })
                
                total_ipd_score = sum([float(c["score"].replace("分", "").strip()) for c in ipd_cases]) if ipd_cases else 0
                max_ipd_score = len(ipd_cases) * 100
                score = f"{int(total_ipd_score)}/{max_ipd_score}" if max_ipd_score > 0 else "0/0"
                percent = round(total_ipd_score / max_ipd_score * 100, 2) if max_ipd_score > 0 else 0.0

                packs = [{
                    "name": "IPD Process",
                    "status": "SUCCESS",
                    "score": total_ipd_score,
                    "maxScore": max_ipd_score,
                    "cases": ipd_cases
                }]
                
            else:
                # Parse basic info for standard benchmark
                model_match = re.search(r"\*\*模型名称\*\*: (.*)", md_content)
                model_name = model_match.group(1).strip() if model_match else "Unknown"
                
                time_match = re.search(r"\*\*测试时间\*\*: (.*)", md_content)
                test_time = time_match.group(1).strip() if time_match else ""
                if test_time and "," in test_time:
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(test_time, "%m/%d/%Y, %I:%M:%S %p")
                        test_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass
                
                score_match = re.search(r"- \*\*总得分\*\*: (\d+) / (\d+)", md_content)
                score = f"{score_match.group(1)}/{score_match.group(2)}" if score_match else "0/0"
                
                percent_match = re.search(r"- \*\*综合胜率\*\*: \*\*(.*)%\*\*", md_content)
                percent = float(percent_match.group(1)) if percent_match else 0.0
                
                # Parse individual packs
                packs = []
                pack_sections = re.split(r"## 测试集: ", md_content)[1:]
                for section in pack_sections:
                    lines = section.split("\n")
                    pack_name = lines[0].strip()
                    if pack_name == "🏆 大模型综合评分":
                        continue
                        
                    status_match = re.search(r"- \*\*状态\*\*: . (.*)", section)
                    status_str = status_match.group(1).strip() if status_match else "FAILED"
                    status = "SUCCESS" if "SUCCESS" in status_str else "FAILED"
                    
                    score_match = re.search(r"- \*\*得分\*\*: (\d+)/(\d+)", section)
                    pack_score = int(score_match.group(1)) if score_match else 0
                    pack_max = int(score_match.group(2)) if score_match else 0
                    
                    cases = []
                    # Find the markdown table
                    table_lines = [l for l in lines if l.startswith("|") and "---" not in l and "用例 ID" not in l]
                    for tl in table_lines:
                        parts = [p.strip() for p in tl.split("|")[1:-1]]
                        if len(parts) >= 4:
                            cases.append({
                                "id": parts[0],
                                "pass": "✅" in parts[1],
                                "score": parts[2],
                                "error": parts[3]
                            })
                            
                    packs.append({
                        "name": pack_name,
                        "status": status,
                        "score": pack_score,
                        "maxScore": pack_max,
                        "cases": cases
                    })
                        
            reports.append({
                "id": filename,
                "model_name": model_name,
                "time": test_time,
                "score": score,
                "percent": percent,
                "packs": packs,
                "type": "IPD" if is_ipd else "BenchLocal"
            })
            
    # Sort by descending time
    reports.sort(key=lambda x: x["time"], reverse=True)
    return {"reports": reports}

@app.post("/api/eval/start")
async def start_eval(req: EvalStartRequest):
    import os
    import asyncio
    
    packs_list = req.packs.split(',')
    has_ipd = "IPD" in packs_list
    standard_packs = [p for p in packs_list if p != "IPD"]
    
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal")
    ipd_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "ipd_bench_test")
    
    commands = []
    
    if standard_packs:
        standard_packs_str = ",".join(standard_packs)
        cmd_standard = f"cd {bench_dir} && bash run_benchlocal.sh {standard_packs_str} {req.model_name} {req.base_url} {req.api_key}"
        commands.append(cmd_standard)
        
    if has_ipd:
        cmd_ipd = f"cd {ipd_dir} && python3 idp_bench_test.py --model {req.model_name} --base_url {req.base_url} --api_key {req.api_key} && cp results/*_report.md ../BenchLocal/results/ 2>/dev/null || true"
        commands.append(cmd_ipd)
        
    if not commands:
        raise HTTPException(status_code=400, detail="No valid packs selected")
        
    # Join commands with && so they execute sequentially, or ; to execute regardless
    final_cmd = " ; ".join(commands)
    
    try:
        log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_runner.log")
        with open(log_file, "w") as f:
            f.write(f"Starting evaluation with command: {final_cmd}\n")
            
        out_file = open(log_file, "a")
        process = await asyncio.create_subprocess_shell(
            final_cmd,
            stdout=out_file,
            stderr=out_file,
            executable='/bin/bash',
            preexec_fn=os.setsid
        )
        return {"status": "success", "message": "Evaluation started", "pid": process.pid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/eval/results/{filename}")
async def delete_eval_result(filename: str):
    import os
    bench_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal", "results")
    filepath = os.path.join(bench_dir, filename)
    if os.path.exists(filepath) and filename.endswith("_report.md"):
        try:
            os.remove(filepath)
            
            # also remove corresponding .json file
            json_filepath = filepath.replace("_report.md", "_report.json")
            if os.path.exists(json_filepath):
                os.remove(json_filepath)
                
            # ALSO delete from ipd_bench_test/results if it's an IPD report
            if filename.startswith("ipd_bench_"):
                ipd_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "ipd_bench_test", "results")
                ipd_md = os.path.join(ipd_dir, filename)
                ipd_json = os.path.join(ipd_dir, filename.replace("_report.md", "_report.json"))
                if os.path.exists(ipd_md):
                    os.remove(ipd_md)
                if os.path.exists(ipd_json):
                    os.remove(ipd_json)
                    
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="File not found")

class EvalComparisonCreate(BaseModel):
    name: str
    report_ids: list[str]

@app.post("/api/eval/comparisons")
async def create_eval_comparison(data: EvalComparisonCreate):
    import os
    import json
    import uuid
    from datetime import datetime
    
    comparisons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal", "results", "comparisons")
    os.makedirs(comparisons_dir, exist_ok=True)
    
    comp_id = f"comp_{uuid.uuid4().hex[:8]}"
    filepath = os.path.join(comparisons_dir, f"{comp_id}.json")
    
    comp_data = {
        "id": comp_id,
        "name": data.name,
        "report_ids": data.report_ids,
        "created_at": datetime.now().isoformat()
    }
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(comp_data, f, ensure_ascii=False, indent=2)
        
    return {"status": "success", "data": comp_data}

@app.get("/api/eval/comparisons")
async def get_eval_comparisons():
    import os
    import json
    
    comparisons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal", "results", "comparisons")
    if not os.path.exists(comparisons_dir):
        return {"comparisons": []}
        
    comparisons = []
    for filename in os.listdir(comparisons_dir):
        if filename.endswith(".json"):
            with open(os.path.join(comparisons_dir, filename), "r", encoding="utf-8") as f:
                try:
                    comparisons.append(json.load(f))
                except:
                    pass
                    
    comparisons.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"comparisons": comparisons}

@app.delete("/api/eval/comparisons/{comp_id}")
async def delete_eval_comparison(comp_id: str):
    import os
    comparisons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bench_test", "BenchLocal", "results", "comparisons")
    filepath = os.path.join(comparisons_dir, f"{comp_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Comparison not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
