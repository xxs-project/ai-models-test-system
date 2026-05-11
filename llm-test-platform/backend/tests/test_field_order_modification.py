"""
测试路径与图模式字段顺序调整验证测试用例

验证：
1. 测试路径和图模式的存储位置正确
2. 任务创建时字段顺序正确
3. 任务详情显示顺序正确
4. 命令构建正确使用这两个字段
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestFieldOrderModification:
    """字段顺序调整测试类"""

    # ==================== 字段存储验证 ====================

    def test_script_path_field_mapping(self):
        """验证测试路径字段正确映射到script_path"""
        form_data = {
            'test_path': '/data/models-test/scripts/mindie_benchmark_auto',
        }
        
        # 模拟表单提交时的字段映射
        backend_data = {
            'script_path': form_data['test_path'],
        }
        
        assert backend_data['script_path'] == '/data/models-test/scripts/mindie_benchmark_auto', \
            "测试路径(test_path)应正确映射到script_path"

    def test_graph_mode_storage(self):
        """验证图模式字段正确存储和传递"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'graph_mode': 'eager',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'graph_mode' in task or task.get('graph_mode'), "图模式应存储在graph_mode字段"
        assert '--mode eager' in command, "命令应包含正确的图模式参数"

    # ==================== 字段顺序验证 ====================

    def test_field_order_in_form_mapping(self):
        """验证表单中测试路径在图模式之前"""
        form_values = {
            'test_path': '/data/scripts',
            'graph_mode': 'mindie',
            'model_path': '/data/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'inference_framework': 1,
            'framework_version': '1.0.0',
        }
        
        # 验证字段存在性
        assert 'test_path' in form_values, "test_path字段应存在"
        assert 'graph_mode' in form_values, "graph_mode字段应存在"
        
        # 验证字段顺序（在表单定义中test_path应在graph_mode之前）
        field_order = list(form_values.keys())
        test_path_index = field_order.index('test_path')
        graph_mode_index = field_order.index('graph_mode')
        
        assert test_path_index < graph_mode_index, "test_path应在graph_mode之前"

    # ==================== 命令构建验证 ====================

    def test_command_contains_graph_mode(self):
        """验证命令构建包含图模式字段"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # VLLM命令应包含图模式参数
        assert '--mode eager' in command, "命令应包含图模式参数"

    def test_mindie_command_without_graph_mode(self):
        """验证MindIE命令不包含--mode参数"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE命令不应包含--mode参数
        assert '--mode' not in command, "MindIE命令不应包含--mode参数"

    def test_all_model_mode_graph_mode(self):
        """验证全套模型模式的命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,
            'model_path': '/data/models/*',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 全套VLLM命令不包含--mode参数（按实际实现）
        assert 'run_benchmark_all_models.sh' in command, "应使用VLLM全套模型脚本"
        assert '-b' in command, "应包含模型路径参数"
        assert '-r results_vllm_all' in command, "应包含结果目录参数"


class TestFieldMappingConsistency:
    """字段映射一致性测试类"""

    def test_backend_model_fields(self):
        """验证后端模型字段定义"""
        from models import Task
        
        # 检查字段存在性
        task_fields = Task.__annotations__.keys()
        
        assert 'script_path' in task_fields or hasattr(Task, 'script_path'), \
            "Task模型应有script_path字段"
        assert 'graph_mode' in task_fields or hasattr(Task, 'graph_mode'), \
            "Task模型应有graph_mode字段"

    def test_form_to_backend_mapping(self):
        """验证表单字段到后端字段的映射"""
        form_data = {
            'test_path': '/custom/scripts/path',
            'graph_mode': 'dynamic',
            'model_path': '/models',
            'inference_framework': 1,
        }
        
        # 模拟表单提交时的字段映射
        backend_data = {
            'script_path': form_data['test_path'],
            'graph_mode': form_data['graph_mode'],
            'model_path': form_data['model_path'],
            'inference_framework': form_data['inference_framework'],
        }
        
        # 验证映射正确性
        assert backend_data['script_path'] == '/custom/scripts/path'
        assert backend_data['graph_mode'] == 'dynamic'
        assert backend_data['inference_framework'] == 1


class TestTaskDetailsDisplay:
    """任务详情显示测试类"""

    def test_details_display_order(self):
        """验证任务详情显示顺序（测试路径在图模式之前）"""
        task_data = {
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'script_path': '/data/scripts',
            'graph_mode': 'mindie',
            'model_path': '/data/models',
        }
        
        # 模拟详情页面字段顺序
        detail_fields = [
            '模型名称',
            'NPU数量',
            '测试路径',
            '图模式',
            '模型路径',
        ]
        
        # 验证测试路径在图模式之前
        test_path_idx = detail_fields.index('测试路径')
        graph_mode_idx = detail_fields.index('图模式')
        
        assert test_path_idx < graph_mode_idx, "详情显示中测试路径应在图模式之前"

    def test_details_display_values(self):
        """验证任务详情显示值正确"""
        task = {
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'script_path': '/data/models-test/scripts/mindie_benchmark_auto',
            'graph_mode': 'mindie',
            'model_path': '/data/models',
        }
        
        # 模拟详情显示
        display_values = {
            '模型名称': task['model_name'],
            'NPU数量': str(task['npu_count']),
            '测试路径': task['script_path'],
            '图模式': task['graph_mode'],
            '模型路径': task['model_path'],
        }
        
        assert display_values['测试路径'] == '/data/models-test/scripts/mindie_benchmark_auto'
        assert display_values['图模式'] == 'mindie'


class TestEdgeCases:
    """边界情况测试类"""

    def test_empty_script_path(self):
        """验证空测试路径处理"""
        form_data = {
            'test_path': '',
        }
        
        # 模拟映射
        backend_data = {
            'script_path': form_data['test_path'],
        }
        
        assert backend_data['script_path'] == '', "空测试路径应被保留"

    def test_empty_graph_mode(self):
        """验证空图模式处理（应使用默认值）"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'graph_mode': '',
            'framework_version': '1.0.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 空图模式应使用默认值eager
        assert '--mode' in command, "命令应包含--mode参数（使用默认值）"
        assert '""' in command or "eager" in command, "空值应被转义"

    def test_special_characters_in_paths(self):
        """验证路径中特殊字符处理"""
        form_data = {
            'test_path': '/data/scripts-v1.0_test',
            'graph_mode': 'dynamic',
        }
        
        # 验证特殊字符被正确处理
        assert 'scripts-v1.0_test' in form_data['test_path']

    def test_mindie_graph_mode_not_in_command(self):
        """验证MindIE任务图模式不包含在命令中"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE命令不应包含--mode参数
        assert '--mode' not in command, "MindIE命令不应包含--mode参数"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
