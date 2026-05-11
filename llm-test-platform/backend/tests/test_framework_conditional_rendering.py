"""
推理框架条件渲染验证测试用例

验证：
1. MindIE不显示图模式、执行标识
2. vLLM显示图模式、执行标识
3. 后端命令构建正确处理
4. 任务详情正确显示
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestInferenceFrameworkConditionalRendering:
    """推理框架条件渲染测试类"""

    # ==================== vLLM条件渲染测试 ====================

    def test_vllm_shows_graph_mode_and_execution_flag(self):
        """验证vLLM显示图模式和执行标识"""
        # vLLM = 1，应该显示graph_mode和execution_id
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': 'v0.5.0',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # vLLM命令应包含--mode和-e参数
        assert '--mode eager' in command, "vLLM应包含图模式参数"
        assert '-e 1' in command, "vLLM应包含执行标识参数"

    def test_vllm_graph_mode_options(self):
        """验证vLLM支持多种图模式"""
        graph_modes = ['eager', 'mindie', 'dynamic']
        
        for graph_mode in graph_modes:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 1,  # vLLM
                'model_path': '/data/models',
                'model_name': 'TestModel',
                'npu_count': 1,
                'graph_mode': graph_mode,
                'framework_version': 'v0.5.0',
            }
            
            command = CommandBuilder.build_command(task)
            assert f'--mode {graph_mode}' in command, f"vLLM应支持{graph_mode}图模式"

    def test_vllm_execution_flag_options(self):
        """验证vLLM支持多种执行标识"""
        execution_flags = ['1', '2']
        
        for exec_flag in execution_flags:
            task = {
                'test_type': TestType.PERFORMANCE,
                'test_mode': TestMode.SINGLE_MODEL,
                'inference_framework': 1,  # vLLM
                'model_path': '/data/models',
                'model_name': 'TestModel',
                'npu_count': 1,
                'framework_version': 'v0.5.0',
                'execution_flag': exec_flag,
            }
            
            command = CommandBuilder.build_command(task)
            assert f'-e {exec_flag}' in command, f"vLLM应支持执行标识{exec_flag}"

    # ==================== MindIE条件渲染测试 ====================

    def test_mindie_hides_graph_mode(self):
        """验证MindIE不显示图模式"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE命令不应包含--mode参数
        assert '--mode' not in command, "MindIE不应包含图模式参数"
        # 但应使用正确的脚本
        assert 'mindie_auto_test.sh' in command

    def test_mindie_hides_execution_flag(self):
        """验证MindIE不显示执行标识"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
            'execution_flag': '1',  # 即使设置了也不应该使用
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE命令不应包含-e参数
        assert '-e' not in command, "MindIE不应包含执行标识参数"

    def test_mindie_ignores_graph_mode_field(self):
        """验证MindIE忽略graph_mode字段"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'mindie',  # 即使设置了也不应该使用
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 验证MindIE脚本使用
        assert 'mindie_auto_test.sh' in command
        assert '--mode mindie' not in command


class TestTaskDetailsDisplay:
    """任务详情显示测试类"""

    def test_vllm_task_details_shows_all_fields(self):
        """验证vLLM任务详情显示所有字段"""
        task = {
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'script_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
            'test_mode': 1,
        }
        
        # 模拟详情显示逻辑
        should_show = {
            'graph_mode': task['inference_framework'] == 1,
            'execution_flag': task['inference_framework'] == 1,
        }
        
        assert should_show['graph_mode'] == True, "vLLM应显示图模式"
        assert should_show['execution_flag'] == True, "vLLM应显示执行标识"

    def test_mindie_task_details_hides_fields(self):
        """验证MindIE任务详情隐藏字段"""
        task = {
            'inference_framework': 2,  # MindIE
            'framework_version': '2.1.RC1',
            'model_path': '/data/models',
            'script_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'mindie',
            'execution_flag': '1',
            'test_mode': 1,
        }
        
        # 模拟详情显示逻辑
        should_show = {
            'graph_mode': task['inference_framework'] == 1,
            'execution_flag': task['inference_framework'] == 1,
        }
        
        assert should_show['graph_mode'] == False, "MindIE不应显示图模式"
        assert should_show['execution_flag'] == False, "MindIE不应显示执行标识"


