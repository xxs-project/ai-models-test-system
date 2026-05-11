from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class DeviceBase(BaseModel):
    ip: str
    port: int = 22
    username: str
    password: str
    remark: Optional[str] = None

class DeviceCreate(DeviceBase):
    status: str = "Unknown"
    accelerator_count: int = 0
    idle_count: int = 0
    busy_count: int = 0
    warning_count: int = 0

class DeviceRead(BaseModel):
    id: int
    ip: str
    port: int
    username: str
    password: str
    status: str
    os_info: Optional[str] = None
    arch: Optional[str] = None
    accelerator_type: Optional[str] = None
    accelerator_count: int = 0
    idle_count: int = 0
    busy_count: int = 0
    warning_count: int = 0
    accelerator_status: Optional[Dict[str, Any]] = None
    remark: Optional[str] = None
    error_message: Optional[str] = None
    last_updated: Optional[str] = None
    created_at: str
    updated_at: str

class DeviceUpdate(BaseModel):
    ip: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    remark: Optional[str] = None

class TaskBase(BaseModel):
    task_name: str
    task_description: Optional[str] = None
    priority: int = 1
    test_type: int = 1
    test_mode: int = 1
    device_id: Optional[int] = None
    device_ip: Optional[str] = None
    device_username: Optional[str] = None
    device_password: Optional[str] = None
    script_path: Optional[str] = "/home/user/scripts"
    model_name: Optional[str] = None
    npu_count: int = 1
    graph_mode: Optional[str] = None
    model_path: str
    inference_framework: int = 1
    framework_version: Optional[str] = None
    context_lengths: str = "1024,2048,4096"
    concurrencies: str = "1,8,16,32,64"
    execution_flag: Optional[str] = "1"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[int] = None
    device_id: Optional[int] = None
    device_ip: Optional[str] = None
    device_username: Optional[str] = None
    device_password: Optional[str] = None
    script_path: Optional[str] = None
    model_name: Optional[str] = None
    npu_count: Optional[int] = None
    graph_mode: Optional[str] = None
    model_path: Optional[str] = None
    inference_framework: Optional[int] = None
    framework_version: Optional[str] = None
    execution_flag: Optional[str] = None

class BenchmarkConfig(BaseModel):
    submitter: str
    modelName: str
    serverName: str
    chipName: str
    framework: str
    frameworkVersion: str
    shardingConfig: str
    graphMode: Optional[str] = None
    operatorAcceleration: Optional[str] = None
    frameworkParams: Optional[str] = None
    testDate: str
    notes: Optional[str] = None

class BenchmarkMetricsEntry(BaseModel):
    concurrency: int
    inputLength: int
    outputLength: int
    ttft: float
    tpot: float
    tokensPerSecond: float

class BenchmarkCreate(BaseModel):
    config: BenchmarkConfig
    metrics: List[BenchmarkMetricsEntry]

class ReportCreate(BaseModel):
    benchmark_id1: int
    benchmark_id2: int
    model_name1: str
    model_name2: str
    summary: str

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
