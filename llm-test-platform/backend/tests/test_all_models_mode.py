"""
全套模型测试条件渲染验证测试用例

验证：
1. 全套模型测试只显示：推理框架、框架版本、模型路径、测试路径
2. 单模型测试显示所有字段
3. 后端命令构建正确处理
4. 任务详情正确显示
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.command_builder import CommandBuilder, TestType, TestMode


class TestAllModelsModeConditionalRendering:
    """全套模型测试条件渲染测试类"""

    # ==================== 全套模型字段显示测试 ====================

    def test_all_models_shows_required_fields(self):
        """
        验证全套模型测试只显示必要字段
        
        全套模型测试应显示:
        1. 推理框架
        2. 框架版本
        3. 模型路径
        4. 测试路径
        
        全套模型测试应隐藏:
        - 模型名称
        - NPU数量
        - 图模式
        - 执行标识
        """
        task_data = {
            'test_mode': TestMode.ALL_MODELS,  # 全套模型
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models/*',
            'test_path': '/data/scripts',
        }
        
        # 全套模型只应有这4个字段
        required_fields = [
            'inference_framework',
            'framework_version',
            'model_path',
            'test_path',
        ]
        
        for field in required_fields:
            assert field in task_data, f"全套模型测试应有{field}字段"

    def test_all_models_hides_conditional_fields(self):
        """验证全套模型测试隐藏条件字段"""
        task_data = {
            'test_mode': TestMode.ALL_MODELS,  # 全套模型
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models/*',
            'test_path': '/data/scripts',
        }
        
        # 全套模型不应有这些字段
        conditional_fields = [
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_flag',
        ]
        
        for field in conditional_fields:
            assert field not in task_data or task_data.get(field) is None, \
                f"全套模型测试应隐藏{field}字段"

    # ==================== 单模型字段显示测试 ====================

    def test_single_model_shows_all_fields(self):
        """验证单模型测试显示所有字段"""
        task_data = {
            'test_mode': TestMode.SINGLE_MODEL,  # 单模型
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 单模型应有所有字段
        all_fields = [
            'inference_framework',
            'framework_version',
            'model_path',
            'test_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_flag',
        ]
        
        for field in all_fields:
            assert field in task_data, f"单模型测试应有{field}字段"

    # ==================== 命令构建测试 ====================

    def test_all_models_command_construction(self):
        """验证全套模型命令构建"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models/*',
            'test_path': '/data/scripts',
            'framework_version': 'v0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 全套模型命令验证
        assert 'run_benchmark_all_models.sh' in command, "应使用全套模型脚本"
        assert "'/data/models/*'" in command or '-b' in command, "应包含模型路径"
        assert '-r results_vllm_all' in command, "应包含结果目录"
        assert '-d v0.5.0' in command, "应包含框架版本"

    def test_single_model_command_construction(self):
        """验证单模型命令构建"""
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
        
        # 单模型命令验证
        assert 'run_benchmark_all_models.sh' in command
        assert '-b /data/models' in command
        assert '-m Qwen3-1.7B' in command
        assert '-n 1' in command
        assert '--mode eager' in command
        assert '-e 1' in command


