"""
任务队列模块

提供基于优先级和创建时间的任务队列管理
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
import threading
import logging

logger = logging.getLogger(__name__)


@dataclass
class QueueTask:
    """队列任务数据类"""
    id: int
    task_name: str
    priority: int
    created_at: str
    queue_time: Optional[str] = None
    status: int = 1  # QUEUED
    data: Dict[str, Any] = field(default_factory=dict)


class TaskQueue:
    """任务队列
    
    实现基于优先级和创建时间的任务排序队列
    排序规则：
    1. 优先级降序（高→中→低）
    2. 同优先级按创建时间升序（早→晚）
    """
    
    # 优先级定义
    PRIORITY_HIGH = 2
    PRIORITY_MEDIUM = 1
    PRIORITY_LOW = 0
    
    # 优先级名称映射
    PRIORITY_NAMES = {
        PRIORITY_HIGH: "高",
        PRIORITY_MEDIUM: "中",
        PRIORITY_LOW: "低"
    }
    
    def __init__(self, max_size: int = 1000):
        """
        初始化任务队列
        
        Args:
            max_size: 队列最大容量
        """
        self.queue: List[QueueTask] = []
        self.max_size = max_size
        self._lock = threading.Lock()
    
    def add_task(self, task: Dict[str, Any]) -> int:
        """
        添加任务到队列
        
        Args:
            task: 任务字典，需包含 id, task_name, priority, created_at
            
        Returns:
            int: 任务在队列中的位置
            
        Raises:
            ValueError: 队列已满或任务参数无效
        """
        with self._lock:
            # 检查队列容量
            if len(self.queue) >= self.max_size:
                raise ValueError("任务队列已满")
            
            # 检查必填字段
            required_fields = ['id', 'task_name', 'priority', 'created_at']
            for field_name in required_fields:
                if field_name not in task:
                    raise ValueError(f"任务缺少必填字段: {field_name}")
            
            # 创建队列任务对象
            queue_task = QueueTask(
                id=task['id'],
                task_name=task['task_name'],
                priority=task['priority'],
                created_at=task['created_at'],
                queue_time=datetime.now().isoformat(),
                status=1,  # QUEUED
                data=task
            )
            
            # 插入排序位置
            insert_index = self._find_insert_index(queue_task)
            self.queue.insert(insert_index, queue_task)
            
            logger.info(f"任务 {task['id']} 已加入队列，位置: {insert_index + 1}")
            return insert_index + 1
    
    def _find_insert_index(self, task: QueueTask) -> int:
        """
        查找任务的插入位置
        
        排序规则：
        1. 优先级降序
        2. 同优先级按创建时间升序
        """
        for i, existing_task in enumerate(self.queue):
            # 比较优先级（降序）
            if task.priority > existing_task.priority:
                return i
            elif task.priority == existing_task.priority:
                # 同优先级，比较创建时间（升序）
                try:
                    task_created = datetime.fromisoformat(task.created_at.replace('Z', '+00:00'))
                    existing_created = datetime.fromisoformat(existing_task.created_at.replace('Z', '+00:00'))
                    if task_created < existing_created:
                        return i
                except (ValueError, AttributeError):
                    # 时间解析失败，按字符串比较
                    if task.created_at < existing_task.created_at:
                        return i
            # 继续查找
        
        return len(self.queue)
    
    def get_next_task(self) -> Optional[QueueTask]:
        """
        获取下一个待执行任务
        
        Returns:
            QueueTask: 队列中的第一个任务，队列为空时返回None
        """
        with self._lock:
            if self.queue:
                return self.queue.pop(0)
            return None
    
    def peek_next_task(self) -> Optional[QueueTask]:
        """
        查看下一个任务（不移除）
        
        Returns:
            QueueTask: 队列中的第一个任务，队列为空时返回None
        """
        with self._lock:
            if self.queue:
                return self.queue[0]
            return None
    
    def remove_task(self, task_id: int) -> bool:
        """
        从队列中移除指定任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功移除
        """
        with self._lock:
            for i, task in enumerate(self.queue):
                if task.id == task_id:
                    self.queue.pop(i)
                    logger.info(f"任务 {task_id} 已从队列中移除")
                    return True
            return False
    
    def get_task_position(self, task_id: int) -> int:
        """
        获取任务在队列中的位置
        
        Args:
            task_id: 任务ID
            
        Returns:
            int: 队列位置（1-based），不在队列中返回-1
        """
        with self._lock:
            for i, task in enumerate(self.queue):
                if task.id == task_id:
                    return i + 1
            return -1
    
    def get_queue_status(self) -> List[Dict[str, Any]]:
        """
        获取队列状态
        
        Returns:
            List[Dict]: 队列中所有任务的状态信息
        """
        with self._lock:
            return [
                {
                    "id": task.id,
                    "task_name": task.task_name,
                    "priority": task.priority,
                    "priority_name": self._get_priority_name(task.priority),
                    "queue_position": idx + 1,
                    "created_at": task.created_at,
                    "queue_time": task.queue_time
                }
                for idx, task in enumerate(self.queue)
            ]
    
    def get_queue_summary(self) -> Dict[str, Any]:
        """
        获取队列摘要信息
        
        Returns:
            Dict: 队列统计信息
        """
        with self._lock:
            priority_counts = {0: 0, 1: 0, 2: 0}
            for task in self.queue:
                if task.priority in priority_counts:
                    priority_counts[task.priority] += 1
            
            return {
                "total": len(self.queue),
                "high_priority": priority_counts[2],
                "medium_priority": priority_counts[1],
                "low_priority": priority_counts[0],
                "available_slots": self.max_size - len(self.queue)
            }
    
    def _get_priority_name(self, priority: int) -> str:
        """获取优先级名称"""
        return self.PRIORITY_NAMES.get(priority, "未知")
    
    def clear(self):
        """清空队列"""
        with self._lock:
            self.queue.clear()
            logger.info("任务队列已清空")
    
    def get_all_tasks(self) -> List[QueueTask]:
        """获取队列中所有任务的副本"""
        with self._lock:
            return list(self.queue)

    def __len__(self) -> int:
        """返回队列长度"""
        with self._lock:
            return len(self.queue)
    
    def is_full(self) -> bool:
        """检查队列是否已满"""
        with self._lock:
            return len(self.queue) >= self.max_size
    
    def is_empty(self) -> bool:
        """检查队列是否为空"""
        with self._lock:
            return len(self.queue) == 0
