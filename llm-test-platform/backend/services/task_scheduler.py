"""
任务调度器模块

负责任务的调度、队列管理和并发控制
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from dataclasses import dataclass

import sys
import os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.task_queue import TaskQueue, QueueTask
from services.task_executor import TaskExecutor, ExecutionResult
from services.resource_manager import ResourceManager
from utils.ssh_manager import SSHManager
from models import Device

logger = logging.getLogger(__name__)


@dataclass
class SchedulerConfig:
    """调度器配置"""
    max_concurrent: int = 5               # 最大并发任务数
    queue_check_interval: int = 10        # 队列检查间隔（秒）
    task_timeout: int = 1800              # 任务超时时间（秒）
    enable_auto_schedule: bool = True     # 是否启用自动调度


class TaskScheduler:
    """任务调度器
    
    负责：
    1. 任务队列管理
    2. 任务调度执行
    3. 并发控制
    4. 状态监控
    """
    
    # 任务状态定义
    STATUS_PENDING = 0
    STATUS_QUEUED = 1
    STATUS_RUNNING = 2
    STATUS_COMPLETED = 3
    STATUS_FAILED = 4
    STATUS_CANCELLED = 5
    
    def __init__(self, config: Optional[SchedulerConfig] = None,
                 db_session_factory: Optional[Callable] = None,
                 device_info_provider: Optional[Callable[[int], Dict[str, str]]] = None):
        """
        初始化任务调度器
        
        Args:
            config: 调度器配置
            db_session_factory: 数据库会话工厂函数
            device_info_provider: 设备信息提供者函数(device_id) -> device_info
        """
        self.config = config or SchedulerConfig()
        self.db_session_factory = db_session_factory
        self.device_info_provider = device_info_provider
        
        # 初始化组件
        self.task_queue = TaskQueue()
        self.ssh_manager = SSHManager()
        self.resource_manager = ResourceManager()
        self.task_executor = TaskExecutor(
            ssh_manager=self.ssh_manager,
            progress_callback=self._on_progress_update
        )
        
        # 运行状态
        self._running: bool = False
        self._scheduler_task: Optional[asyncio.Task] = None
        self._running_tasks: Dict[int, asyncio.Task] = {}
        self._running_task_details: Dict[int, Dict[str, Any]] = {}
        self._task_results: Dict[int, ExecutionResult] = {}
        
        # 状态回调
        self._status_callbacks: List[Callable[[int, int, int], None]] = []
    
    def start(self):
        """启动调度器"""
        if self._running:
            logger.warning("调度器已在运行中")
            return
        
        self._running = True
        self._scheduler_task = asyncio.create_task(self._schedule_loop())
        logger.info(f"任务调度器已启动，最大并发: {self.config.max_concurrent}")
    
    def stop(self):
        """停止调度器"""
        if not self._running:
            return
        
        self._running = False
        
        # 取消调度循环
        if self._scheduler_task:
            self._scheduler_task.cancel()
        
        # 取消所有运行中的任务
        for task_id, task in list(self._running_tasks.items()):
            task.cancel()
            logger.info(f"取消任务 {task_id}")
        
        self._running_tasks.clear()
        self._running_task_details.clear()
        
        # 关闭SSH连接
        self.ssh_manager.close_all()
        
        logger.info("任务调度器已停止")
    
    async def _schedule_loop(self):
        """调度主循环"""
        while self._running:
            try:
                await self._process_queue()
                await asyncio.sleep(self.config.queue_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"调度循环出错: {e}")
                await asyncio.sleep(5)  # 出错后等待5秒再继续
    
    async def _process_queue(self):
        """处理任务队列"""
        # 清理已完成的任务
        self._cleanup_completed_tasks()
        
        # 检查并发限制
        if len(self._running_tasks) >= self.config.max_concurrent:
            logger.debug(f"已达到最大并发数 {self.config.max_concurrent}，等待任务完成")
            return
            
        # 获取所有等待任务
        all_tasks = self.task_queue.get_all_tasks()
        if not all_tasks:
            return
            
        # 按设备分组
        device_tasks = defaultdict(list)
        for task in all_tasks:
            d_id = task.data.get('device_id')
            if d_id is not None:
                device_tasks[d_id].append(task)
        
        # 获取当前运行的任务详情
        running_tasks_data = list(self._running_task_details.values())
        
        # 遍历每个设备的任务队列
        for device_id, tasks in device_tasks.items():
            # 再次检查全局并发
            if len(self._running_tasks) >= self.config.max_concurrent:
                break
                
            # 获取设备对象
            device = None
            if self.db_session_factory:
                # 注意：这里需要正确处理Session的生命周期
                # 假设 db_session_factory 返回的是一个Session实例或ContextManager
                try:
                    session = self.db_session_factory()
                    # 如果 session 是上下文管理器
                    if hasattr(session, '__enter__'):
                        with session as s:
                            device = s.get(Device, device_id)
                            # Detach device or clone data if needed, 
                            # but for read-only checks it might be fine if we use attributes immediately
                            # create a lightweight copy or extract needed info
                            if device:
                                # 刷新一下状态以防万一
                                session.refresh(device)
                                # 这里的 device 对象在 session 关闭后可能会失效，
                                # ResourceManager 需要立即读取所需属性
                                pass 
                    else:
                        # 普通 session 对象
                        device = session.get(Device, device_id)
                except Exception as e:
                    logger.error(f"获取设备 {device_id} 信息失败: {e}")
                    continue
            
            if not device:
                logger.warning(f"任务引用的设备 {device_id} 不存在或无法获取")
                continue
                
            # 获取该设备最高优先级任务 (tasks[0])
            candidate_task = tasks[0]
            
            # 检查资源
            can_run, reason = self.resource_manager.can_execute(
                candidate_task.data, device, running_tasks_data
            )
            
            if can_run:
                # 再次确认任务是否还在队列中（防止并发修改）
                if self.task_queue.remove_task(candidate_task.id):
                    # 记录下发时间
                    self.resource_manager.record_dispatch(device_id)
                    
                    # 启动任务
                    logger.info(f"开始执行任务 {candidate_task.id} (设备 {device_id})")
                    self._start_task(candidate_task)
            else:
                logger.debug(f"任务 {candidate_task.id} (设备 {device_id}) 等待中: {reason}")
    
    def _start_task(self, next_task: QueueTask):
        """启动任务"""
        # 更新任务状态为运行中
        self._update_task_status(next_task.id, self.STATUS_RUNNING)
        
        # 记录任务详情
        self._running_task_details[next_task.id] = next_task.data
        
        # 创建异步任务
        task = asyncio.create_task(
            self._execute_task_async(next_task)
        )
        self._running_tasks[next_task.id] = task

    async def _execute_task_async(self, queue_task: QueueTask):
        """
        异步执行任务
        
        Args:
            queue_task: 队列任务
        """
        task_id = queue_task.id
        task_data = queue_task.data
        
        try:
            # 获取设备信息
            device_id = task_data.get('device_id')
            if device_id and self.device_info_provider:
                device_info = self.device_info_provider(device_id)
            else:
                device_info = {
                    'ip': task_data.get('device_ip', ''),
                    'port': str(task_data.get('device_port', 22)),
                    'username': task_data.get('device_username', ''),
                    'password': task_data.get('device_password', '')
                }
            
            # 执行任务
            result = await self.task_executor.execute_task(task_data, device_info)
            
            # 保存结果
            self._task_results[task_id] = result
            
            # 更新任务状态
            if result.success:
                self._update_task_status(task_id, self.STATUS_COMPLETED, progress=100)
            else:
                self._update_task_status(
                    task_id, self.STATUS_FAILED, 
                    error_message=result.error_message
                )
            
        except asyncio.CancelledError:
            self._update_task_status(task_id, self.STATUS_CANCELLED)
            logger.info(f"任务 {task_id} 被取消")
        except Exception as e:
            logger.error(f"任务 {task_id} 执行异常: {e}")
            self._update_task_status(task_id, self.STATUS_FAILED, error_message=str(e))
        finally:
            # 从运行中任务列表移除
            if task_id in self._running_tasks:
                del self._running_tasks[task_id]
            if task_id in self._running_task_details:
                del self._running_task_details[task_id]
    
    def _cleanup_completed_tasks(self):
        """清理已完成的任务"""
        completed_tasks = [
            task_id for task_id, task in self._running_tasks.items()
            if task.done()
        ]
        for task_id in completed_tasks:
            del self._running_tasks[task_id]
            if task_id in self._running_task_details:
                del self._running_task_details[task_id]
    
    def _update_task_status(self, task_id: int, status: int, 
                           progress: Optional[int] = None,
                           error_message: Optional[str] = None):
        """
        更新任务状态
        
        Args:
            task_id: 任务ID
            status: 状态码
            progress: 进度（0-100）
            error_message: 错误信息
        """
        # 更新数据库状态
        if self.db_session_factory:
            try:
                session = self.db_session_factory()
                # 这里应该更新数据库中的任务状态
                # 由于不修改其他模块，这里调用回调通知外部
                pass
            except Exception as e:
                logger.error(f"更新任务 {task_id} 数据库状态失败: {e}")
        
        # 触发状态回调
        for callback in self._status_callbacks:
            try:
                callback(task_id, status, progress or 0)
            except Exception as e:
                logger.error(f"状态回调执行失败: {e}")
    
    def _on_progress_update(self, task_id: int, progress: int):
        """进度更新回调"""
        self._update_task_status(task_id, self.STATUS_RUNNING, progress)
    
    def submit_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        提交任务到队列
        
        Args:
            task: 任务字典
            
        Returns:
            Dict: 包含任务ID和队列位置的信息
        """
        task_id = task.get('id')
        if task_id is None:
            raise ValueError("任务必须包含id字段")
        
        # 添加到队列
        queue_position = self.task_queue.add_task(task)
        
        # 更新任务状态为队列中
        self._update_task_status(task_id, self.STATUS_QUEUED)
        
        logger.info(f"任务 {task_id} 已提交到队列，位置: {queue_position}")
        
        return {
            "task_id": task_id,
            "queue_position": queue_position,
            "status": "queued"
        }
    
    def cancel_task(self, task_id: int) -> bool:
        """
        取消任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功取消
        """
        # 尝试从队列中移除
        if self.task_queue.remove_task(task_id):
            self._update_task_status(task_id, self.STATUS_CANCELLED)
            return True
        
        # 尝试取消运行中的任务
        if task_id in self._running_tasks:
            self._running_tasks[task_id].cancel()
            return True
        
        return False
    
    def get_queue_status(self) -> Dict[str, Any]:
        """
        获取队列状态
        
        Returns:
            Dict: 队列状态信息
        """
        waiting = self.task_queue.get_queue_status()
        
        running = [
            {
                "id": task_id,
                "task_name": "Running Task",  # 应从数据库获取
                "status": "running",
                "progress": 0
            }
            for task_id in self._running_tasks.keys()
        ]
        
        return {
            "waiting": waiting,
            "running": running,
            "total": len(waiting) + len(running),
            "max_concurrent": self.config.max_concurrent,
            "current_running": len(running)
        }
    
    def get_task_result(self, task_id: int) -> Optional[ExecutionResult]:
        """
        获取任务执行结果
        
        Args:
            task_id: 任务ID
            
        Returns:
            ExecutionResult: 执行结果，如果没有则返回None
        """
        return self._task_results.get(task_id)
    
    def register_status_callback(self, callback: Callable[[int, int, int], None]):
        """
        注册状态变更回调
        
        Args:
            callback: 回调函数(task_id, status, progress)
        """
        self._status_callbacks.append(callback)
    
    def unregister_status_callback(self, callback: Callable[[int, int, int], None]):
        """
        注销状态变更回调
        
        Args:
            callback: 回调函数
        """
        if callback in self._status_callbacks:
            self._status_callbacks.remove(callback)
    
    def get_running_task_count(self) -> int:
        """获取正在运行的任务数"""
        return len(self._running_tasks)
    
    def get_queued_task_count(self) -> int:
        """获取队列中的任务数"""
        return len(self.task_queue)
