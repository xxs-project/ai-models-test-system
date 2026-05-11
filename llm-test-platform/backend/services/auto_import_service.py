"""
自动导入服务模块 - 从测试任务结果自动导入基准测试数据
"""
import os
import re
import glob
import csv
import logging
import uuid
import sys
import shutil
import tempfile
import paramiko
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Callable
from pathlib import Path

from sqlmodel import Session

# 处理导入路径
try:
    from backend.models import Task, Device, Benchmark
    from backend.schemas import BenchmarkConfig, BenchmarkMetricsEntry
except ImportError:
    # 直接导入（用于测试）
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from models import Task, Device, Benchmark
    from schemas import BenchmarkConfig, BenchmarkMetricsEntry


def generate_unique_id(prefix: str = 'BM') -> str:
    """生成唯一ID"""
    return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

logger = logging.getLogger(__name__)

# CSV列名别名映射
CSV_COLUMN_ALIASES = {
    'concurrency': ['concurrency', 'process num', 'c', 'process', '并发数'],
    'inputLength': ['inputlength', 'input length', 'input', 'il', 'avg input tokens', '输入长度'],
    'outputLength': ['outputlength', 'output length', 'output', 'ol', 'avg output tokens', '输出长度'],
    'ttft': ['ttft', 'ttft (ms)', '首token', 'first token', '首token时间'],
    'tpot': ['tpot', 'per token', '每token'],
    'tokensPerSecond': ['tokenspersecond', 'tps', '每秒token', 'tokens per second'],
    'totalTimeMs': ['totaltimems', 'total time (ms)', 'totaltime', '总时间'],
}

# Config Column Aliases for Row-by-Row Config Import
CONFIG_COLUMN_ALIASES = {
    'modelName': ['modelname', 'model', '模型名称', '模型'],
    'framework': ['framework', '框架'],
    'chipName': ['chipname', 'chip', 'device', '芯片'],
    'serverName': ['servername', 'server', '服务器'],
    'submitter': ['submitter', '提交者'],
    'source': ['source', '来源'],
    'testDate': ['testdate', 'date', '测试日期', '日期'],
    'frameworkVersion': ['frameworkversion', 'version', '框架版本', '版本'],
    'graphMode': ['graphmode', 'graph mode', '图模式'],
    'shardingConfig': ['shardingconfig', 'sharding', 'tp', 'pp', '切分配置'],
}

# 服务器名称映射表
SERVER_NAME_MAPPING = {
    ('910B2C', 'x86_64'): 'G8600',
    ('910B', 'aarch64'): 'G5680',
    ('910B4', 'x86_64'): 'G5500',
    ('910B4', 'aarch64'): 'G5580',
}


def get_server_name(chip_type: str, arch: str) -> str:
    """
    根据芯片类型和架构获取服务器名称
    
    Args:
        chip_type: AI芯片类型，如 "Ascend 910B2C"
        arch: 架构，如 "x86_64" 或 "aarch64"
    
    Returns:
        服务器名称，如 "G8600"
    """
    # 标准化芯片类型
    if '910B2C' in chip_type:
        chip_key = '910B2C'
    elif '910B4' in chip_type:
        chip_key = '910B4'
    elif '910B' in chip_type:
        chip_key = '910B'
    else:
        chip_key = chip_type

    # 标准化架构
    arch = arch.lower()

    return SERVER_NAME_MAPPING.get((chip_key, arch), f'Unknown-{chip_key}-{arch}')


def get_sharding_config(npu_count: int) -> str:
    """
    根据NPU数量生成切分参数
    
    Args:
        npu_count: NPU数量
    
    Returns:
        切分参数字符串，如 "TP4"
    """
    return f'TP{npu_count}'


def normalize_column_name(column_name: str) -> str:
    """
    标准化列名（去除空格、转小写）
    
    Args:
        column_name: 原始列名
    
    Returns:
        标准化后的列名
    """
    return column_name.strip().lower().replace(' ', '')


def find_column_index(headers: List[str], target_column: str, aliases_map: Optional[Dict[str, List[str]]] = None) -> Optional[int]:
    """
    在表头中查找指定列的索引（支持别名）
    
    Args:
        headers: CSV表头列表
        target_column: 目标列名
        aliases_map: 别名映射表 (可选, 默认为 CSV_COLUMN_ALIASES)
    
    Returns:
        列索引或None
    """
    normalized_headers = [normalize_column_name(h) for h in headers]
    aliases = (aliases_map or CSV_COLUMN_ALIASES).get(target_column, [target_column])
    normalized_aliases = [normalize_column_name(a) for a in aliases]
    
    for i, header in enumerate(normalized_headers):
        if header in normalized_aliases:
            return i
    return None


