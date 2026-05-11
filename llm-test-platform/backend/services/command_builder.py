"""
命令构建器模块

根据任务配置构建测试命令
"""

import shlex
import re
from typing import Optional
from enum import IntEnum


class TestType(IntEnum):
    """测试类型"""
    PERFORMANCE = 1   # 性能测试
    ACCURACY = 2      # 精度测试


class TestMode(IntEnum):
    """测试模式"""
    SINGLE_MODEL = 1      # 单模型测试
    ALL_MODELS = 2        # 全套模型测试


class Priority(IntEnum):
    """任务优先级"""
    LOW = 0       # 低
    MEDIUM = 1    # 中
    HIGH = 2      # 高


class TaskStatus(IntEnum):
    """任务状态"""
    PENDING = 0      # 待执行
    QUEUED = 1       # 队列中
    RUNNING = 2      # 执行中（本地准备）
    TESTING = 3      # 测试中（设备上运行）
    COMPLETED = 4    # 已完成
    FAILED = 5       # 失败
    CANCELLED = 6    # 已取消
    TIMEOUT = 7      # 超时


class CommandBuilder:
    """测试命令构建器"""
    
    @staticmethod
    def _sanitize_string(value: str) -> str:
        """
        清理字符串，移除可能导致命令注入的字符
        
        Args:
            value: 输入字符串
            
        Returns:
            str: 清理后的字符串
        """
        if not value:
            return ""
        # 移除或转义危险字符
        # 保留字母、数字、中文、常用符号，移除命令分隔符和替换符
        # 注意：* 在路径中是通配符，应该保留用于glob模式
        # 危险字符包括：命令分隔符、管道、命令替换、IO重定向、空格（可能导致注入）等
        dangerous_chars = r'[;|&$`\<>!#?{}\[\]\n\r\(\)\'\"]| '
        sanitized = re.sub(dangerous_chars, '', str(value))
        return sanitized
    
    @staticmethod
    def _escape_shell_arg(value: str) -> str:
        """
        转义shell参数，防止命令注入
        
        Args:
            value: 输入字符串
            
        Returns:
            str: 转义后的字符串
        """
        if not value:
            return '""'
        # 先清理危险字符
        sanitized = CommandBuilder._sanitize_string(value)
        # 使用shlex.quote确保参数安全
        return shlex.quote(sanitized)
    
    @staticmethod
    def _validate_npu_count(value) -> int:
        """
        验证NPU数量
        
        Args:
            value: 输入值
            
        Returns:
            int: 验证后的NPU数量
        """
        try:
            count = int(value)
            if count < 1:
                return 1
            if count > 128:  # 设置合理的上限
                return 128
            return count
        except (ValueError, TypeError):
            return 1
    
    @staticmethod
    def build_command(task: dict) -> str:
        """
        根据任务配置构建测试命令
        
        Args:
            task: 任务字典
            
        Returns:
            str: 构建好的测试命令
            
        Raises:
            ValueError: 不支持的测试类型和框架组合
        """
        # 获取测试类型
        test_type = task.get('test_type', TestType.PERFORMANCE)
        # 获取测试模式
        test_mode = task.get('test_mode', TestMode.SINGLE_MODEL)
        # 获取推理框架（支持数值1/2和字符串"vllm"/"mindie"）
        framework_raw = task.get('inference_framework', 'VLLM')
        if isinstance(framework_raw, int):
            framework = 'vllm' if framework_raw == 1 else 'mindie'
        else:
            framework = str(framework_raw).lower()
        
        # 性能测试分支
        if test_type == TestType.PERFORMANCE:
            if framework == "vllm":
                if test_mode == TestMode.SINGLE_MODEL:
                    return CommandBuilder.build_command_vllm_single_model(task)
                else:  # ALL_MODELS
                    return CommandBuilder.build_command_vllm_all_models(task)
            elif framework == "mindie":
                if test_mode == TestMode.SINGLE_MODEL:
                    return CommandBuilder.build_command_mindie_single_model(task)
                else:  # ALL_MODELS
                    return CommandBuilder.build_command_mindie_all_models(task)
        
        # 精度测试分支
        elif test_type == TestType.ACCURACY:
            if framework == "vllm":
                if test_mode == TestMode.SINGLE_MODEL:
                    return CommandBuilder.build_command_accuracy_vllm_single_model(task)
                else:  # ALL_MODELS
                    return CommandBuilder.build_command_accuracy_vllm_all_models(task)
        
        raise ValueError(f"不支持的测试类型和框架组合: {test_type}, {framework}")
    
    @staticmethod
    def build_command_vllm_single_model(task: dict) -> str:
        """构建VLLM单模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        npu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))
        graph_mode = CommandBuilder._escape_shell_arg(task.get('graph_mode', 'eager'))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        port = task.get('port')  # Optional port
        
        # 使用包含任务ID的唯一结果目录，避免多任务并发时的冲突
        task_id = task.get('id', '')
        result_dir = f"results_vllm_single_{task_id}" if task_id else "results_vllm_single"
        
        cmd = f"""bash run_benchmark_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {npu_count} \
  --mode {graph_mode} \
  -e {execution_flag} \
  -d {framework_version}"""

        if port:
            cmd += f" --port {port}"
            
        return cmd
    
    @staticmethod
    def build_command_vllm_all_models(task: dict) -> str:
        """构建VLLM全套模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        # 使用包含任务ID的唯一结果目录
        task_id = task.get('id', '')
        result_dir = f"results_vllm_all_{task_id}" if task_id else "results_vllm_all"
        
        return f"""bash run_benchmark_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -e {execution_flag} \
  -d {framework_version}"""
    
    @staticmethod
    def build_command_mindie_single_model(task: dict) -> str:
        """构建MindIE单模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        npu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        # 使用包含任务ID的唯一结果目录
        task_id = task.get('id', '')
        result_dir = f"results_mindie_single_{task_id}" if task_id else "results_mindie_single"
        
        return f"""bash mindie_auto_test.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {npu_count} \
  -d {framework_version}"""
    
    @staticmethod
    def build_command_mindie_all_models(task: dict) -> str:
        """构建MindIE全套模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        # 使用包含任务ID的唯一结果目录
        task_id = task.get('id', '')
        result_dir = f"results_mindie_all_{task_id}" if task_id else "results_mindie_all"
        
        return f"""bash mindie_auto_test.sh \
  -b {model_path} \
  -r {result_dir} \
  -d {framework_version}"""
    
    @staticmethod
    def build_command_accuracy_vllm_single_model(task: dict) -> str:
        """构建VLLM单模型精度测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        npu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))
        inference_mode = CommandBuilder._escape_shell_arg(task.get('inference_mode', 'eager'))
        dataset_name = CommandBuilder._escape_shell_arg(task.get('dataset_name', ''))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        # 使用包含任务ID的唯一结果目录
        task_id = task.get('id', '')
        result_dir = f"results_accuracy_single_{task_id}" if task_id else "results_accuracy_single"
        
        return f"""bash run_accuracy_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {npu_count} \
  --mode {inference_mode} \
  --datasets {dataset_name} \
  -d {framework_version}"""
    
    @staticmethod
    def build_command_accuracy_vllm_all_models(task: dict) -> str:
        """构建VLLM全套模型精度测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        # 使用包含任务ID的唯一结果目录
        task_id = task.get('id', '')
        result_dir = f"results_accuracy_all_{task_id}" if task_id else "results_accuracy_all"
        
        return f"""bash run_accuracy_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -d {framework_version}"""
