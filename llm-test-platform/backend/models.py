from typing import Optional, Dict, Any, List
from sqlmodel import Field, SQLModel, Column, Table
from sqlalchemy import JSON
from datetime import datetime

# Helper to prevent duplicate metadata errors during tests
def cleanup_metadata(table_name: str):
    if table_name in SQLModel.metadata.tables:
        SQLModel.metadata.remove(SQLModel.metadata.tables[table_name])

cleanup_metadata("device")
class Device(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ip: str = Field(index=True)
    port: int = Field(default=22)
    username: str
    password: str
    status: str = Field(default="Unknown")
    os_info: Optional[str] = None
    arch: Optional[str] = None
    accelerator_type: Optional[str] = None
    accelerator_count: int = Field(default=0)
    idle_count: int = Field(default=0)
    busy_count: int = Field(default=0)
    warning_count: int = Field(default=0)
    accelerator_status: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    remark: Optional[str] = None
    error_message: Optional[str] = None
    last_updated: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

cleanup_metadata("task")
class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_name: str
    task_description: Optional[str] = None
    priority: int = Field(default=1)
    test_type: int = Field(default=1)
    test_mode: int = Field(default=1)
    startup_mode: Optional[str] = Field(default="container")
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    parameter_combination: Optional[str] = None
    processor_type: Optional[str] = Field(default="NPU")
    server_model: Optional[str] = None
    framework_startup_args: Optional[str] = None
    accelerator_card: Optional[str] = None
    dataset_name: Optional[str] = None
    scenario: Optional[str] = None
    features: Optional[str] = None
    status: int = Field(default=0)
    progress: int = Field(default=0)
    device_id: Optional[int] = Field(default=None, foreign_key="device.id")
    device_ip: Optional[str] = None
    device_username: Optional[str] = None
    device_password: Optional[str] = None
    script_path: Optional[str] = Field(default="/home/user/scripts")
    model_name: Optional[str] = None
    npu_count: int = Field(default=1)
    graph_mode: Optional[str] = None
    execution_flag: Optional[str] = Field(default="1")
    model_path: str
    inference_framework: int = Field(default=1)
    framework_version: Optional[str] = None
    context_lengths: str = Field(default="1024,2048,4096")
    concurrencies: str = Field(default="1,8,16,32,64")
    error_message: Optional[str] = None
    created_by: str = Field(default="admin")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    start_time: Optional[str] = None
    end_time: Optional[str] = None

cleanup_metadata("benchmark")
class Benchmark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    unique_id: str
    config: Dict[str, Any] = Field(sa_column=Column(JSON))
    metrics: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

cleanup_metadata("report")
class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    unique_id: str
    benchmark_id1: int
    benchmark_id2: int
    model_name1: str
    model_name2: str
    summary: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

cleanup_metadata("settings")
class Settings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    interval_seconds: int = Field(default=60)
    auto_refresh: bool = Field(default=True)
    notifications_enabled: bool = Field(default=True)

cleanup_metadata("evaltask")
class EvalTask(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    model_name: str
    base_url: str
    api_key: str
    packs: str
    eval_type: str = Field(default="BenchLocal")
    status: str = Field(default="pending")
    pid: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
