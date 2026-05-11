"""
任务调度器测试模块

测试任务调度、队列管理和并发控制
"""

import pytest
import sys
import os
import asyncio
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.task_scheduler import TaskScheduler, SchedulerConfig
from services.task_executor import ExecutionResult


class TestTaskScheduler:
    """任务调度器测试类"""
    
    def setup_method(self):
        """每个测试方法前初始化"""
        self.config = SchedulerConfig(
            max_concurrent=3,
            queue_check_interval=1,
            task_timeout=300
        )
        self.scheduler = TaskScheduler(config=self.config)
    
    def teardown_method(self):
        """每个测试方法后清理"""
        self.scheduler.stop()
    
    # ==================== 功能正确性测试 ====================
    
    @pytest.mark.asyncio
    async def test_scheduler_start_stop(self):
        """测试调度器启动和停止"""
        assert self.scheduler._running is False
        
        self.scheduler.start()
        assert self.scheduler._running is True
        
        self.scheduler.stop()
        assert self.scheduler._running is False
    
    def test_submit_task(self):
        """测试提交任务到队列"""
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'priority': 1,
            'created_at': datetime.now().isoformat()
        }
        
        result = self.scheduler.submit_task(task)
        
        assert result['task_id'] == 1
        assert result['queue_position'] == 1
        assert result['status'] == 'queued'
        assert self.scheduler.get_queued_task_count() == 1
    
    def test_submit_multiple_tasks_ordering(self):
        """测试提交多个任务的顺序"""
        tasks = [
            {'id': 1, 'task_name': 'Low', 'priority': 0, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'High', 'priority': 2, 'created_at': '2026-02-05T10:00:00'},
            {'id': 3, 'task_name': 'Medium', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
        ]
        
        for task in tasks:
            self.scheduler.submit_task(task)
        
        status = self.scheduler.get_queue_status()
        
        # 验证顺序
        assert status['waiting'][0]['id'] == 2  # High
        assert status['waiting'][1]['id'] == 3  # Medium
        assert status['waiting'][2]['id'] == 1  # Low
    
    def test_cancel_queued_task(self):
        """测试取消队列中的任务"""
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'priority': 1,
            'created_at': datetime.now().isoformat()
        }
        
        self.scheduler.submit_task(task)
        assert self.scheduler.get_queued_task_count() == 1
        
        cancelled = self.scheduler.cancel_task(1)
        assert cancelled is True
        assert self.scheduler.get_queued_task_count() == 0
    
    def test_cancel_nonexistent_task(self):
        """测试取消不存在的任务"""
        result = self.scheduler.cancel_task(999)
        assert result is False
    
    def test_get_queue_status_empty(self):
        """测试获取空队列状态"""
        status = self.scheduler.get_queue_status()
        
        assert status['waiting'] == []
        assert status['running'] == []
        assert status['total'] == 0
        assert status['max_concurrent'] == 3
        assert status['current_running'] == 0
    
    # ==================== 并发控制测试 ====================
    
    @pytest.mark.asyncio
    async def test_max_concurrent_tasks(self):
        """测试最大并发任务数限制"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=2))
        
        # 添加多个任务
        for i in range(5):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,
                'created_at': datetime.now().isoformat()
            }
            scheduler.submit_task(task)
        
        # 启动调度器
        scheduler.start()
        
        # 等待调度循环执行
        await asyncio.sleep(0.5)
        
        # 验证并发数不超过限制
        assert scheduler.get_running_task_count() <= 2
        
        scheduler.stop()
    
    # ==================== 状态回调测试 ====================
    
    def test_register_status_callback(self):
        """测试注册状态回调"""
        callback_called = []
        
        def test_callback(task_id, status, progress):
            callback_called.append((task_id, status, progress))
        
        self.scheduler.register_status_callback(test_callback)
        
        # 提交任务
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'priority': 1,
            'created_at': datetime.now().isoformat()
        }
        self.scheduler.submit_task(task)
        
        # 验证回调被调用
        assert len(callback_called) > 0
    
    def test_unregister_status_callback(self):
        """测试注销状态回调"""
        def test_callback(task_id, status, progress):
            pass
        
        self.scheduler.register_status_callback(test_callback)
        assert len(self.scheduler._status_callbacks) == 1
        
        self.scheduler.unregister_status_callback(test_callback)
        assert len(self.scheduler._status_callbacks) == 0
    
    # ==================== 配置测试 ====================
    
    def test_scheduler_default_config(self):
        """测试默认配置"""
        scheduler = TaskScheduler()
        
        assert scheduler.config.max_concurrent == 5
        assert scheduler.config.queue_check_interval == 10
        assert scheduler.config.task_timeout == 1800
        assert scheduler.config.enable_auto_schedule is True
    
    def test_scheduler_custom_config(self):
        """测试自定义配置"""
        config = SchedulerConfig(
            max_concurrent=10,
            queue_check_interval=5,
            task_timeout=3600,
            enable_auto_schedule=False
        )
        scheduler = TaskScheduler(config=config)
        
        assert scheduler.config.max_concurrent == 10
        assert scheduler.config.queue_check_interval == 5
        assert scheduler.config.task_timeout == 3600
        assert scheduler.config.enable_auto_schedule is False
    
    # ==================== 错误处理测试 ====================
    
    def test_submit_task_without_id(self):
        """测试提交没有ID的任务"""
        task = {
            'task_name': 'Test Task',
            'priority': 1
        }
        
        with pytest.raises(ValueError) as exc_info:
            self.scheduler.submit_task(task)
        
        assert '任务必须包含id字段' in str(exc_info.value)
    
    def test_stop_without_start(self):
        """测试未启动就停止"""
        # 应该不抛出异常
        self.scheduler.stop()
        assert self.scheduler._running is False
    
    # ==================== 队列管理测试 ====================
    
    def test_queue_position_after_cancel(self):
        """测试取消任务后队列位置更新"""
        tasks = [
            {'id': 1, 'task_name': 'Task1', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'Task2', 'priority': 1, 'created_at': '2026-02-05T10:01:00'},
            {'id': 3, 'task_name': 'Task3', 'priority': 1, 'created_at': '2026-02-05T10:02:00'},
        ]
        
        for task in tasks:
            self.scheduler.submit_task(task)
        
        # 取消中间的任务
        self.scheduler.cancel_task(2)
        
        status = self.scheduler.get_queue_status()
        # 位置应该重新计算
        positions = [t['queue_position'] for t in status['waiting']]
        assert positions == [1, 2]  # Task3应该变成第2位
    
    # ==================== 集成测试 ====================
    
    @pytest.mark.asyncio
    async def test_scheduler_full_workflow(self):
        """测试完整调度工作流"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=1))
        
        # 添加任务
        for i in range(3):
            task = {
                'id': i + 1,
                'task_name': f'Task{i + 1}',
                'priority': 1,
                'created_at': datetime.now().isoformat()
            }
            scheduler.submit_task(task)
        
        # 启动调度器
        scheduler.start()
        
        # 等待调度
        await asyncio.sleep(0.5)
        
        # 验证任务队列
        status = scheduler.get_queue_status()
        assert status['total'] == 3
        
        scheduler.stop()
    
    # ==================== 性能测试 ====================
    
    def test_submit_many_tasks_performance(self):
        """测试大量任务提交性能"""
        import time
        
        start_time = time.time()
        
        for i in range(100):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': i % 3,
                'created_at': datetime.now().isoformat()
            }
            self.scheduler.submit_task(task)
        
        elapsed = time.time() - start_time
        
        # 提交100个任务应该在1秒内完成
        assert elapsed < 1.0, f"大量任务提交性能测试失败: {elapsed}秒"
        assert self.scheduler.get_queued_task_count() == 100


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
