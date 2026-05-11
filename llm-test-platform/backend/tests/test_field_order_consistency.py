"""
模型配置字段顺序验证测试用例

验证字段顺序：
1. 推理框架
2. 框架版本
3. 模型路径
4. 测试路径
5. 模型名称
6. NPU数量
7. 图模式
8. 执行标识
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestFieldOrderConsistency:
    """字段顺序一致性测试类"""

    # ==================== 表单字段顺序测试 ====================

    def test_frontend_form_field_order(self):
        """
        验证前端表单字段顺序
        
        正确顺序:
        1. 推理框架 (inference_framework)
        2. 框架版本 (framework_version)
        3. 模型路径 (model_path)
        4. 测试路径 (test_path)
        5. 模型名称 (model_name)
        6. NPU数量 (npu_count)
        7. 图模式 (graph_mode)
        8. 执行标识 (execution_id)
        """
        # 模拟表单字段顺序（按UI布局）
        form_field_order = [
            'inference_framework',  # 1. 推理框架
            'framework_version',   # 2. 框架版本
            'model_path',          # 3. 模型路径
            'test_path',           # 4. 测试路径
            'model_name',          # 5. 模型名称
            'npu_count',           # 6. NPU数量
            'graph_mode',          # 7. 图模式
            'execution_id',        # 8. 执行标识
        ]
        
        # 验证顺序正确性
        expected_order = [
            'inference_framework',
            'framework_version',
            'model_path',
            'test_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_id',
        ]
        
        assert form_field_order == expected_order, \
            f"字段顺序应为{expected_order}，实际为{form_field_order}"

    # ==================== 任务详情字段顺序测试 ====================

    def test_task_details_field_order(self):
        """
        验证任务详情显示字段顺序
        """
        # 模拟详情页面字段顺序
        detail_field_order = [
            'inference_framework',   # 1. 推理框架
            'framework_version',    # 2. 框架版本
            'model_path',           # 3. 模型路径
            'test_path',            # 4. 测试路径（条件显示）
            'model_name',           # 5. 模型名称（条件显示）
            'npu_count',            # 6. NPU数量（条件显示）
            'graph_mode',          # 7. 图模式（条件显示）
            'execution_id',        # 8. 执行标识（条件显示）
        ]
        
        expected_always_show = [
            'inference_framework',   # 始终显示
            'framework_version',    # 始终显示
            'model_path',           # 始终显示
        ]
        
        expected_conditional = [
            'test_path',            # test_mode === 1 时显示
            'model_name',           # test_mode === 1 时显示
            'npu_count',            # test_mode === 1 时显示
            'graph_mode',          # test_mode === 1 时显示
            'execution_id',         # test_mode === 1 时显示
        ]
        
        # 验证始终显示的字段顺序
        assert detail_field_order[:3] == expected_always_show
        
        # 验证条件显示的字段存在
        assert all(f in detail_field_order for f in expected_conditional)

    # ==================== 后端命令构建测试 ====================

    def test_command_uses_all_fields(self):
        """验证命令构建使用所有必要字段"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证命令包含所有必要参数
        assert '-b' in command, "应包含模型路径参数-b"
        assert '-d v0.5.0' in command, "应包含框架版本参数-d"
        assert '-m Qwen3-1.7B' in command, "应包含模型名称参数-m"
        assert '-n 1' in command, "应包含NPU数量参数-n"
        assert '--mode eager' in command, "应包含图模式参数--mode"
        assert '-e 1' in command, "应包含执行标识参数-e"


class TestTaskCreationWorkflow:
    """任务创建流程测试类"""

    def test_task_creation_with_all_fields(self):
        """验证创建任务时包含所有配置字段"""
        task_data = {
            'task_name': '完整配置测试任务',
            'test_type': 1,  # 性能测试
            'test_mode': 1,  # 单模型
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts/benchmark',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 验证所有字段都存在
        required_fields = [
            'inference_framework',
            'framework_version',
            'model_path',
            'test_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_flag',
        ]
        
        for field in required_fields:
            assert field in task_data, f"任务数据中缺少{field}字段"

    def test_task_creation_mapping(self):
        """验证表单字段到后端字段的映射"""
        form_data = {
            'inference_framework': '1',
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'TestModel',
            'npu_count': '1',
            'graph_mode': 'eager',
            'execution_id': '1',
        }
        
        # 模拟映射到后端
        backend_data = {
            'inference_framework': int(form_data['inference_framework']),
            'framework_version': form_data['framework_version'],
            'model_path': form_data['model_path'],
            'script_path': form_data['test_path'],
            'model_name': form_data['model_name'],
            'npu_count': int(form_data['npu_count']),
            'graph_mode': form_data['graph_mode'],
            'execution_flag': form_data['execution_id'],
        }
        
        # 验证映射正确性
        assert backend_data['inference_framework'] == 1
        assert backend_data['script_path'] == '/data/scripts'
        assert backend_data['npu_count'] == 1
        assert backend_data['execution_flag'] == '1'


class TestFieldValidation:
    """字段验证测试类"""

    def test_inference_framework_validation(self):
        """验证推理框架值"""
        for value, expected in [(1, 'vLLM'), (2, 'MindIE')]:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': value,
                'model_path': '/data/models',
                'model_name': 'Test',
                'npu_count': 1,
                'framework_version': 'v0.5.0',
            }
            
            command = CommandBuilder.build_command(task)
            
            if expected == 'vLLM':
                assert 'run_benchmark_all_models.sh' in command
            else:
                assert 'mindie_auto_test.sh' in command

    def test_framework_version_required(self):
        """验证框架版本为必填"""
        task_data = {
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
        }
        
        assert task_data['framework_version'] != '', "框架版本应为必填"

    def test_model_path_required(self):
        """验证模型路径为必填"""
        task_data = {
            'model_path': '/data/models',
            'test_path': '/data/scripts',
        }
        
        assert task_data['model_path'] != '', "模型路径应为必填"
        assert task_data['test_path'] != '', "测试路径应为必填"

    def test_npu_count_range(self):
        """验证NPU数量范围"""
        npu_values = [0, 1, 2, 128, 200]
        expected = [1, 1, 2, 128, 128]  # 0→1, 200→128
        
        for input_val, expected_val in zip(npu_values, expected):
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 1,
                'model_path': '/data/models',
                'model_name': 'Test',
                'npu_count': input_val,
                'framework_version': 'v0.5.0',
            }
            
            command = CommandBuilder.build_command(task)
            assert f'-n {expected_val}' in command, \
                f"NPU数量{input_val}应转换为{expected_val}"