def parse_float(value: Any, default: float = 0.0) -> float:
    """
    安全地解析浮点数
    
    Args:
        value: 要解析的值
        default: 默认值
    
    Returns:
        解析后的浮点数或默认值
    """
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def parse_csv_file(csv_path: str) -> List[Tuple[Dict[str, Any], BenchmarkMetricsEntry]]:
    """
    解析CSV文件，提取性能指标数据和行配置
    
    Args:
        csv_path: CSV文件路径
    
    Returns:
        包含 (行配置, 性能指标) 的列表
    
    Raises:
        FileNotFoundError: 文件不存在
        ValueError: CSV格式错误
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV文件不存在: {csv_path}")
    
    parsed_data = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            
            if not headers:
                raise ValueError("CSV文件为空或格式错误")
            
            # 查找列索引 (Metrics)
            concurrency_idx = find_column_index(headers, 'concurrency')
            input_length_idx = find_column_index(headers, 'inputLength')
            output_length_idx = find_column_index(headers, 'outputLength')
            ttft_idx = find_column_index(headers, 'ttft')
            tpot_idx = find_column_index(headers, 'tpot')
            tps_idx = find_column_index(headers, 'tokensPerSecond')
            total_time_idx = find_column_index(headers, 'totalTimeMs')
            
            # 查找列索引 (Config)
            config_indices = {}
            for key in CONFIG_COLUMN_ALIASES:
                idx = find_column_index(headers, key, CONFIG_COLUMN_ALIASES)
                if idx is not None:
                    config_indices[key] = idx

            # 必需的列：并发数、输入长度、输出长度
            if concurrency_idx is None:
                raise ValueError(f"CSV文件缺少必需的列：concurrency (支持的别名: {CSV_COLUMN_ALIASES['concurrency']})")
            
            logger.info(f"解析CSV文件: {csv_path}, 表头: {headers}")
            logger.info(f"列映射 - concurrency: {concurrency_idx}, input: {input_length_idx}, output: {output_length_idx}, "
                       f"ttft: {ttft_idx}, tpot: {tpot_idx}, tps: {tps_idx}")
            logger.info(f"配置列映射: {config_indices}")
            
            for row_idx, row in enumerate(reader, start=2):
                if not row or all(cell.strip() == '' for cell in row):
                    continue  # 跳过空行
                
                try:
                    # 解析必需字段
                    concurrency = int(parse_float(row[concurrency_idx])) if concurrency_idx is not None else 1
                    input_length = int(parse_float(row[input_length_idx], 1024)) if input_length_idx is not None else 1024
                    output_length = int(parse_float(row[output_length_idx], 128)) if output_length_idx is not None else 128
                    
                    # 解析可选字段
                    ttft = parse_float(row[ttft_idx]) if ttft_idx is not None else 0.0
                    tpot = parse_float(row[tpot_idx]) if tpot_idx is not None else 0.0
                    tokens_per_second = parse_float(row[tps_idx]) if tps_idx is not None else 0.0
                    total_time_ms = parse_float(row[total_time_idx]) if total_time_idx is not None else None
                    
                    # 自动计算TPOT（如果缺失但有时间数据）
                    if tpot == 0 and total_time_ms is not None and output_length > 0:
                        tpot = total_time_ms / output_length
                    
                    # 自动计算TPS（如果缺失）
                    if tokens_per_second == 0 and tpot > 0:
                        tokens_per_second = 1000 / tpot
                    
                    metric = BenchmarkMetricsEntry(
                        concurrency=concurrency,
                        inputLength=input_length,
                        outputLength=output_length,
                        ttft=ttft,
                        tpot=tpot,
                        tokensPerSecond=tokens_per_second
                    )
                    
                    # 解析行配置
                    row_config = {}
                    for key, idx in config_indices.items():
                        if idx < len(row) and row[idx].strip():
                            row_config[key] = row[idx].strip()
                    
                    parsed_data.append((row_config, metric))
                    
                except Exception as e:
                    logger.warning(f"解析第{row_idx}行失败: {e}, 行内容: {row}")
                    continue
    
    except Exception as e:
        logger.error(f"解析CSV文件失败: {csv_path}, 错误: {e}")
        raise ValueError(f"CSV解析失败: {str(e)}")
    
    logger.info(f"成功解析 {len(parsed_data)} 条性能数据")
    return parsed_data


def extract_framework_params(log_dir: str, log_pattern: str) -> str:
    """
    从vLLM启动日志中提取框架启动参数
    
    Args:
        log_dir: 日志目录
        log_pattern: 日志文件名模式
    
    Returns:
        框架启动参数，未找到则返回空字符串
    """
    try:
        # 查找匹配的日志文件
        log_files = glob.glob(os.path.join(log_dir, log_pattern))
        
        if not log_files:
            logger.warning(f"未找到启动日志文件: {os.path.join(log_dir, log_pattern)}")
            return ""
        
        # 使用最新的日志文件
        log_file = max(log_files, key=os.path.getmtime)
        logger.info(f"找到启动日志文件: {log_file}")
        
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # 提取环境变量和启动命令
        result_parts = []
        
        # 1. 提取特定的环境变量
        # 匹配模式：环境变量名=值（非空白字符）
        env_vars = ['VLLM_ASCEND_ENABLE_NZ', 'VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE']
        for var in env_vars:
            # 使用更健壮的正则：匹配 变量名=值，直到遇到空白字符或行尾
            env_pattern = fr'({var}=[^\s]+)'
            env_match = re.search(env_pattern, log_content)
            if env_match:
                result_parts.append(env_match.group(1))
        
        # 2. 匹配 Final command: 后的命令
        cmd_pattern = r'Final command:\s*(vllm serve .+)'
        match = re.search(cmd_pattern, log_content, re.IGNORECASE)
        
        if match:
            # 提取完整命令
            full_command = match.group(1)
            
            # 格式化命令：在参数前添加换行和缩进
            # 将 " --" 替换为 " \n\t\t   --"
            formatted_command = re.sub(r'\s+(--[\w-]+)', r' \\\n\t\t   \1', full_command)
            
            result_parts.append(formatted_command)
            
            # 组合结果
            final_params = "\n".join(result_parts)
            logger.info(f"成功提取框架启动参数: {final_params[:100]}...")
            return final_params
        else:
            logger.warning(f"未在日志中找到 'Final command:' 模式")
            return ""
    
    except Exception as e:
        logger.error(f"提取框架启动参数失败: {e}")
        return ""


def extract_model_name_from_filename(filename: str) -> str:
    """
    从CSV文件名中提取模型名称
    
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv
    
    Args:
        filename: CSV文件名
    
    Returns:
        模型名称
    """
    name_without_ext = filename.replace('.csv', '')
    parts = name_without_ext.split('_')

    # 找到 "results" 后的部分为模型名称
    try:
        results_index = parts.index('results')
        # 从results后一个索引开始，到 {npu_count} 前一个索引结束
        model_parts = []
        for i in range(results_index + 1, len(parts)):
            part = parts[i]
            # 遇到数字（npu_count）时停止
            if part.isdigit():
                break
            model_parts.append(part)

        return '_'.join(model_parts)
    except (ValueError, IndexError):
        return filename


def extract_npu_count_from_filename(filename: str) -> int:
    """
    从CSV文件名中提取NPU数量
    
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv → 1
    
    Args:
        filename: CSV文件名
    
    Returns:
        NPU数量
    """
    match = re.search(r'_(\d+)_npu_', filename)
    if match:
        return int(match.group(1))
    return 1  # 默认值


def extract_graph_mode_from_filename(filename: str) -> str:
    """
    从CSV文件名中提取图模式
    
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv → aclgraph
    
    Args:
        filename: CSV文件名
    
    Returns:
        图模式
    """
    # 提取最后一个部分（去掉.csv）
    graph_mode = filename.replace('.csv', '').split('_')[-1]
    return graph_mode


def parse_filename_metadata(filename: str) -> Dict[str, str]:
    """
    从CSV文件名解析元数据（使用新的提取函数）
    
    格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv
    
    Args:
        filename: CSV文件名
    
    Returns:
        包含 model_name, npu_count, graph_mode 的字典
    
    Raises:
        ValueError: 文件名格式无效
    """
    try:
        # 验证文件名基本格式
        if not filename.endswith('.csv'):
            raise ValueError(f"文件名必须以.csv结尾: {filename}")
        
        # 检查必需的关键词
        if 'results' not in filename or '_npu_' not in filename:
            raise ValueError(f"文件名缺少必需的标记(results或npu): {filename}")
        
        model_name = extract_model_name_from_filename(filename)
        npu_count = extract_npu_count_from_filename(filename)
        graph_mode = extract_graph_mode_from_filename(filename)
        
        # 验证提取的数据是否有效
        if not model_name or model_name == filename:
            raise ValueError(f"无法从文件名提取模型名称: {filename}")
        
        if not graph_mode:
            raise ValueError(f"无法从文件名提取图模式: {filename}")
        
        return {
            'model_name': model_name,
            'npu_count': str(npu_count),
            'graph_mode': graph_mode
        }
    
    except Exception as e:
        logger.error(f"解析文件名失败: {filename}, 错误: {e}")
        raise ValueError(f"无法从文件名解析元数据: {filename}")



def download_remote_results_with_sftp(
    task: Task,
    device: Device,
    local_temp_dir: str
) -> str:
    """
    通过SFTP从远程设备下载结果文件
    
    Args:
        task: 任务对象
        device: 设备对象
        local_temp_dir: 本地临时目录
        
    Returns:
        本地结果基础路径
    """
    logger.info(f"开始从远程设备 {device.ip if device else task.device_ip} 下载结果文件...")
    
    # 获取连接信息
    ip = device.ip if device else task.device_ip
    port = device.port if device else 22
    username = device.username if device else task.device_username
    password = device.password if device else task.device_password
    
    if not ip or not username:
        raise ValueError("无法获取设备连接信息")
        
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh_client.connect(
            hostname=ip,
            port=port,
            username=username,
            password=password,
            timeout=30
        )
        
        sftp = ssh_client.open_sftp()
        
        # 确定远程基础路径
        script_path = task.script_path
        if not script_path:
            raise ValueError("任务未指定脚本路径")
            
        framework_label = 'vllm' if task.inference_framework == 1 else 'mindie'
        test_mode_label = 'single' if task.test_mode == 1 else 'all'
        
        # 结果目录名（例如 results_vllm_single_123）
        task_id = task.id
        results_dir_name = f"results_{framework_label}_{test_mode_label}_{task_id}" if task_id else f"results_{framework_label}_{test_mode_label}"
        remote_results_path = f"{script_path}/{results_dir_name}"
        
        # 检查远程结果目录是否存在
        try:
            sftp.stat(remote_results_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"远程结果目录不存在: {remote_results_path}")
            
        # 查找具体的版本目录
        # 注意：这里需要处理 framework_version 可能带空格的问题
        # 我们列出 results_dir_name 下的所有子目录，并尝试匹配
        framework_version_stripped = (task.framework_version or '').strip()
        # 构造期望的目录前缀
        expected_prefix = f"{framework_label}_"
        
        remote_subdirs = []
        try:
            for entry in sftp.listdir_attr(remote_results_path):
                if entry.st_mode & 0o40000:  # 是目录
                    remote_subdirs.append(entry.filename)
        except Exception as e:
            raise ValueError(f"无法列出远程目录 {remote_results_path}: {e}")
            
        target_subdir = None
        
        # 策略1: 精确匹配 stripped 版本 (vllm_v0.12.0rc1)
        stripped_name = f"{framework_label}_{framework_version_stripped}"
        if stripped_name in remote_subdirs:
            target_subdir = stripped_name
            
        # 策略2: 如果没找到，尝试匹配原始版本（可能带空格）
        if not target_subdir and task.framework_version:
             original_name = f"{framework_label}_{task.framework_version}"
             if original_name in remote_subdirs:
                 target_subdir = original_name
        
        # 策略3: 尝试匹配带空格的版本 (vllm_ v0.12.0rc1) - 针对之前出现的 bug
        if not target_subdir:
            spaced_name = f"{framework_label}_ {framework_version_stripped}"
            if spaced_name in remote_subdirs:
                target_subdir = spaced_name

        # 策略4: 如果还没找到，查找包含 stripped 版本的目录
        if not target_subdir:
            for subdir in remote_subdirs:
                if subdir.startswith(expected_prefix) and framework_version_stripped in subdir:
                    target_subdir = subdir
                    break
        
        if not target_subdir:
            # 如果只有一个子目录，且符合 vllm_ 开头，就默认使用它（容错）
            valid_subdirs = [d for d in remote_subdirs if d.startswith(expected_prefix)]
            if len(valid_subdirs) == 1:
                target_subdir = valid_subdirs[0]
                logger.warning(f"未找到精确匹配的版本目录，使用唯一的子目录: {target_subdir}")
            else:
                raise FileNotFoundError(f"在 {remote_results_path} 中未找到匹配 {framework_version_stripped} 的版本目录. 可选目录: {remote_subdirs}")
        
        logger.info(f"定位到远程版本目录: {target_subdir}")
        
        # 开始下载
        full_remote_path = f"{remote_results_path}/{target_subdir}"
        full_local_path = os.path.join(local_temp_dir, results_dir_name, target_subdir)
        os.makedirs(full_local_path, exist_ok=True)
        
        # 下载CSV文件
        csv_files = []
        try:
            for entry in sftp.listdir_attr(full_remote_path):
                if entry.filename.endswith('.csv'):
                     csv_files.append(entry.filename)
        except Exception as e:
            raise ValueError(f"无法列出远程目录 {full_remote_path}: {e}")
            
        if not csv_files:
             raise FileNotFoundError(f"远程目录 {full_remote_path} 中没有CSV文件")
             
        for csv_file in csv_files:
            remote_file = f"{full_remote_path}/{csv_file}"
            local_file = os.path.join(full_local_path, csv_file)
            sftp.get(remote_file, local_file)
            logger.info(f"下载CSV文件: {csv_file}")
            
        # 下载日志文件 (在 log 子目录中)
        remote_log_dir = f"{full_remote_path}/log"
        local_log_dir = os.path.join(full_local_path, "log")
        
        try:
            sftp.stat(remote_log_dir)
            # log 目录存在，下载日志
            os.makedirs(local_log_dir, exist_ok=True)
            log_files = []
            for entry in sftp.listdir_attr(remote_log_dir):
                if entry.filename.endswith('.log'):
                    log_files.append(entry.filename)
            
            for log_file in log_files:
                remote_file = f"{remote_log_dir}/{log_file}"
                local_file = os.path.join(local_log_dir, log_file)
                sftp.get(remote_file, local_file)
                logger.info(f"下载日志文件: {log_file}")
                
        except FileNotFoundError:
            logger.warning(f"远程日志目录不存在: {remote_log_dir}，跳过日志下载")
        except Exception as e:
            logger.warning(f"下载日志失败: {e}，跳过")
            
        sftp.close()
        ssh_client.close()
        
        # 返回本地的基础路径 (用于 glob 查找)
        # 注意：这里返回的是相对路径结构，以便后续代码兼容
        # 但后续代码使用的是 os.path.join(base_path, ...)，如果 base_path 是相对的，它会基于 CWD
        # 所以我们需要让 auto_import_service 的 context 切换到 local_temp_dir
        # 或者返回绝对路径
        return full_local_path
        
    except Exception as e:
        if ssh_client:
            ssh_client.close()
        raise e


async def auto_import_single_model_result(
    session: Session,
    task: Task,
    device: Device
) -> Dict[str, Any]:
    """
    自动导入单模型性能测试结果
    
    字段映射规则（根据output.md最新要求）：
    - 模型名称: 从CSV文件名提取
    - NPU数量: 从CSV文件名提取
    - 切分参数: 从CSV文件名提取NPU数量生成
    - 图模式: 从CSV文件名提取
    
    Args:
        session: 数据库会话
        task: 任务对象
        device: 设备对象
    
    Returns:
        导入结果，包含 benchmark_id 和 count
    """
    logger.info(f"开始自动导入单模型性能测试结果，任务ID: {task.id}")
    
    # 创建临时目录用于下载文件
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # 1. 下载远程文件
            local_base_path = download_remote_results_with_sftp(task, device, temp_dir)
            
            # 2. 查找CSV文件
            framework_label = 'vllm' if task.inference_framework == 1 else 'mindie'
            csv_pattern = os.path.join(local_base_path, f"{device.arch}_{framework_label}_results_*.csv")
            csv_files = glob.glob(csv_pattern)
            
            if not csv_files:
                raise FileNotFoundError(f"未找到CSV文件: {csv_pattern}")
            
            # 单模型测试应该只有一个CSV文件
            if len(csv_files) > 1:
                logger.warning(f"找到多个CSV文件，使用第一个: {csv_files}")
            
            csv_path = csv_files[0]
            csv_filename = os.path.basename(csv_path)
            
            logger.info(f"找到CSV文件: {csv_path}")
            
            # 3. 从CSV文件名提取元数据（与全套测试保持一致）
            # 使用 parse_filename_metadata 进行更严格的验证
            metadata = parse_filename_metadata(csv_filename)
            model_name = metadata['model_name']
            npu_count = int(metadata['npu_count'])
            graph_mode = metadata['graph_mode']
            
            logger.info(f"从文件名提取 - 模型: {model_name}, NPU: {npu_count}, 图模式: {graph_mode}")
            
            # 4. 解析CSV文件
            parsed_data = parse_csv_file(csv_path)
            
            if not parsed_data:
                raise ValueError("CSV文件中没有有效的性能数据")
            
            # 5. 生成服务器名称
            server_name = get_server_name(device.accelerator_type or "", device.arch or "")
            logger.info(f"服务器名称: {server_name}")
            
            # 6. 生成切分参数（从CSV文件名提取的NPU数量）
            sharding_config = get_sharding_config(npu_count)
            logger.info(f"切分参数: {sharding_config}")
            
            # 7. 查找并解析vLLM启动日志（使用从文件名提取的元数据）
            log_dir = os.path.join(local_base_path, "log")
            log_pattern = f"{device.arch}_start_{framework_label}_{model_name}_*_{npu_count}_npu_{graph_mode}.log"
            framework_params = extract_framework_params(log_dir, log_pattern)
            
            # 8. 确定测试日期
            test_date = task.end_time
            if not test_date:
                test_date = task.created_at
            # 格式化为 YYYY-MM-DD
            if isinstance(test_date, str):
                test_date = test_date.split('T')[0] if 'T' in test_date else test_date[:10]
            else:
                test_date = test_date.strftime('%Y-%m-%d') if hasattr(test_date, 'strftime') else datetime.now().strftime('%Y-%m-%d')
            
            # 9. 构建配置 (基础配置)
            framework_name = "vLLM" if task.inference_framework == 1 else "MindIE"
            
            base_config_dict = {
                "submitter": task.created_by or "system",
                "modelName": model_name,  # 从CSV文件名提取
                "serverName": server_name,
                "chipName": device.accelerator_type or "",
                "framework": framework_name,
                "frameworkVersion": task.framework_version or "",
                "shardingConfig": sharding_config,  # 从CSV文件名提取的NPU数量生成
                "graphMode": graph_mode,  # 从CSV文件名提取
                "operatorAcceleration": "",
                "frameworkParams": framework_params,
                "testDate": test_date,
                "notes": f"自动导入，任务ID: {task.id}"
            }
            
            # 分组处理
            grouped_benchmarks = {}
            import json
            
            for row_config, metric in parsed_data:
                # 合并配置：行配置覆盖基础配置
                # 注意：我们只允许特定的字段覆盖，或者全部覆盖？
                # 安全起见，允许所有 CONFIG_COLUMN_ALIASES 中的字段覆盖
                merged_config = base_config_dict.copy()
                # 过滤 row_config 中可能的空值
                valid_row_config = {k: v for k, v in row_config.items() if v}
                merged_config.update(valid_row_config)
                
                # 如果 modelName 改变了，可能需要重新计算相关字段？
                # 比如 shardingConfig 可能依赖 NPU 数量，而 NPU 数量可能在 config 中？
                # 目前 row_config 主要是 metadata，我们假设 metrics 已经解析好了
                
                config_hash = json.dumps(merged_config, sort_keys=True)
                
                if config_hash not in grouped_benchmarks:
                    grouped_benchmarks[config_hash] = {
                        "config": merged_config,
                        "metrics": []
                    }
                grouped_benchmarks[config_hash]["metrics"].append(metric)
            
            created_ids = []
            total_metrics = 0
            
            for group in grouped_benchmarks.values():
                config_dict = group["config"]
                metrics_list = group["metrics"]
                
                # 10. 检查重复
                existing_benchmarks = session.query(Benchmark).all()
                existing_benchmark = None
                
                for b in existing_benchmarks:
                    if (b.config.get('modelName') == config_dict.get('modelName') and
                        b.config.get('serverName') == config_dict.get('serverName') and
                        b.config.get('testDate') == config_dict.get('testDate') and
                        b.config.get('framework') == config_dict.get('framework') and
                        b.config.get('graphMode') == config_dict.get('graphMode')):
                        existing_benchmark = b
                        break
                
                if existing_benchmark:
                    logger.warning(f"已存在相同配置的Benchmark，ID: {existing_benchmark.id}")
                    # 如果是多Benchmark导入，跳过重复的
                    continue

                # 11. 创建Benchmark记录
                unique_id = generate_unique_id('BM')
                
                benchmark = Benchmark(
                    unique_id=unique_id,
                    config=config_dict,
                    metrics=[m.model_dump() for m in metrics_list],
                    created_at=datetime.now().isoformat()
                )
                
                session.add(benchmark)
                session.commit()
                session.refresh(benchmark)
                
                created_ids.append(benchmark.id)
                total_metrics += len(metrics_list)
                logger.info(f"成功创建Benchmark记录，ID: {benchmark.id}, Unique ID: {unique_id}")

            if not created_ids:
                 return {
                    'success': False,
                    'message': '未导入任何数据（可能全部重复或解析失败）',
                    'benchmark_id': 0, # Legacy
                    'count': 0
                }

            return {
                'success': True,
                'message': f'成功导入 {len(created_ids)} 个基准测试配置，共 {total_metrics} 条数据',
                'benchmark_id': created_ids[0], # 返回第一个ID以保持兼容
                'benchmark_ids': created_ids,
                'unique_id': '', # 多个ID时不返回单一unique_id
                'count': total_metrics
            }
        
        except FileNotFoundError as e:
            logger.error(f"文件不存在: {e}")
            raise
        except Exception as e:
            logger.error(f"自动导入失败: {e}")
            raise




async def auto_import_all_models_result(
    session: Session,
    task: Task,
    device: Device
) -> Dict[str, Any]:
    """
    自动导入全套模型性能测试结果（多个CSV文件）
    
    Args:
        session: 数据库会话
        task: 任务对象
        device: 设备对象
    
    Returns:
        导入结果，包含 benchmark_ids 和 count
    """
    logger.info(f"开始自动导入全套模型性能测试结果，任务ID: {task.id}")
    
    # 创建临时目录用于下载文件
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # 1. 下载远程文件
            local_base_path = download_remote_results_with_sftp(task, device, temp_dir)
            
            # 2. 查找所有CSV文件
            framework_label = 'vllm' if task.inference_framework == 1 else 'mindie'
            csv_pattern = os.path.join(local_base_path, f"{device.arch}_{framework_label}_results_*.csv")
            csv_files = glob.glob(csv_pattern)
            
            if not csv_files:
                raise FileNotFoundError(f"未找到CSV文件: {csv_pattern}")
            
            logger.info(f"找到 {len(csv_files)} 个CSV文件")
            
            imported_benchmarks = []
            errors = []
            
            for csv_file in csv_files:
                filename = os.path.basename(csv_file)
                try:
                    logger.info(f"处理CSV文件: {filename}")
                    
                    # 3. 从文件名提取元数据
                    metadata = parse_filename_metadata(filename)
                    model_name = metadata['model_name']
                    npu_count = int(metadata['npu_count'])
                    graph_mode = metadata['graph_mode']
                    
                    # 4. 解析CSV文件
                    parsed_data = parse_csv_file(csv_file)
                    
                    if not parsed_data:
                        logger.warning(f"CSV文件中没有有效数据: {filename}")
                        continue
                    
                    # 5. 生成服务器名称
                    server_name = get_server_name(device.accelerator_type or "", device.arch or "")
                    
                    # 6. 生成切分参数
                    sharding_config = get_sharding_config(npu_count)
                    
                    # 7. 查找并解析vLLM启动日志
                    log_dir = os.path.join(local_base_path, "log")
                    log_pattern = f"{device.arch}_start_{framework_label}_{model_name}_*_{npu_count}_npu_{graph_mode}.log"
                    framework_params = extract_framework_params(log_dir, log_pattern)
                    
                    # 8. 确定测试日期
                    test_date = task.end_time
                    if not test_date:
                        test_date = task.created_at
                    if isinstance(test_date, str):
                        test_date = test_date.split('T')[0] if 'T' in test_date else test_date[:10]
                    else:
                        test_date = test_date.strftime('%Y-%m-%d') if hasattr(test_date, 'strftime') else datetime.now().strftime('%Y-%m-%d')
                    
                    # 9. 构建配置 (基础配置)
                    framework_name = "vLLM" if task.inference_framework == 1 else "MindIE"
                    
                    base_config_dict = {
                        "submitter": task.created_by or "system",
                        "modelName": model_name,
                        "serverName": server_name,
                        "chipName": device.accelerator_type or "",
                        "framework": framework_name,
                        "frameworkVersion": task.framework_version or "",
                        "shardingConfig": sharding_config,
                        "graphMode": graph_mode,
                        "operatorAcceleration": "",
                        "frameworkParams": framework_params,
                        "testDate": test_date,
                        "notes": f"自动导入（全套模型测试），任务ID: {task.id}"
                    }
                    
                    # 分组处理
                    grouped_benchmarks = {}
                    
                    for row_config, metric in parsed_data:
                        merged_config = base_config_dict.copy()
                        valid_row_config = {k: v for k, v in row_config.items() if v}
                        merged_config.update(valid_row_config)
                        
                        config_hash = json.dumps(merged_config, sort_keys=True)
                        if config_hash not in grouped_benchmarks:
                            grouped_benchmarks[config_hash] = {
                                "config": merged_config,
                                "metrics": []
                            }
                        grouped_benchmarks[config_hash]["metrics"].append(metric)

                    # 遍历生成的Benchmark组
                    for group_key, group in grouped_benchmarks.items():
                        config_dict = group["config"]
                        metrics_list = group["metrics"]
                        current_model_name = config_dict.get('modelName', model_name)

                        # 10. 检查是否已存在
                        existing_benchmarks = session.query(Benchmark).all()
                        existing_benchmark = None
                        
                        for b in existing_benchmarks:
                            if (b.config.get('modelName') == current_model_name and
                                b.config.get('serverName') == config_dict.get('serverName') and
                                b.config.get('testDate') == config_dict.get('testDate') and
                                b.config.get('graphMode') == config_dict.get('graphMode')):
                                existing_benchmark = b
                                break
                        
                        if existing_benchmark:
                            logger.warning(f"已存在相同配置的Benchmark，跳过: {current_model_name}")
                            imported_benchmarks.append({
                                'model_name': current_model_name,
                                'benchmark_id': existing_benchmark.id,
                                'skipped': True
                            })
                            continue
                        
                        # 11. 创建Benchmark记录
                        unique_id = generate_unique_id('BM')
                        
                        benchmark = Benchmark(
                            unique_id=unique_id,
                            config=config_dict,
                            metrics=[m.model_dump() for m in metrics_list],
                            created_at=datetime.now().isoformat()
                        )
                        
                        session.add(benchmark)
                        session.commit()
                        session.refresh(benchmark)
                        
                        logger.info(f"成功创建Benchmark记录: {current_model_name}, ID: {benchmark.id}")
                        
                        imported_benchmarks.append({
                            'model_name': current_model_name,
                            'benchmark_id': benchmark.id,
                            'unique_id': unique_id,
                            'count': len(metrics_list),
                            'skipped': False
                        })
                
                except Exception as e:
                    logger.error(f"处理文件 {filename} 失败: {e}")
                    errors.append({'file': filename, 'error': str(e)})
                    continue
            
            success_count = len([b for b in imported_benchmarks if not b.get('skipped', False)])
            skip_count = len([b for b in imported_benchmarks if b.get('skipped', False)])
            
            logger.info(f"导入完成: 成功 {success_count} 个, 跳过 {skip_count} 个, 失败 {len(errors)} 个")
            
            return {
                'success': True,
                'message': f'成功导入 {success_count} 个模型的基准测试数据（跳过 {skip_count} 个已存在）',
                'benchmarks': imported_benchmarks,
                'count': success_count,
                'errors': errors if errors else None
            }
        
        except Exception as e:
            logger.error(f"自动导入全套模型失败: {e}")
            raise


async def auto_import_task_result(
    session: Session,
    task_id: int
) -> Dict[str, Any]:
    """
    自动导入测试任务结果的主入口函数
    
    Args:
        session: 数据库会话
        task_id: 任务ID
    
    Returns:
        导入结果
    
    Raises:
        ValueError: 任务不存在或未完成
    """
    from backend.services.command_builder import TaskStatus
    
    # 1. 获取任务信息
    task = session.get(Task, task_id)
    if not task:
        raise ValueError(f"任务不存在: {task_id}")
    
    # 2. 检查任务状态
    if task.status != TaskStatus.COMPLETED:
        raise ValueError(f"任务未完成，无法导入。当前状态: {task.status}")
    
    # 3. 获取设备信息
    device = session.get(Device, task.device_id)
    if not device:
        raise ValueError(f"设备信息不存在: {task.device_id}")
    
    # 4. 根据测试模式调用不同的导入逻辑
    if task.test_mode == 1:  # 单模型性能测试
        return await auto_import_single_model_result(session, task, device)
    elif task.test_mode == 2:  # 全套模型性能测试
        return await auto_import_all_models_result(session, task, device)
    else:
        raise ValueError(f"不支持的测试模式: {task.test_mode}")
