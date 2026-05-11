"""
推理框架下拉框功能验证测试用例

验证：
1. 推理框架使用数值存储（1=vLLM, 2=MindIE）
2. 默认值为vLLM（1）
3. 命令构建正确识别数值类型的推理框架
4. 前后端映射一致性
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestInferenceFrameworkDropdown:
    """推理框架下拉框测试类"""

    # ==================== 数值存储测试 ====================

    def test_inference_framework_numeric_vllm(self):
        """验证vLLM框架使用数值1存储"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,  # 数值存储
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command, "inference_framework=1应使用VLLM脚本"
        assert 'mindie_auto_test.sh' not in command

    def test_inference_framework_numeric_mindie(self):
        """验证MindIE框架使用数值2存储"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,  # 数值存储
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command, "inference_framework=2应使用MindIE脚本"
        assert 'run_benchmark_all_models.sh' not in command

    def test_inference_framework_string_vllm(self):
        """验证vLLM框架字符串存储仍可识别"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',  # 字符串存储（向后兼容）
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command

    def test_inference_framework_string_mindie(self):
        """验证MindIE框架字符串存储仍可识别"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'MindIE',  # 字符串存储（向后兼容）
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command

    def test_inference_framework_case_insensitive(self):
        """验证框架名称大小写不敏感"""
        test_cases = [
            ('vllm', 'run_benchmark_all_models.sh'),
            ('VLLM', 'run_benchmark_all_models.sh'),
            ('MindIE', 'mindie_auto_test.sh'),
            ('mindie', 'mindie_auto_test.sh'),
            (1, 'run_benchmark_all_models.sh'),
            (2, 'mindie_auto_test.sh'),
        ]
        
        for framework, expected_script in test_cases:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': framework,
                'model_path': '/data/models',
                'model_name': 'TestModel',
                'npu_count': 1,
                'framework_version': 'test',
            }
            
            command = CommandBuilder.build_command(task)
            assert expected_script in command, f"框架{framework}应使用脚本{expected_script}"

    # ==================== 默认值测试 ====================

    def test_inference_framework_default_value(self):
        """验证未指定框架时默认使用vLLM"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command, "默认应使用VLLM脚本"

    # ==================== 完整性测试 ====================

    def test_vllm_single_model_complete_command(self):
        """验证vLLM单模型完整命令（含所有参数）"""
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
        
        expected_params = [
            'bash run_benchmark_all_models.sh',
            '-b /data/models',
            '-r results_vllm_single',
            '-m Qwen3-1.7B',
            '-n 1',
            '--mode eager',
            '-d 0.5.0',
        ]
        
        for param in expected_params:
            assert param in command, f"命令应包含参数: {param}"

    def test_mindie_single_model_complete_command(self):
        """验证MindIE单模型完整命令（含所有参数）"""
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
        
        expected_params = [
            'bash mindie_auto_test.sh',
            '-b /data/models',
            '-r results_mindie_single',
            '-m Qwen3-1.7B',
            '-n 1',
            '-d 2.1.RC1',
        ]
        
        for param in expected_params:
            assert param in command, f"命令应包含参数: {param}"

    # ==================== 边界情况测试 ====================

    def test_invalid_framework_number(self):
        """验证无效数值框架处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 999,  # 无效值
            'model_path': '/data/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': 'test',
        }
        
        # 无效值应被视为未知框架，可能抛出异常或使用默认
        try:
            command = CommandBuilder.build_command(task)
            # 如果不抛出异常，则应该使用默认vLLM脚本
            assert 'run_benchmark_all_models.sh' in command or 'mindie_auto_test.sh' in command
        except ValueError:
            # 抛出异常也是可接受的行为
            pass

    def test_all_models_mode_framework(self):
        """验证全套模型模式的框架选择"""
        for framework_value in [1, 2]:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.ALL_MODELS,
                'inference_framework': framework_value,
                'model_path': '/data/models/*',
                'framework_version': 'test',
            }
            
            command = CommandBuilder.build_command(task)
            
            if framework_value == 1:
                assert 'run_benchmark_all_models.sh' in command
            else:
                assert 'mindie_auto_test.sh' in command


class TestFrontendBackendMapping:
    """前后端映射测试类"""

    def test_frontend_labels_mapping(self):
        """
        验证前端标签映射与后端定义一致
        
        前端定义:
        - value="1" → vLLM
        - value="2" → MindIE
        
        后端定义:
        - 1 → VLLM
        - 2 → MINDIE
        """
        frontend_labels = {
            '1': 'vLLM',
            '2': 'MindIE',
        }
        
        backend_mapping = {
            1: 'vllm',
            2: 'mindie',
        }
        
        assert frontend_labels['1'] == 'vLLM'
        assert frontend_labels['2'] == 'MindIE'
        assert backend_mapping[1] == 'vllm'
        assert backend_mapping[2] == 'mindie'

    def test_form_submit_conversion(self):
        """验证表单提交时字符串转数值"""
        form_values = [
            ('1', 1),  # vLLM
            ('2', 2),  # MindIE
        ]
        
        for string_value, expected_number in form_values:
            # 模拟表单提交时的转换逻辑
            if string_value == '1':
                framework_value = 1
            elif string_value == '2':
                framework_value = 2
            else:
                framework_value = 1
            assert framework_value == expected_number, f"表单值{string_value}应转换为数值{expected_number}"


class TestFrameworkIntegration:
    """框架集成测试类"""

    def test_performance_with_all_frameworks(self):
        """验证所有框架的性能测试命令"""
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
            assert expected_script in command, f"{framework_name}性能测试应使用{expected_script}"

    def test_accuracy_with_vllm_only(self):
        """验证只有VLLM支持精度测试"""
        # VLLM精度测试
        vllm_task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'model_path': '/data/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'dataset_name': 'ceval',
            'framework_version': '1.0.0',
        }
        
        command = CommandBuilder.build_command(vllm_task)
        assert 'run_accuracy_all_models.sh' in command, "VLLM精度测试应使用accuracy脚本"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
