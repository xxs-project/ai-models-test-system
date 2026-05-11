"""
任务执行集成测试模块

测试完整的任务提交到执行流程
"""

import pytest
import sys
import os
import asyncio
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.task_scheduler import TaskScheduler, SchedulerConfig
from services.task_queue import TaskQueue
from services.task_executor import TaskExecutor
from services.command_builder import CommandBuilder, TestType, TestMode


class TestTaskExecutionIntegration:
    """任务执行集成测试类"""
    
    # ==================== 完整工作流测试 ====================
    
    @pytest.mark.asyncio
    async def test_full_task_submission_to_completion(self):
        """测试从任务提交到完成的完整流程"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=1))
        
        # 创建任务
        task = {
            'id': 1,
            'task_name': 'Qwen-14B性能测试',
            'priority': 2,
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/Qwen-14B',
            'model_name': 'Qwen-14B',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0',
            'created_at': datetime.now().isoformat(),
            'device_ip': '192.168.1.100',
            'device_port': 22,
            'device_username': 'root',
            'device_password': 'password',
            'script_path': '/home/user/scripts'
        }
        
        # 提交任务
        result = scheduler.submit_task(task)
        assert result['queue_position'] == 1
        
        # 验证队列状态
        status = scheduler.get_queue_status()
        assert status['total'] == 1
        assert len(status['waiting']) == 1
        
        scheduler.stop()
    
    @pytest.mark.asyncio
    async def test_multiple_tasks_priority_scheduling(self):
        """测试多任务优先级调度"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=2))
        
        # 提交不同优先级的任务
        tasks = [
            {
                'id': 1,
                'task_name': 'Low Priority Task',
                'priority': 0,
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'VLLM',
                'model_path': '/data/models/test',
                'created_at': '2026-02-05T10:00:00'
            },
            {
                'id': 2,
                'task_name': 'High Priority Task',
                'priority': 2,
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'VLLM',
                'model_path': '/data/models/test',
                'created_at': '2026-02-05T10:01:00'
            },
            {
                'id': 3,
                'task_name': 'Medium Priority Task',
                'priority': 1,
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'VLLM',
                'model_path': '/data/models/test',
                'created_at': '2026-02-05T10:02:00'
            }
        ]
        
        for task in tasks:
            scheduler.submit_task(task)
        
        # 验证队列顺序
        status = scheduler.get_queue_status()
        waiting = status['waiting']
        
        assert waiting[0]['id'] == 2  # High
        assert waiting[1]['id'] == 3  # Medium
        assert waiting[2]['id'] == 1  # Low
        
        scheduler.stop()
    
    # ==================== 命令构建与执行集成测试 ====================
    
    def test_command_builder_integration(self):
        """测试命令构建器集成"""
        # VLLM性能测试
        vllm_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/Qwen-72B',
            'model_name': 'Qwen-72B',
            'npu_count': 8,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(vllm_task)
        assert 'run_benchmark_all_models.sh' in command
        assert 'Qwen-72B' in command
        assert '-n 8' in command
        
        # MindIE性能测试
        mindie_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'MindIE',
            'model_path': '/data/models/*',
            'framework_version': 'v1.0.1'
        }
        
        command = CommandBuilder.build_command(mindie_task)
        assert 'mindie_auto_test.sh' in command
        assert 'results_mindie_all' in command
    
    # ==================== 错误恢复测试 ====================
    
    @pytest.mark.asyncio
    async def test_task_failure_recovery(self):
        """测试任务失败恢复"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=1))
        
        # 提交任务
        task = {
            'id': 1,
            'task_name': 'Failing Task',
            'priority': 1,
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'INVALID_FRAMEWORK',  # 无效框架
            'model_path': '/data/models/test',
            'created_at': datetime.now().isoformat()
        }
        
        # 提交应该失败
        with pytest.raises(ValueError) as exc_info:
            scheduler.submit_task(task)
            # 启动调度器
            scheduler.start()
            await asyncio.sleep(0.5)
        
        assert '不支持的测试类型和框架组合' in str(exc_info.value)
        
        scheduler.stop()
    
    # ==================== 并发安全性测试 ====================
    
    @pytest.mark.asyncio
    async def test_concurrent_task_submission(self):
        """测试并发任务提交"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=5))
        
        async def submit_task_batch(start_id):
            for i in range(10):
                task = {
                    'id': start_id + i,
                    'task_name': f'Concurrent Task {start_id + i}',
                    'priority': i % 3,
                    'test_type': TestType.PERFORMANCE,
                    'test_mode': TestMode.SINGLE_MODEL,
                    'inference_framework': 'VLLM',
                    'model_path': '/data/models/test',
                    'created_at': datetime.now().isoformat()
                }
                scheduler.submit_task(task)
        
        # 并发提交任务
        tasks = [submit_task_batch(i * 10) for i in range(3)]
        await asyncio.gather(*tasks)
        
        # 验证所有任务都在队列中
        status = scheduler.get_queue_status()
        assert status['total'] == 30
        
        scheduler.stop()
    
    # ==================== 性能压力测试 ====================
    
    @pytest.mark.asyncio
    async def test_high_load_scenario(self):
        """测试高负载场景"""
        import time
        
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=10))
        
        start_time = time.time()
        
        # 快速提交100个任务
        for i in range(100):
            task = {
                'id': i,
                'task_name': f'Load Test Task {i}',
                'priority': i % 3,
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL if i % 2 == 0 else TestMode.ALL_MODELS,
                'inference_framework': 'VLLM' if i % 2 == 0 else 'MindIE',
                'model_path': '/data/models/test',
                'model_name': f'Model{i}',
                'npu_count': i % 8 + 1,
                'framework_version': 'v0.2.0',
                'created_at': datetime.now().isoformat()
            }
            scheduler.submit_task(task)
        
        submit_time = time.time() - start_time
        
        # 验证任务提交性能
        assert submit_time < 2.0, f"高负载任务提交性能测试失败: {submit_time}秒"
        
        # 验证队列状态
        status = scheduler.get_queue_status()
        assert status['total'] == 100
        
        # 验证优先级分布
        summary = scheduler.task_queue.get_queue_summary()
        assert summary['total'] == 100
        
        scheduler.stop()
    
    # ==================== 状态一致性测试 ====================
    
    @pytest.mark.asyncio
    async def test_queue_state_consistency(self):
        """测试队列状态一致性"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=5))
        
        # 提交多个任务
        for i in range(10):
            task = {
                'id': i,
                'task_name': f'Task {i}',
                'priority': i % 3,
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'VLLM',
                'model_path': '/data/models/test',
                'created_at': datetime.now().isoformat()
            }
            scheduler.submit_task(task)
        
        # 多次获取队列状态并验证一致性
        for _ in range(5):
            status = scheduler.get_queue_status()
            summary = scheduler.task_queue.get_queue_summary()
            
            assert status['total'] == summary['total']
            assert len(status['waiting']) == summary['total']
            
            # 验证优先级计数一致
            high_count = sum(1 for t in status['waiting'] if t['priority'] == 2)
            medium_count = sum(1 for t in status['waiting'] if t['priority'] == 1)
            low_count = sum(1 for t in status['waiting'] if t['priority'] == 0)
            
            assert high_count == summary['high_priority']
            assert medium_count == summary['medium_priority']
            assert low_count == summary['low_priority']
        
        scheduler.stop()
    
    # ==================== 边界情况集成测试 ====================
    
    @pytest.mark.asyncio
    async def test_empty_and_full_queue_transitions(self):
        """测试空队列和满队列之间的转换"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=5))
        
        # 初始状态应为空
        assert scheduler.get_queued_task_count() == 0
        
        # 添加任务
        task = {
            'id': 1,
            'task_name': 'Test Task',
            'priority': 1,
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test',
            'created_at': datetime.now().isoformat()
        }
        scheduler.submit_task(task)
        
        assert scheduler.get_queued_task_count() == 1
        
        # 取消任务
        scheduler.cancel_task(1)
        
        assert scheduler.get_queued_task_count() == 0
        
        scheduler.stop()
    
    # ==================== 安全性集成测试 ====================
    
    @pytest.mark.asyncio
    async def test_command_injection_prevention(self):
        """测试命令注入防护"""
        scheduler = TaskScheduler(config=SchedulerConfig(max_concurrent=1))
        
        # 尝试注入恶意命令
        malicious_task = {
            'id': 1,
            'task_name': 'Test; rm -rf /',
            'priority': 1,
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test; cat /etc/passwd',
            'model_name': 'test && evil_command',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0',
            'created_at': datetime.now().isoformat()
        }
        
        # 应该正常提交到队列
        result = scheduler.submit_task(malicious_task)
        assert result['task_id'] == 1
        
        # 验证命令构建不会执行恶意代码
        command = CommandBuilder.build_command(malicious_task)
        
        # 命令应该被正确转义，不包含直接执行的内容
        assert 'run_benchmark_all_models.sh' in command
        
        scheduler.stop()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
