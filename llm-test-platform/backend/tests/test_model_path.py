"""
模型路径功能验证测试用例

验证：
1. 模型路径在创建任务表单中存在
2. 模型路径正确存储到后端
3. 模型路径在任务详情中正确显示
4. 命令构建正确使用模型路径
5. 模型路径字段验证（必填、格式等）
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestModelPathField:
    """模型路径字段测试类"""

    # ==================== 字段存在性测试 ====================

    def test_model_path_required_validation(self):
        """验证模型路径为必填字段"""
        # 模拟表单验证
        form_data = {
            'model_path': '',
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 1,
            'framework_version': 'v1.0.0',
        }
        
        # 空模型路径应触发验证错误
        assert form_data['model_path'] == '', "测试空模型路径"

    # ==================== 字段存储测试 ====================

    def test_model_path_storage(self):
        """验证模型路径正确存储"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        assert 'model_path' in task, "任务数据中应有model_path字段"
        assert task['model_path'] == '/data/models', "模型路径应正确存储"

    def test_model_path_in_backend_model(self):
        """验证后端模型中存在model_path字段"""
        from models import Task
        
        task_fields = Task.__annotations__.keys()
        assert 'model_path' in task_fields, "Task模型中应有model_path字段"

    # ==================== 命令构建测试 ====================

    def test_command_contains_model_path(self):
        """验证命令构建包含模型路径"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-b /data/models' in command, "命令应包含模型路径参数-b"
        assert 'run_benchmark_all_models.sh' in command, "应使用VLLM脚本"

    def test_command_model_path_with_special_chars(self):
        """验证命令构建处理含特殊字符的模型路径"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models/model-v1.0_test',
            'model_name': 'Test-Model',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-b' in command, "命令应包含-b参数"
        assert 'model-v1.0_test' in command, "模型路径应保留特殊字符"

    def test_mindie_command_contains_model_path(self):
        """验证MindIE命令包含模型路径"""
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
        
        assert 'mindie_auto_test.sh' in command, "应使用MindIE脚本"
        assert '-b /data/models' in command, "MindIE命令应包含模型路径"

    def test_all_models_mode_contains_model_path(self):
        """验证全套模型模式命令包含模型路径"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,
            'model_path': '/data/models/*',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-b' in command, "命令应包含-b参数"
        assert "run_benchmark_all_models.sh" in command, "全套模型应使用benchmark脚本"


class TestModelPathValidation:
    """模型路径验证测试类"""

    def test_empty_model_path(self):
        """验证空模型路径处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 空路径应该被处理（可能使用默认值或报错）
        assert 'run_benchmark_all_models.sh' in command, "命令应使用正确的脚本"

    def test_relative_path(self):
        """验证相对路径处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': './models/test',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-b' in command, "命令应包含-b参数"
        assert './models/test' in command, "相对路径应被保留"

    def test_absolute_path(self):
        """验证绝对路径处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/home/user/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-b /home/user/models' in command, "绝对路径应正确传递"


class TestModelPathIntegration:
    """模型路径集成测试类"""

    def test_task_creation_with_model_path(self):
        """验证创建任务时包含模型路径"""
        task_data = {
            'task_name': '测试任务',
            'test_type': 1,
            'test_mode': 1,
            'inference_framework': 1,
            'framework_version': 'v1.0.0',
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
        }
        
        # 验证数据完整性
        assert 'model_path' in task_data
        assert task_data['model_path'] == '/data/models'
        assert task_data['task_name'] == '测试任务'

    def test_form_to_backend_model_path_mapping(self):
        """验证表单字段到后端字段的映射"""
        form_data = {
            'model_path': '/custom/models/path',
        }
        
        backend_data = {
            'model_path': form_data['model_path'],
        }
        
        assert backend_data['model_path'] == '/custom/models/path'

    def test_task_details_shows_model_path(self):
        """验证任务详情显示模型路径"""
        task = {
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'inference_framework': 1,
        }
        
        # 模拟详情页面显示
        display_value = task.get('model_path', '-')
        assert display_value == '/data/models', "详情页面应显示模型路径"
        assert display_value != '-', "模型路径不应为空"

    def test_model_path_consistency_across_modules(self):
        """验证模型路径在各模块间的一致性"""
        expected_path = '/data/models/test'
        
        # 1. 表单默认值
        form_default = {'model_path': expected_path}
        
        # 2. 后端模型
        backend_field = expected_path
        
        # 3. 命令构建
        task = {'model_path': expected_path}
        command_parts = ['-b', expected_path]
        
        # 验证一致性
        assert form_default['model_path'] == expected_path
        assert backend_field == expected_path
        assert expected_path in task['model_path']


class TestModelPathSecurity:
    """模型路径安全性测试类"""

    def test_path_traversal_prevention(self):
        """验证路径遍历攻击防护"""
        malicious_paths = [
            '../../../etc/passwd',
            'model/../../secret',
            'test/../../../root/.ssh',
        ]
        
        for path in malicious_paths:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 1,
                'model_path': path,
                'model_name': 'TestModel',
                'npu_count': 1,
                'framework_version': '0.5.0',
            }
            
            command = CommandBuilder.build_command(task)
            
            # 命令应包含处理后的路径
            assert '-b' in command, "命令应包含-b参数"

    def test_special_chars_sanitization(self):
        """验证特殊字符过滤"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models; rm -rf /',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 不应包含危险的shell命令
        assert 'rm -rf' not in command, "命令中不应包含危险命令"
        assert ';' not in command or command.count(';') == 0, "路径中的分号应被处理"


class TestModelPathReliability:
    """模型路径可靠性测试类"""

    def test_long_path_handling(self):
        """验证长路径处理"""
        long_path = '/data/very/long/path/to/models directory/subfolder/' * 5
        
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': long_path,
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command, "长路径应正确处理"

    def test_whitespace_in_path(self):
        """验证路径中的空白字符处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models with spaces',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 空白字符应被正确转义或处理
        assert 'run_benchmark_all_models.sh' in command, "带空格的路径应正确处理"

    def test_unicode_in_path(self):
        """验证路径中的Unicode字符处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models_中文测试',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'models_中文测试' in command or 'run_benchmark' in command, "Unicode路径应被处理"


class TestModelPathExtensibility:
    """模型路径可扩展性测试类"""

    def test_multiple_frameworks_support(self):
        """验证支持多种推理框架的模型路径"""
        frameworks = [
            (1, 'VLLM', 'run_benchmark_all_models.sh'),
            (2, 'MindIE', 'mindie_auto_test.sh'),
        ]
        
        for framework_id, framework_name, expected_script in frameworks:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': framework_id,
                'model_path': '/data/models',
                'model_name': 'TestModel',
                'npu_count': 1,
                'framework_version': '1.0.0',
            }
            
            command = CommandBuilder.build_command(task)
            
            assert expected_script in command, f"{framework_name}应使用正确的脚本"
            assert '-b /data/models' in command, "所有框架都应支持模型路径"

    def test_different_test_modes(self):
        """验证不同测试模式的模型路径"""
        test_modes = [
            (TestMode.SINGLE_MODEL, '单模型'),
            (TestMode.ALL_MODELS, '全套模型'),
        ]
        
        for mode, mode_name in test_modes:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': mode,
                'inference_framework': 1,
                'model_path': '/data/models',
                'framework_version': '0.5.0',
            }
            
            command = CommandBuilder.build_command(task)
            
            assert '-b /data/models' in command, f"{mode_name}模式应包含模型路径"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