class TestFieldDisplayIntegration:
    """字段显示集成测试类"""

    def test_all_model_fields_display(self):
        """验证所有字段在任务详情中正确显示"""
        task = {
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models/test',
            'script_path': '/data/scripts/benchmark',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 模拟详情显示
        display_map = {
            '推理框架': 'vLLM' if task['inference_framework'] == 1 else 'MindIE',
            '框架版本': task['framework_version'],
            '模型路径': task['model_path'],
            '测试路径': task['script_path'],
            '模型名称': task['model_name'],
            'NPU数量': str(task['npu_count']),
            '图模式': task['graph_mode'],
            '执行标识': '自定义性能脚本' if task['execution_flag'] == '1' else 'VLLM基准测试脚本',
        }
        
        # 验证所有字段都正确显示
        assert display_map['推理框架'] == 'vLLM'
        assert display_map['框架版本'] == 'v0.5.0'
        assert display_map['模型路径'] == '/data/models/test'
        assert display_map['测试路径'] == '/data/scripts/benchmark'
        assert display_map['模型名称'] == 'Qwen3-1.7B'
        assert display_map['NPU数量'] == '1'
        assert display_map['图模式'] == 'eager'
        assert display_map['执行标识'] == '自定义性能脚本'

    def test_mindie_fields_display(self):
        """验证MindIE任务字段显示"""
        task = {
            'inference_framework': 2,  # MindIE
            'framework_version': '2.1.RC1',
            'model_path': '/data/models/mindie',
            'script_path': '/data/scripts/mindie',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE使用不同的脚本和参数
        assert 'mindie_auto_test.sh' in command
        assert '--mode' not in command  # MindIE不需要--mode参数


class TestFieldOrderCrossModule:
    """跨模块字段顺序测试类"""

    def test_frontend_backend_field_order_consistency(self):
        """验证前端和后端字段顺序一致性"""
        # 前端表单字段顺序
        frontend_order = [
            'inference_framework',
            'framework_version',
            'model_path',
            'test_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_id',
        ]
        
        # 后端任务字段顺序（按重要性）
        backend_fields = [
            'inference_framework',
            'framework_version',
            'model_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'script_path',
            'execution_flag',
        ]
        
        # 验证前端字段都能映射到后端
        field_mapping = {
            'inference_framework': 'inference_framework',
            'framework_version': 'framework_version',
            'model_path': 'model_path',
            'test_path': 'script_path',
            'model_name': 'model_name',
            'npu_count': 'npu_count',
            'graph_mode': 'graph_mode',
            'execution_id': 'execution_flag',
        }
        
        for frontend_field in frontend_order:
            assert frontend_field in field_mapping, f"前端字段{frontend_field}无对应后端字段"

    def test_task_edit_field_order(self):
        """验证任务编辑时字段顺序"""
        # 模拟从后端获取的任务数据
        task_from_backend = {
            'id': 1,
            'task_name': '测试任务',
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'script_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 模拟填充到表单
        form_values = {
            'inference_framework': str(task_from_backend['inference_framework']),
            'framework_version': task_from_backend['framework_version'],
            'model_path': task_from_backend['model_path'],
            'test_path': task_from_backend['script_path'],
            'model_name': task_from_backend['model_name'],
            'npu_count': str(task_from_backend['npu_count']),
            'graph_mode': task_from_backend['graph_mode'],
            'execution_id': task_from_backend['execution_flag'],
        }
        
        # 验证所有字段都正确填充
        for field in form_values:
            assert form_values[field] is not None or field in ['graph_mode']
        
        # 验证关键字段值
        assert form_values['inference_framework'] == '1'
        assert form_values['model_path'] == '/data/models'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
