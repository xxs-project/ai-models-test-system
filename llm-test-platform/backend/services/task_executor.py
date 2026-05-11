"""
任务执行器模块

负责任务的执行、监控和状态更新
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass

# 将使用utils中的SSHManager
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.ssh_manager import SSHManager
from services.command_builder import CommandBuilder, TaskStatus

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """任务执行结果"""
    success: bool
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    error_message: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    execution_time_seconds: float = 0.0


class TaskExecutor:
    """任务执行器
    
    负责任务的执行流程：
    1. 建立SSH连接
    2. 进入脚本目录
    3. 构建并执行测试命令
    4. 监控执行进度
    5. 处理执行结果
    """
    
    # 默认超时时间（秒）
    DEFAULT_COMMAND_TIMEOUT = 1800  # 30分钟
    DEFAULT_SSH_TIMEOUT = 30
    MAX_RETRIES = 3
    
    def __init__(self, ssh_manager: Optional[SSHManager] = None,
                 progress_callback: Optional[Callable[[int, int], None]] = None):
        """
        初始化任务执行器
        
        Args:
            ssh_manager: SSH管理器实例
            progress_callback: 进度回调函数(task_id, progress)
        """
        self.ssh_manager = ssh_manager or SSHManager()
        self.progress_callback = progress_callback
        self._running_tasks: Dict[int, asyncio.Task] = {}
    
    async def execute_task(self, task: Dict[str, Any], 
                          device_info: Dict[str, str]) -> ExecutionResult:
        """
        执行测试任务
        
        Args:
            task: 任务字典
            device_info: 设备连接信息
            
        Returns:
            ExecutionResult: 执行结果
        """
        start_time = datetime.now()
        task_id = task.get('id', 0)
        
        # Calculate a unique port for this task to avoid conflicts
        # Base port 2800 + offset derived from task_id (e.g. 2800, 2801, etc.)
        # Use modulo 100 to stay within a reasonable range (2800-2899)
        if 'port' not in task:
            port_offset = task_id % 100
            task['port'] = 2800 + port_offset
            logger.info(f"Assigned port {task['port']} to task {task_id}")
        
        try:
            logger.info(f"开始执行任务 {task_id}: {task.get('task_name', 'Unknown')}")
            
            # 1. 建立SSH连接
            ssh_client = await self._connect_to_device(device_info)
            if not ssh_client:
                return ExecutionResult(
                    success=False,
                    error_message="无法建立SSH连接",
                    start_time=start_time.isoformat()
                )
            
            # 2. 进入测试脚本目录
            script_path = task.get('script_path', '/home/user/scripts')
            await self._change_directory(ssh_client, script_path)
            
            # 3. 构建测试命令
            command = CommandBuilder.build_command(task)
            logger.info(f"任务 {task_id} 执行命令: {command[:100]}...")
            
            # 4. 执行命令
            result = await self._execute_command(
                ssh_client, command, task_id, 
                timeout=task.get('timeout', self.DEFAULT_COMMAND_TIMEOUT)
            )
            
            # 5. 关闭SSH连接
            try:
                ssh_client.close()
            except Exception as e:
                logger.warning(f"关闭SSH连接时出错: {e}")
            
            # 6. 处理结果
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            result.end_time = end_time.isoformat()
            result.execution_time_seconds = execution_time
            
            if result.success:
                logger.info(f"任务 {task_id} 执行成功，耗时 {execution_time:.2f}秒")
            else:
                logger.error(f"任务 {task_id} 执行失败: {result.error_message}")
            
            return result
            
        except Exception as e:
            logger.error(f"任务 {task_id} 执行异常: {e}")
            return ExecutionResult(
                success=False,
                error_message=str(e),
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat()
            )
    
    async def _connect_to_device(self, device_info: Dict[str, str]) -> Any:
        """
        连接到测试设备
        
        Args:
            device_info: 设备信息字典
            
        Returns:
            paramiko.SSHClient: SSH客户端
        """
        try:
            host = device_info.get('ip', '')
            port = int(device_info.get('port', 22))
            username = device_info.get('username', '')
            password = device_info.get('password', '')
            
            client = self.ssh_manager.connect(
                host=host,
                port=port,
                username=username,
                password=password,
                timeout=self.DEFAULT_SSH_TIMEOUT,
                max_retries=self.MAX_RETRIES
            )
            
            return client
        except Exception as e:
            logger.error(f"连接设备失败: {e}")
            return None
    
    async def _change_directory(self, ssh_client: Any, script_path: str):
        """
        切换到脚本目录
        
        Args:
            ssh_client: SSH客户端
            script_path: 脚本路径
        """
        # 使用cd命令构建完整路径
        command = f"cd {script_path} && pwd"
        exit_code, stdout, stderr = self.ssh_manager.execute_command(
            ssh_client, command, timeout=10
        )
        
        if exit_code != 0:
            raise Exception(f"无法进入脚本目录 {script_path}: {stderr}")
        
        logger.info(f"已进入脚本目录: {stdout.strip()}")
    
    async def _execute_command(self, ssh_client: Any, command: str, 
                              task_id: int, timeout: int) -> ExecutionResult:
        """
        执行测试命令
        
        Args:
            ssh_client: SSH客户端
            command: 要执行的命令
            task_id: 任务ID
            timeout: 超时时间
            
        Returns:
            ExecutionResult: 执行结果
        """
        start_time = datetime.now()
        
        try:
            # 创建异步任务执行命令
            loop = asyncio.get_event_loop()
            
            # 启动进度监控
            progress_monitor = asyncio.create_task(
                self._monitor_progress(task_id)
            )
            
            # 执行命令
            exit_code, stdout, stderr = await loop.run_in_executor(
                None,
                self.ssh_manager.execute_command,
                ssh_client,
                command,
                timeout
            )
            
            # 取消进度监控
            progress_monitor.cancel()
            
            # 构建结果
            success = exit_code == 0
            result = ExecutionResult(
                success=success,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                start_time=start_time.isoformat()
            )
            
            if not success:
                result.error_message = stderr[:500] if stderr else f"命令执行失败，退出码: {exit_code}"
            
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"任务 {task_id} 执行超时")
            return ExecutionResult(
                success=False,
                error_message=f"任务执行超时（超过 {timeout} 秒）",
                start_time=start_time.isoformat()
            )
        except Exception as e:
            logger.error(f"任务 {task_id} 执行异常: {e}")
            return ExecutionResult(
                success=False,
                error_message=str(e),
                start_time=start_time.isoformat()
            )
    
    async def _monitor_progress(self, task_id: int):
        """
        监控任务进度
        
        Args:
            task_id: 任务ID
        """
        progress = 0
        while progress < 100:
            try:
                await asyncio.sleep(60)  # 每分钟更新一次
                progress = min(progress + 10, 95)  # 模拟进度更新
                
                if self.progress_callback:
                    self.progress_callback(task_id, progress)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"监控进度时出错: {e}")
    
    def cancel_task(self, task_id: int) -> bool:
        """
        取消正在执行的任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功取消
        """
        if task_id in self._running_tasks:
            task = self._running_tasks[task_id]
            task.cancel()
            del self._running_tasks[task_id]
            logger.info(f"任务 {task_id} 已取消")
            return True
        return False
    
    def get_running_tasks(self) -> Dict[int, asyncio.Task]:
        """获取正在执行的任务列表"""
        return self._running_tasks.copy()