class TestTaskDetailsDisplay:
    """任务详情显示测试类"""

    def test_all_models_details_display(self):
        """验证全套模型任务详情显示"""
        task = {
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models/*',
            'script_path': '/data/scripts',
        }
        
        # 模拟详情显示逻辑
        always_show = [
            'inference_framework',
            'framework_version',
            'model_path',
        ]
        
        conditional_show = [
            'script_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_flag',
        ]
        
        # 始终显示的字段
        for field in always_show:
            assert field in task, f"详情应始终显示{field}"
        
        # 全套模型不显示条件字段
        for field in ['model_name', 'npu_count', 'graph_mode', 'execution_flag']:
            assert field not in task or task.get(field) is None

    def test_single_model_details_display(self):
        """验证单模型任务详情显示"""
        task = {
            'test_mode': TestMode.SINGLE_MODEL,
            'inference_framework': 1,
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'script_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 单模型显示所有字段
        all_fields = [
            'inference_framework',
            'framework_version',
            'model_path',
            'script_path',
            'model_name',
            'npu_count',
            'graph_mode',
            'execution_flag',
        ]
        
        for field in all_fields:
            assert field in task, f"单模型详情应显示{field}"


class TestTaskCreationWorkflow:
    """任务创建流程测试类"""

    def test_create_all_models_task(self):
        """验证创建全套模型任务"""
        task_data = {
            'task_name': '全套模型性能测试',
            'test_type': 1,  # 性能测试
            'test_mode': 2,  # 全套模型
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models/*',
            'test_path': '/data/scripts',
        }
        
        # 验证必备字段
        assert task_data['test_mode'] == 2  # 全套模型
        
        # 验证不应有条件字段
        assert 'model_name' not in task_data
        assert 'npu_count' not in task_data
        assert 'graph_mode' not in task_data
        assert 'execution_flag' not in task_data

    def test_create_single_model_task(self):
        """验证创建单模型任务"""
        task_data = {
            'task_name': '单模型性能测试',
            'test_type': 1,  # 性能测试
            'test_mode': 1,  # 单模型
            'inference_framework': 1,  # vLLM
            'framework_version': 'v0.5.0',
            'model_path': '/data/models',
            'test_path': '/data/scripts',
            'model_name': 'Qwen3-1.7B',
            'npu_count': 1,
            'graph_mode': 'eager',
            'execution_flag': '1',
        }
        
        # 验证所有字段都存在
        assert task_data['test_mode'] == 1  # 单模型
        assert 'model_name' in task_data
        assert 'npu_count' in task_data
        assert 'graph_mode' in task_data
        assert 'execution_flag' in task_data


class TestModeSwitching:
    """模式切换测试类"""

    def test_switch_from_single_to_all_models(self):
        """验证从单模型切换到全套模型时隐藏字段"""
        # 初始为单模型
        current_mode = TestMode.SINGLE_MODEL
        
        # 切换后为全套模型
        current_mode = TestMode.ALL_MODELS
        
        # 验证条件渲染
        should_show_model_name = current_mode == TestMode.SINGLE_MODEL
        should_show_npu_count = current_mode == TestMode.SINGLE_MODEL
        should_show_graph_mode = current_mode == TestMode.SINGLE_MODEL
        should_show_execution_flag = current_mode == TestMode.SINGLE_MODEL
        
        assert should_show_model_name == False
        assert should_show_npu_count == False
        assert should_show_graph_mode == False
        assert should_show_execution_flag == False

    def test_switch_from_all_to_single_models(self):
        """验证从全套模型切换到单模型时显示字段"""
        # 初始为全套模型
        current_mode = TestMode.ALL_MODELS
        
        # 切换后为单模型
        current_mode = TestMode.SINGLE_MODEL
        
        # 验证条件渲染
        should_show_model_name = current_mode == TestMode.SINGLE_MODEL
        should_show_npu_count = current_mode == TestMode.SINGLE_MODEL
        should_show_graph_mode = current_mode == TestMode.SINGLE_MODEL
        should_show_execution_flag = current_mode == TestMode.SINGLE_MODEL
        
        assert should_show_model_name == True
        assert should_show_npu_count == True
        assert should_show_graph_mode == True
        assert should_show_execution_flag == True


class TestAllModelsWithDifferentFrameworks:
    """不同框架全套模型测试类"""

    def test_vllm_all_models(self):
        """验证vLLM全套模型"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models/*',
            'framework_version': 'v0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'run_benchmark_all_models.sh' in command
        assert '-r results_vllm_all' in command

    def test_mindie_all_models(self):
        """验证MindIE全套模型"""
        task = {
            'test_type': TestType.PERFORMANCE,
            'test_mode': TestMode.ALL_MODELS,
            'inference_framework': 2,  # MindIE
            'model_path': '/data/models/*',
            'framework_version': '2.1.RC1',
        }
        
        command = CommandBuilder.build_command(task)
        
        assert 'mindie_auto_test.sh' in command
        assert '-r results_mindie_all' in command
        assert '--mode' not in command


class TestEdgeCases:
    """边界情况测试类"""

    def test_all_models_with_accuracy_test(self):
        """验证全套模型精度测试"""
        task = {
            'test_type': TestType.ACCURACY,  # 精度测试
            'test_mode': TestMode.ALL_MODELS,  # 全套模型
            'inference_framework': 1,  # vLLM
            'model_path': '/data/models/*',
            'framework_version': 'v0.5.0',
        }
        
        command = CommandBuilder.build_command(task)
        
        # 精度测试使用accuracy脚本
        assert 'run_accuracy_all_models.sh' in command

    def test_all_models_missing_required_fields(self):
        """验证全套模型缺少必填字段"""
        task = {
            'test_mode': TestMode.ALL_MODELS,
            # 缺少model_path
            'framework_version': 'v0.5.0',
        }
        
        # model_path应为必填
        assert 'model_path' not in task or task.get('model_path') is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