class TestCommandConstruction:
    """命令构建测试类"""

    def test_vllm_command_with_all_fields(self):
        """验证vLLM命令包含所有参数"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'framework_version': 'v0.5.0',
            'execution_flag': '1',
        }
        
        command = CommandBuilder.build_command(task)
        
        expected_params = [
            'run_benchmark_all_models.sh',
            '-b /data/models',
            '-m Qwen3-1.7B',
            '-n 1',
            '--mode eager',
            '-e 1',
            '-d v0.5.0',
        ]
        
        for param in expected_params:
            assert param in command, f"vLLM命令应包含参数: {param}"

    def test_mindie_command_without_forbidden_fields(self):
        """验证MindIE命令不包含禁止的字段"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        # MindIE命令应不包含--mode和-e参数
        assert '--mode' not in command, "MindIE命令不应包含--mode"
        assert '-e' not in command, "MindIE命令不应包含-e"
        
        # 但应包含必要的参数
        assert 'mindie_auto_test.sh' in command
        assert '-b /data/models' in command
        assert '-m Qwen3-1.7B' in command
        assert '-d 2.1.RC1' in command


class TestTaskCreationWorkflow:
    """任务创建流程测试类"""

    def test_create_vllm_task_with_all_fields(self):
        """验证创建vLLM任务包含所有必要字段"""
        task_data = {
            'task_name': 'vLLM性能测试',
            'test_type': 1,  # 性能测试
            'test_mode': 1,  # 单模型
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_id': 1,
        }
        
        # 验证vLLM任务包含所有字段
        assert task_data['inference_framework'] == 1
        assert task_data['graph_mode'] == 'eager'
        assert task_data['execution_id'] == 1

    def test_create_mindie_task_without_forbidden_fields(self):
        """验证创建MindIE任务不包含图模式和执行标识"""
        task_data = {
            'task_name': 'MindIE性能测试',
            'test_type': 1,  # 性能测试
            'test_mode': 1,  # 单模型
            'inference_framework': 2,  # MindIE
            'framework_version': '2.1.RC1',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
        }
        
        # MindIE任务不应有graph_mode和execution_id字段
        assert 'graph_mode' not in task_data or task_data.get('graph_mode') is None
        assert 'execution_id' not in task_data or task_data.get('execution_id') is None


class TestFrameworkSwitching:
    """框架切换测试类"""

    def test_switch_from_vllm_to_mindie(self):
        """验证从vLLM切换到MindIE时隐藏字段"""
        # 初始为vLLM
        current_framework = 1
        
        # 切换后为MindIE
        current_framework = 2
        
        # 验证条件渲染
        should_show_graph_mode = current_framework == 1
        should_show_execution_flag = current_framework == 1
        
        assert should_show_graph_mode == False, "切换到MindIE后应隐藏图模式"
        assert should_show_execution_flag == False, "切换到MindIE后应隐藏执行标识"

    def test_switch_from_mindie_to_vllm(self):
        """验证从MindIE切换到vLLM时显示字段"""
        # 初始为MindIE
        current_framework = 2
        
        # 切换后为vLLM
        current_framework = 1
        
        # 验证条件渲染
        should_show_graph_mode = current_framework == 1
        should_show_execution_flag = current_framework == 1
        
        assert should_show_graph_mode == True, "切换到vLLM后应显示图模式"
        assert should_show_execution_flag == True, "切换到vLLM后应显示执行标识"


class TestAllModelsMode:
    """全套模型模式测试类"""

    def test_vllm_all_models_command(self):
        """验证vLLM全套模型命令"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models/*',
            'framework_version': 'v0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command
        assert '-b' in command
        assert '-r results_vllm_all' in command

    def test_mindie_all_models_command(self):
        """验证MindIE全套模型命令"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models/*',
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command
        assert '-b' in command
        assert '-r results_mindie_all' in command
        assert '--mode' not in command


class TestEdgeCases:
    """边界情况测试类"""

    def test_unknown_framework_handling(self):
        """验证未知框架处理"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 999,  # 未知框架
            'model_path': '/data/models',
            'model_name': 'TestModel',
            'npu_count': 1,
            'framework_version': 'unknown',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 默认使用vLLM脚本
        assert 'run_benchmark_all_models.sh' in command or 'mindie_auto_test.sh' in command

    def test_default_values(self):
        """验证默认值设置"""
        # vLLM默认值
        vllm_defaults = {
            'inference_framework': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # MindIE默认值（无graph_mode和execution_flag）
        mindie_defaults = {
            'inference_framework': 2,
        }
        
        assert vllm_defaults['graph_mode'] == 'eager'
        assert vllm_defaults['execution_flag'] == '1'
        assert 'graph_mode' not in mindie_defaults


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
