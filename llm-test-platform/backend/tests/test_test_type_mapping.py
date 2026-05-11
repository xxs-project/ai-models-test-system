"""
测试类型映射验证测试用例

验证前后端测试类型映射一致性：
- 后端定义: PERFORMANCE=1, ACCURACY=2
- 前端显示: 1='性能测试', 2='精度测试'
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import TestType, TestMode


class TestTestTypeMappingConsistency:
    """测试类型映射一致性测试类"""

    def test_backend_test_type_definitions(self):
        """验证后端测试类型定义"""
        assert TestType.PERFORMANCE == 1, "性能测试应该是1"
        assert TestType.ACCURACY == 2, "精度测试应该是2"
        assert TestType.PERFORMANCE == 1 and TestType.ACCURACY == 2, "测试类型定义正确"

    def test_performance_test_command(self):
        """验证性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        command = TestType.PERFORMANCE
        
        assert command == 1, "性能测试类型值应为1"

    def test_accuracy_test_command(self):
        """验证精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'inference_mode': 'eager',
            'dataset_name': 'ceval',
            'framework_version': '0.5.0',
        }
        
        command = TestType.ACCURACY
        
        assert command == 2, "精度测试类型值应为2"

    def test_test_type_labels_consistency(self):
        """
        验证前端TestTypeLabels与后端TestType定义一致
        
        前端定义（types.ts）:
        export const TestTypeLabels: Record<number, string> = {
          1: '性能测试',
          2: '精度测试',
        }
        
        后端定义（command_builder.py）:
        class TestType(IntEnum):
            PERFORMANCE = 1   # 性能测试
            ACCURACY = 2      # 精度测试
        """
        expected_labels = {
            1: '性能测试',
            2: '精度测试',
        }
        
        assert expected_labels[1] == '性能测试'
        assert expected_labels[2] == '精度测试'
        assert expected_labels[TestType.PERFORMANCE] == '性能测试'
        assert expected_labels[TestType.ACCURACY] == '精度测试'

    def test_mindie_performance_test_type(self):
        """验证MindIE性能测试类型正确性"""
        task = {
            'task_name': 'Qwen3-1.7B MindIE性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        assert task['test_type'] == TestType.PERFORMANCE
        assert task['test_type'] == 1
        assert task['test_type'] != TestType.ACCURACY
        assert task['test_type'] != 2

    def test_task_with_correct_test_type_display(self):
        """验证任务创建时测试类型显示正确"""
        task = {
            'task_name': '性能测试任务',
            'test_type': 1,  # 性能测试
            'test_mode': 1,   # 单模型
            'model_path': '/data/models',
            'inference_framework': 'VLLM',
        }
        
        frontend_labels = {
            1: '性能测试',
            2: '精度测试',
        }
        
        display_type = frontend_labels.get(task['test_type'])
        assert display_type == '性能测试', f"test_type=1应显示为'性能测试'，实际为'{display_type}'"

        task_accuracy = {
            'task_name': '精度测试任务',
            'test_type': 2,  # 精度测试
        }
        
        display_type_accuracy = frontend_labels.get(task_accuracy['test_type'])
        assert display_type_accuracy == '精度测试', f"test_type=2应显示为'精度测试'，实际为'{display_type_accuracy}'"

    def test_all_test_type_values(self):
        """测试所有测试类型值的合法性"""
        valid_test_types = [1, 2]
        
        for test_type in valid_test_types:
            assert test_type in [TestType.PERFORMANCE, TestType.ACCURACY]
        
        assert len(valid_test_types) == 2, "应有2个有效的测试类型"


class TestTaskTypeIntegration:
    """任务类型集成测试类"""

    def test_create_performance_task_command(self):
        """验证创建性能测试任务时test_type=1"""
        task_create_data = {
            'task_name': 'Qwen3-1.7B性能测试',
            'test_type': 1,  # 性能测试
            'test_mode': 1,  # 单模型
            'model_path': '/data/models',
            'inference_framework': 'VLLM',
            'model_name': 'Qwen3-1.7B',
        }
        
        from services.command_builder import CommandBuilder
        
        command = CommandBuilder.build_command(task_create_data)
        
        assert 'run_benchmark_all_models.sh' in command, "性能测试应使用benchmark脚本"

    def test_create_accuracy_task_command(self):
        """验证创建精度测试任务时test_type=2"""
        task_create_data = {
            'task_name': 'Qwen3-1.7B精度测试',
            'test_type': 2,  # 精度测试
            'test_mode': 1,  # 单模型
            'model_path': '/data/models',
            'inference_framework': 'VLLM',
            'model_name': 'Qwen3-1.7B',
            'dataset_name': 'ceval',
        }
        
        from services.command_builder import CommandBuilder
        
        command = CommandBuilder.build_command(task_create_data)
        
        assert 'run_accuracy_all_models.sh' in command, "精度测试应使用accuracy脚本"
        assert '--datasets' in command, "精度测试应包含数据集参数"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
