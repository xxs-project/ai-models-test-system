"""
任务队列测试模块

测试任务队列的排序规则、并发安全性和边界情况
"""

import pytest
import sys
import os
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.task_queue import TaskQueue, QueueTask


class TestTaskQueue:
    """任务队列测试类"""
    
    def setup_method(self):
        """每个测试方法前初始化"""
        self.queue = TaskQueue(max_size=100)
    
    # ==================== 功能正确性测试 ====================
    
    def test_add_single_task(self):
        """测试添加单个任务"""
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'priority': 1,
            'created_at': '2026-02-05T10:00:00'
        }
        
        position = self.queue.add_task(task)
        
        assert position == 1
        assert len(self.queue) == 1
    
    def test_priority_ordering_high_first(self):
        """测试高优先级任务排在前面"""
        tasks = [
            {'id': 1, 'task_name': 'Low', 'priority': 0, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'High', 'priority': 2, 'created_at': '2026-02-05T10:00:00'},
            {'id': 3, 'task_name': 'Medium', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        # 验证顺序: High -> Medium -> Low
        status = self.queue.get_queue_status()
        assert status[0]['id'] == 2  # High
        assert status[1]['id'] == 3  # Medium
        assert status[2]['id'] == 1  # Low
    
    def test_same_priority_ordering_by_time(self):
        """测试同优先级按创建时间排序"""
        tasks = [
            {'id': 1, 'task_name': 'Second', 'priority': 1, 'created_at': '2026-02-05T11:00:00'},
            {'id': 2, 'task_name': 'First', 'priority': 1, 'created_at': '2026-02-05T09:00:00'},
            {'id': 3, 'task_name': 'Third', 'priority': 1, 'created_at': '2026-02-05T12:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        status = self.queue.get_queue_status()
        assert status[0]['id'] == 2  # First (09:00)
        assert status[1]['id'] == 1  # Second (11:00)
        assert status[2]['id'] == 3  # Third (12:00)
    
    def test_complex_priority_and_time_ordering(self):
        """测试复杂场景：优先级和时间混合排序"""
        tasks = [
            {'id': 1, 'task_name': 'Task1', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'Task2', 'priority': 2, 'created_at': '2026-02-05T11:00:00'},
            {'id': 3, 'task_name': 'Task3', 'priority': 1, 'created_at': '2026-02-05T09:00:00'},
            {'id': 4, 'task_name': 'Task4', 'priority': 0, 'created_at': '2026-02-05T08:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        # 预期顺序: Task2(高) -> Task3(中,09:00) -> Task1(中,10:00) -> Task4(低)
        status = self.queue.get_queue_status()
        assert status[0]['id'] == 2
        assert status[1]['id'] == 3
        assert status[2]['id'] == 1
        assert status[3]['id'] == 4
    
    def test_get_next_task(self):
        """测试获取下一个任务"""
        tasks = [
            {'id': 1, 'task_name': 'Low', 'priority': 0, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'High', 'priority': 2, 'created_at': '2026-02-05T10:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        next_task = self.queue.get_next_task()
        assert next_task.id == 2  # High priority first
        assert len(self.queue) == 1
    
    def test_get_next_task_empty_queue(self):
        """测试空队列获取下一个任务"""
        result = self.queue.get_next_task()
        assert result is None
    
    def test_peek_next_task(self):
        """测试查看下一个任务不移除"""
        task = {
            'id': 1,
            'task_name': 'Test',
            'priority': 1,
            'created_at': '2026-02-05T10:00:00'
        }
        self.queue.add_task(task)
        
        peeked = self.queue.peek_next_task()
        assert peeked.id == 1
        assert len(self.queue) == 1  # 队列长度不变
    
    def test_remove_task(self):
        """测试移除任务"""
        tasks = [
            {'id': 1, 'task_name': 'Task1', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'Task2', 'priority': 1, 'created_at': '2026-02-05T11:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        removed = self.queue.remove_task(1)
        assert removed is True
        assert len(self.queue) == 1
        
        # 验证剩余任务
        remaining = self.queue.get_queue_status()
        assert remaining[0]['id'] == 2
    
    def test_remove_nonexistent_task(self):
        """测试移除不存在的任务"""
        result = self.queue.remove_task(999)
        assert result is False
    
    def test_get_task_position(self):
        """测试获取任务位置"""
        tasks = [
            {'id': 1, 'task_name': 'First', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'Second', 'priority': 1, 'created_at': '2026-02-05T11:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        assert self.queue.get_task_position(1) == 1
        assert self.queue.get_task_position(2) == 2
        assert self.queue.get_task_position(999) == -1
    
    def test_queue_summary(self):
        """测试队列摘要"""
        tasks = [
            {'id': 1, 'task_name': 'High1', 'priority': 2, 'created_at': '2026-02-05T10:00:00'},
            {'id': 2, 'task_name': 'High2', 'priority': 2, 'created_at': '2026-02-05T10:00:00'},
            {'id': 3, 'task_name': 'Medium', 'priority': 1, 'created_at': '2026-02-05T10:00:00'},
            {'id': 4, 'task_name': 'Low', 'priority': 0, 'created_at': '2026-02-05T10:00:00'},
        ]
        
        for task in tasks:
            self.queue.add_task(task)
        
        summary = self.queue.get_queue_summary()
        assert summary['total'] == 4
        assert summary['high_priority'] == 2
        assert summary['medium_priority'] == 1
        assert summary['low_priority'] == 1
    
    # ==================== 边界情况测试 ====================
    
    def test_queue_full(self):
        """测试队列满的情况"""
        queue = TaskQueue(max_size=3)
        
        for i in range(3):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,
                'created_at': f'2026-02-05T10:0{i}:00'
            }
            queue.add_task(task)
        
        # 添加第4个任务应该失败
        with pytest.raises(ValueError) as exc_info:
            queue.add_task({
                'id': 3,
                'task_name': 'Task3',
                'priority': 1,
                'created_at': '2026-02-05T10:03:00'
            })
        
        assert '队列已满' in str(exc_info.value)
    
    def test_add_task_missing_required_fields(self):
        """测试添加缺少必填字段的任务"""
        incomplete_task = {
            'id': 1,
            'task_name': 'Test'
            # 缺少 priority 和 created_at
        }
        
        with pytest.raises(ValueError) as exc_info:
            self.queue.add_task(incomplete_task)
        
        assert '缺少必填字段' in str(exc_info.value)
    
    def test_clear_queue(self):
        """测试清空队列"""
        for i in range(5):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,
                'created_at': f'2026-02-05T10:0{i}:00'
            }
            self.queue.add_task(task)
        
        self.queue.clear()
        assert len(self.queue) == 0
        assert self.queue.is_empty()
    
    def test_is_full_and_is_empty(self):
        """测试队列满和空检查"""
        queue = TaskQueue(max_size=2)
        
        assert queue.is_empty()
        assert not queue.is_full()
        
        for i in range(2):
            queue.add_task({
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,
                'created_at': f'2026-02-05T10:0{i}:00'
            })
        
        assert not queue.is_empty()
        assert queue.is_full()
    
    # ==================== 并发安全性测试 ====================
    
    def test_concurrent_add_tasks(self):
        """测试并发添加任务"""
        queue = TaskQueue(max_size=1000)
        errors = []
        
        def add_tasks(start_id):
            try:
                for i in range(10):
                    task = {
                        'id': start_id + i,
                        'task_name': f'Task{start_id + i}',
                        'priority': i % 3,
                        'created_at': f'2026-02-05T10:{start_id:02d}:{i:02d}'
                    }
                    queue.add_task(task)
            except Exception as e:
                errors.append(e)
        
        # 启动多个线程并发添加任务
        threads = []
        for i in range(5):
            t = threading.Thread(target=add_tasks, args=(i * 10,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # 验证没有错误
        assert len(errors) == 0
        # 验证任务数量
        assert len(queue) == 50
    
    def test_concurrent_add_and_remove(self):
        """测试并发添加和移除任务"""
        queue = TaskQueue(max_size=100)
        
        # 先添加一些任务
        for i in range(20):
            queue.add_task({
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,
                'created_at': f'2026-02-05T10:{i:02d}:00'
            })
        
        results = {'added': 0, 'removed': 0, 'errors': []}
        
        def add_remove_tasks():
            try:
                for i in range(100, 110):
                    task = {
                        'id': i,
                        'task_name': f'Task{i}',
                        'priority': 2,
                        'created_at': f'2026-02-05T10:{i:02d}:00'
                    }
                    queue.add_task(task)
                    results['added'] += 1
                    
                    # 随机移除一个任务
                    if i % 2 == 0:
                        queue.remove_task(i - 100)
                        results['removed'] += 1
            except Exception as e:
                results['errors'].append(e)
        
        threads = []
        for _ in range(3):
            t = threading.Thread(target=add_remove_tasks)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # 验证没有错误
        assert len(results['errors']) == 0
    
    # ==================== 性能测试 ====================
    
    def test_large_queue_performance(self):
        """测试大队列性能"""
        queue = TaskQueue(max_size=10000)
        
        start_time = time.time()
        
        # 添加1000个任务
        for i in range(1000):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': i % 3,
                'created_at': f'2026-02-05T{i//60:02d}:{i%60:02d}:00'
            }
            queue.add_task(task)
        
        elapsed = time.time() - start_time
        
        # 添加1000个任务应该在1秒内完成
        assert elapsed < 1.0, f"大队列性能测试失败: {elapsed}秒"
        assert len(queue) == 1000
    
    def test_priority_sorting_performance(self):
        """测试优先级排序性能"""
        queue = TaskQueue(max_size=10000)
        
        # 添加混合同优先级的任务
        for i in range(1000):
            task = {
                'id': i,
                'task_name': f'Task{i}',
                'priority': 1,  # 同优先级
                'created_at': f'2026-02-05T{i//60:02d}:{i%60:02d}:00'
            }
            queue.add_task(task)
        
        status = queue.get_queue_status()
        
        # 验证顺序正确
        for i in range(len(status) - 1):
            assert status[i]['id'] < status[i + 1]['id']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
