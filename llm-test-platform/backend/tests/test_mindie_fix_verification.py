"""
MindIE性能测试修复验证测试用例

验证MindIE命令构建器修复：
1. 验证MindIE单模型命令不包含--mode参数
2. 验证MindIE全套模型命令不包含--mode参数
3. 验证命令包含所有必需参数
4. 验证参数正确转义
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestMindIECommandFix:
    """MindIE命令构建修复验证测试类"""

    def test_mindie_single_model_command_structure(self):
        """测试MindIE单模型命令结构（不含--mode参数）"""
        task = {
            'task_name': 'Qwen3-1.7B MindIE性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'framework_version': '2.1.RC1-800I-A2-py311-openeuler24.03-lts',
            'execution_flag': '1',
            'script_path': '/data/models-test/scripts/mindie_benchmark_auto'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command, "应使用MindIE脚本"
        assert '-b' in command, "应包含模型路径参数"
        assert '-r' in command, "应包含结果路径参数"
        assert '-m' in command, "应包含模型名称参数"
        assert '-n' in command, "应包含NPU数量参数"
        assert '-d' in command, "应包含框架版本参数"
        assert '--mode' not in command, "MindIE脚本不支持--mode参数，修复后应不存在"
        assert 'results_mindie_single' in command, "结果目录应为single模式"
        assert 'Qwen3-1.7B' in command, "应包含模型名称"
        assert '/data/models' in command, "应包含模型路径"

    def test_mindie_all_models_command_structure(self):
        """测试MindIE全套模型命令结构（不含--mode参数）"""
        task = {
            'task_name': 'MindIE全套模型性能测试',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'mindie',
            'model_path': '/data/models',
            'framework_version': '2.1.RC1-800I-A2-py311-openeuler24.03-lts',
            'graph_mode': 'mindie',
            'script_path': '/data/models-test/scripts/mindie_benchmark_auto'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command, "应使用MindIE脚本"
        assert '-b' in command, "应包含模型路径参数"
        assert '-r' in command, "应包含结果路径参数"
        assert '-d' in command, "应包含框架版本参数"
        assert '--mode' not in command, "MindIE脚本不支持--mode参数，修复后应不存在"
        assert 'results_mindie_all' in command, "结果目录应为all模式"

    def test_mindie_command_with_special_characters(self):
        """测试MindIE命令参数转义（安全性测试）"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'framework_version': 'test-version',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert ';' not in command, "命令中不应包含分号（命令注入风险）"
        assert '|' not in command, "命令中不应包含管道符（命令注入风险）"
        assert '&' not in command, "命令中不应包含&符（命令注入风险）"
        assert '$' not in command, "命令中不应包含$符（命令注入风险）"
        assert '`' not in command, "命令中不应包含反引号（命令注入风险）"

    def test_mindie_command_execution_flag_handling(self):
        """测试MindIE命令执行标识处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '-n 1' in command, "NPU数量应为1"
        assert 'Qwen3-1.7B' in command, "模型名称应正确传递"

    def test_mindie_command_npu_count_range(self):
        """测试MindIE命令NPU数量范围验证"""
        test_cases = [
            (0, 1),    # 0应转换为1
            (1, 1),    # 1应保持1
            (2, 2),    # 2应保持2
            (128, 128), # 128应保持128
            (200, 128), # 超过128应限制为128
            ('invalid', 1), # 无效值应默认为1
        ]
        
        for input_count, expected_count in test_cases:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 'mindie',
                'model_name': 'TestModel',
                'model_path': '/data/models',
                'npu_count': input_count,
                'framework_version': 'test',
            }
            
            command = CommandBuilder.build_command(task)
            assert f'-n {expected_count}' in command, f"NPU数量{input_count}应转换为{expected_count}"

    def test_mindie_vs_vllm_command_differences(self):
        """测试MindIE与VLLM命令差异（确保正确区分）"""
        mindie_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'framework_version': '2.1.RC1',
        }
        
        vllm_task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',
            'model_name': 'Qwen3-1.7B',
            'model_path': '/data/models',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': '0.5.0',
        }
        
        mindie_command = CommandBuilder.build_command(mindie_task)
        vllm_command = CommandBuilder.build_command(vllm_task)
        
        assert 'mindie_auto_test.sh' in mindie_command
        assert 'run_benchmark_all_models.sh' in vllm_command
        assert '--mode' not in mindie_command, "MindIE命令不应包含--mode"
        assert '--mode' in vllm_command, "VLLM命令应包含--mode"


class TestMindIEArgumentValidation:
    """MindIE参数验证测试类"""

    def test_empty_model_path_handling(self):
        """测试空模型路径处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Test',
            'model_path': '',
            'npu_count': 1,
            'framework_version': 'test',
        }
        
        command = CommandBuilder.build_command(task)
        assert '""' in command, "空路径应转义为空字符串"

    def test_empty_framework_version_handling(self):
        """测试空框架版本处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'mindie',
            'model_name': 'Test',
            'model_path': '/data/models',
            'npu_count': 1,
            'framework_version': '',
        }
        
        command = CommandBuilder.build_command(task)
        assert 'mindie_auto_test.sh' in command


class TestMindIECommandCompleteness:
    """MindIE命令完整性测试类"""

    def test_complete_mindie_single_model_command(self):
        """测试完整的MindIE单模型命令"""
        task = {
            'task_name': 'Qwen3-1.7B MindIE性能测试',
            'priority': '高',
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'MindIE',
            'framework_version': '2.1.RC1-800I-A2-py311-openeuler24.03-lts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'model_path': '/data/models',
            'script_path': '/data/models-test/scripts/mindie_benchmark_auto',
            'execution_flag': '1'
        }
        
        command = CommandBuilder.build_command(task)
        
        expected_params = [
            'bash mindie_auto_test.sh',
            '-b /data/models',
            '-r results_mindie_single',
            '-m Qwen3-1.7B',
            '-n 1',
            '-d 2.1.RC1-800I-A2-py311-openeuler24.03-lts',
        ]
        
        for param in expected_params:
            assert param in command, f"命令应包含参数: {param}"
        
        assert '--mode' not in command, "MindIE命令不应包含--mode参数"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
