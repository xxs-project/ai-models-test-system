"""
命令构建器模块

根据任务配置构建测试命令
"""

import shlex
import re
import json
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
        # 危险字符包括：命令分隔符、管道、命令替换、IO重定向等
        # 注意：不再移除空格，因为 shlex.quote 会安全地处理带空格的参数
        dangerous_chars = r'[;|&$`\<>!#?{}\[\]\n\r\(\)\'\"]'
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
            startup_mode = task.get('startup_mode', 'container')
            processor_type = task.get('processor_type', 'NPU').upper()
            
            if test_mode == TestMode.SINGLE_MODEL and startup_mode == 'api':
                return CommandBuilder.build_command_api_single_model(task)
            
            if test_mode == TestMode.SINGLE_MODEL and startup_mode == 'container':
                if framework == "vllm":
                    if processor_type == 'GPU':
                        return CommandBuilder.build_command_vllm_gpu_single_model(task)
                    else:
                        return CommandBuilder.build_command_vllm_npu_single_model(task)
                elif framework == "mindie":
                    return CommandBuilder.build_command_mindie_single_model(task)
            
            elif test_mode == TestMode.ALL_MODELS:
                if framework == "vllm":
                    if processor_type == 'GPU':
                        return CommandBuilder.build_command_vllm_gpu_all_models(task)
                    else:
                        return CommandBuilder.build_command_vllm_npu_all_models(task)
                elif framework == "mindie":
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
    def build_command_api_single_model(task: dict) -> str:
        """构建直连API性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', '') or task.get('model_name', ''))
        base_url = CommandBuilder._escape_shell_arg(task.get('base_url', ''))
        api_key = CommandBuilder._escape_shell_arg(task.get('api_key', ''))
        
        # 解析 parameter_combination JSON
        raw_combos = task.get('parameter_combination', '')
        if raw_combos is None:
            raw_combos = ''
            
        parsed_combos_str = raw_combos
        try:
            if raw_combos:
                parsed = json.loads(raw_combos)
                if isinstance(parsed, list):
                    combo_list = []
                    for p in parsed:
                        if isinstance(p, dict):
                            in_len_val = p.get('input_len', '')
                            out_len_val = p.get('output_len', '')
                            prompts_val = p.get('num_prompts', '')
                            conc_val = p.get('max_concurrency', '')

                            in_len = str(in_len_val).strip() if in_len_val is not None else ""
                            out_len = str(out_len_val).strip() if out_len_val is not None else ""
                            prompts = str(prompts_val).strip() if prompts_val is not None else ""
                            conc = str(conc_val).strip() if conc_val is not None else ""
                            
                            if in_len in ('None', '0', ''): in_len = ""
                            if out_len in ('None', '0', ''): out_len = ""
                            if prompts in ('None', '0', ''): prompts = ""
                            if conc in ('None', '0', ''): conc = ""
                            
                            # 如果有任意一个参数为空(或为0)，则认为无效，跳过该组合
                            if not in_len or not out_len or not prompts or not conc:
                                continue
                                
                            combo_list.append(f"{in_len} {out_len} {prompts} {conc}")
                    
                    parsed_combos_str = ",".join(combo_list) if combo_list else ""
                elif not parsed: # 处理 {} 等空对象
                    parsed_combos_str = ""
        except Exception:
            # 如果不是 JSON，但也是类似 "[{...}]" 格式的无效字符串，清空
            if isinstance(raw_combos, str) and raw_combos.strip() in ("[]", "{}"):
                parsed_combos_str = ""
            pass
            
        combo_arg = f"-c {CommandBuilder._escape_shell_arg(parsed_combos_str)} " if parsed_combos_str else ""
        mode = CommandBuilder._escape_shell_arg(task.get('graph_mode', 'eager'))
        processor = CommandBuilder._escape_shell_arg(task.get('processor_type', 'NPU'))
        
        return f"""cd perf_test/api_benchmark_auto && bash run_vllmbench.sh --model-path {model_path} --base_url {base_url} --api_key {api_key} {combo_arg}--mode {mode} --processor {processor}"""

    @staticmethod
    def build_command_vllm_npu_single_model(task: dict) -> str:
        """构建VLLM NPU单模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        npu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))
        graph_mode = CommandBuilder._escape_shell_arg(task.get('graph_mode', 'eager'))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_vllm_single_{task_id}" if task_id else "results_vllm_single"
        
        cmd = f"""cd perf_test/vllm_benchmark_auto_npu && bash run_benchmark_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {npu_count} \
  --mode {graph_mode} \
  -e {execution_flag} \
  -d {framework_version}"""

        return cmd

    @staticmethod
    def build_command_vllm_gpu_single_model(task: dict) -> str:
        """构建VLLM GPU单模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        gpu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))  # npu_count is used for both
        graph_mode = CommandBuilder._escape_shell_arg(task.get('graph_mode', 'eager'))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_vllm_single_{task_id}" if task_id else "results_vllm_single"
        
        cmd = f"""cd perf_test/vllm_benchmark_auto_gpu && bash run_benchmark_all_models_gpu.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {gpu_count} \
  --mode {graph_mode} \
  -e {execution_flag} \
  -d {framework_version}"""

        return cmd

    @staticmethod
    def build_command_vllm_npu_all_models(task: dict) -> str:
        """构建VLLM NPU全套模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_vllm_all_{task_id}" if task_id else "results_vllm_all"
        
        return f"""cd perf_test/vllm_benchmark_auto_npu && bash run_benchmark_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -e {execution_flag} \
  -d {framework_version}"""

    @staticmethod
    def build_command_vllm_gpu_all_models(task: dict) -> str:
        """构建VLLM GPU全套模型性能测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        execution_flag = CommandBuilder._escape_shell_arg(task.get('execution_flag', '1'))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_vllm_all_{task_id}" if task_id else "results_vllm_all"
        
        return f"""cd perf_test/vllm_benchmark_auto_gpu && bash run_benchmark_all_models_gpu.sh \
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
        
        task_id = task.get('id', '')
        result_dir = f"results_mindie_single_{task_id}" if task_id else "results_mindie_single"
        
        return f"""cd perf_test/mindie_benchmark_auto && bash mindie_auto_test.sh \
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
        
        task_id = task.get('id', '')
        result_dir = f"results_mindie_all_{task_id}" if task_id else "results_mindie_all"
        
        return f"""cd perf_test/mindie_benchmark_auto && bash mindie_auto_test.sh \
  -b {model_path} \
  -r {result_dir} \
  -d {framework_version}"""

    @staticmethod
    def build_command_accuracy_vllm_single_model(task: dict) -> str:
        """构建单模型精度测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        model_name = CommandBuilder._escape_shell_arg(task.get('model_name', ''))
        npu_count = CommandBuilder._validate_npu_count(task.get('npu_count', 1))
        inference_mode = CommandBuilder._escape_shell_arg(task.get('inference_mode', 'eager'))
        dataset_name = CommandBuilder._escape_shell_arg(task.get('dataset_name', ''))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_accuracy_single_{task_id}" if task_id else "results_accuracy_single"
        
        return f"""cd perf_test/evalscope_auto && bash run_accuracy_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -m {model_name} \
  -n {npu_count} \
  --mode {inference_mode} \
  --datasets {dataset_name} \
  -d {framework_version}"""

    @staticmethod
    def build_command_accuracy_vllm_all_models(task: dict) -> str:
        """构建全模型精度测试命令"""
        model_path = CommandBuilder._escape_shell_arg(task.get('model_path', ''))
        framework_version = CommandBuilder._escape_shell_arg(task.get('framework_version', ''))
        
        task_id = task.get('id', '')
        result_dir = f"results_accuracy_all_{task_id}" if task_id else "results_accuracy_all"
        
        return f"""cd perf_test/evalscope_auto && bash run_accuracy_all_models.sh \
  -b {model_path} \
  -r {result_dir} \
  -d {framework_version}"""
