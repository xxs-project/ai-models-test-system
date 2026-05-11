"""
命令构建器测试模块

测试命令构建的正确性、完整性和各种边界情况
"""

import pytest
import sys
import os

# 添加backend到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode, Priority, TaskStatus


class TestCommandBuilder:
    """命令构建器测试类"""
    
    # ==================== 功能正确性测试 ====================
    
    def test_build_command_vllm_single_model_performance(self):
        """测试VLLM单模型性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/Qwen-14B',
            'model_name': 'Qwen-14B',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证命令包含正确的参数
        assert 'run_benchmark_all_models.sh' in command
        assert '-b /data/models/Qwen-14B' in command
        assert '-r results_vllm_single' in command
        assert '-m Qwen-14B' in command
        assert '-n 2' in command
        assert '--mode eager' in command
        assert '-e 1' in command
        assert '-d v0.2.0' in command
    
    def test_build_command_vllm_all_models_performance(self):
        """测试VLLM全套模型性能测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/*',
            'execution_flag': '2',
            'framework_version': 'v0.2.1'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command
        assert "'/data/models/*'" in command or '-b /data/models' in command
        assert '-r results_vllm_all' in command
        assert '-e 2' in command
        assert '-d v0.2.1' in command
        # 单模型参数不应出现
        assert '-m' not in command
        assert '-n' not in command
    
    def test_build_command_mindie_single_model(self):
        """测试MindIE单模型测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'MindIE',
            'model_path': '/data/models/Llama-3-8B',
            'model_name': 'Llama-3-8B',
            'npu_count': 4,
            'framework_version': 'v1.0.1'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command
        assert '-b /data/models/Llama-3-8B' in command
        assert '-r results_mindie_single' in command
        assert '-m Llama-3-8B' in command
        assert '-n 4' in command
        assert '-d v1.0.1' in command
        # MindIE不需要mode参数
        assert '--mode' not in command
    
    def test_build_command_mindie_all_models(self):
        """测试MindIE全套模型测试命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'MindIE',
            'model_path': '/data/models/*',
            'framework_version': 'v1.0.1'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command
        assert '-r results_mindie_all' in command
        assert '-d v1.0.1' in command
    
    def test_build_command_accuracy_vllm_single(self):
        """测试VLLM单模型精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/Qwen-72B',
            'model_name': 'Qwen-72B',
            'npu_count': 8,
            'inference_mode': 'eager',
            'dataset_name': 'ceval',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_accuracy_all_models.sh' in command
        assert '-r results_accuracy_single' in command
        assert '--datasets ceval' in command
        assert '--mode eager' in command
    
    def test_build_command_accuracy_vllm_all(self):
        """测试VLLM全套模型精度测试命令构建"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/*',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_accuracy_all_models.sh' in command
        assert '-r results_accuracy_all' in command
    
    # ==================== 边界情况测试 ====================
    
    def test_build_command_with_special_characters(self):
        """测试命令构建处理特殊字符"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/model-v1.0_test',
            'model_name': 'Model-V1.0_Test',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        assert '/data/models/model-v1.0_test' in command
        assert 'Model-V1.0_Test' in command
    
    def test_build_command_framework_case_insensitive(self):
        """测试框架名称大小写不敏感"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'vllm',  # 小写
            'model_path': '/data/models/test',
            'model_name': 'test',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        # 应该正确识别并构建命令
        assert 'run_benchmark_all_models.sh' in command
    
    def test_build_command_with_empty_optional_fields(self):
        """测试带空可选字段的命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/*',
            'execution_flag': '',
            'framework_version': ''
        }
        
        command = CommandBuilder.build_command(task)
        
        # 空值应该被正确处理为默认值
        assert 'run_benchmark_all_models.sh' in command
    
    def test_build_command_with_zero_npu(self):
        """测试NPU数量为0的情况（应转换为1）"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test',
            'model_name': 'test',
            'npu_count': 0,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        command = CommandBuilder.build_command(task)
        
        # NPU数量0应被转换为1（最小值为1）
        assert '-n 1' in command
    
    # ==================== 错误处理测试 ====================
    
    def test_build_command_unsupported_framework(self):
        """测试不支持的框架"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'TensorRT',
            'model_path': '/data/models/test'
        }
        
        with pytest.raises(ValueError) as exc_info:
            CommandBuilder.build_command(task)
        
        assert '不支持的测试类型和框架组合' in str(exc_info.value)
    
    def test_build_command_unsupported_test_type(self):
        """测试不支持的测试类型"""
        task = {
            'test_type': 999,  # 不存在的类型
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test'
        }
        
        with pytest.raises(ValueError) as exc_info:
            CommandBuilder.build_command(task)
        
        assert '不支持的测试类型和框架组合' in str(exc_info.value)
    
    def test_build_command_mindie_accuracy_not_supported(self):
        """测试MindIE精度测试不支持的情况"""
        task = {
            'test_type': TestType.ACCURACY,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'MindIE',
            'model_path': '/data/models/test'
        }
        
        with pytest.raises(ValueError) as exc_info:
            CommandBuilder.build_command(task)
        
        assert '不支持的测试类型和框架组合' in str(exc_info.value)
    
    # ==================== 性能测试 ====================
    
    def test_build_command_performance(self):
        """测试命令构建性能"""
        import time
        
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 'VLLM',
            'model_path': '/data/models/test',
            'model_name': 'test',
            'npu_count': 2,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'framework_version': 'v0.2.0'
        }
        
        start_time = time.time()
        for _ in range(1000):
            CommandBuilder.build_command(task)
        elapsed = time.time() - start_time
        
        # 构建1000个命令应该在1秒内完成
        assert elapsed < 1.0, f"命令构建性能测试失败: {elapsed}秒"
    
    # ==================== 组合测试 ====================
    
    def test_all_command_templates(self):
        """测试所有命令模板"""
        test_cases = [
            # (test_type, test_mode, framework, expected_script)
            (TestType.PERFORMANCE, TestMode.SINGLE_MODEL, 'VLLM', 'run_benchmark_all_models.sh'),
            (TestType.PERFORMANCE, TestMode.ALL_MODELS, 'VLLM', 'run_benchmark_all_models.sh'),
            (TestType.PERFORMANCE, TestMode.SINGLE_MODEL, 'MindIE', 'mindie_auto_test.sh'),
            (TestType.PERFORMANCE, TestMode.ALL_MODELS, 'MindIE', 'mindie_auto_test.sh'),
            (TestType.ACCURACY, TestMode.SINGLE_MODEL, 'VLLM', 'run_accuracy_all_models.sh'),
            (TestType.ACCURACY, TestMode.ALL_MODELS, 'VLLM', 'run_accuracy_all_models.sh'),
        ]
        
        for test_type, test_mode, framework, expected_script in test_cases:
            task = {
                'test_type': test_type,
                'test_mode': test_mode,
                'inference_framework': framework,
                'model_path': '/data/models/test',
                'model_name': 'test',
                'npu_count': 1,
                'graph_mode': 'eager',
                'execution_flag': '1',
                'framework_version': 'v0.2.0'
            }
            
            command = CommandBuilder.build_command(task)
            assert expected_script in command, \
                f"测试类型 {test_type}, 模式 {test_mode}, 框架 {framework} 命令构建失败"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
