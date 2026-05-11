"""
任务执行前检查模块

提供任务执行前的各项检查功能
"""

import paramiko
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


class TaskExecutionChecker:
    """任务执行前检查器"""
    
    @staticmethod
    def check_device_connection(device_info: Dict[str, Any]) -> Tuple[bool, str]:
        """
        检查设备SSH连接
        
        Returns:
            Tuple[bool, str]: (是否成功, 错误信息)
        """
        try:
            logger.info(f"检查设备连接: {device_info['ip']}:{device_info['port']}")
            
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh_client.connect(
                hostname=device_info['ip'],
                port=device_info['port'],
                username=device_info['username'],
                password=device_info['password'],
                timeout=10
            )
            
            # 测试执行简单命令
            stdin, stdout, stderr = ssh_client.exec_command('echo "connection test"')
            exit_status = stdout.channel.recv_exit_status()
            
            ssh_client.close()
            
            if exit_status == 0:
                logger.info(f"设备连接检查通过: {device_info['ip']}")
                return True, ""
            else:
                error_msg = stderr.read().decode()
                return False, f"设备连接测试失败: {error_msg}"
                
        except paramiko.AuthenticationException as e:
            error_msg = f"SSH认证失败: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except paramiko.SSHException as e:
            error_msg = f"SSH连接异常: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except Exception as e:
            error_msg = f"设备连接检查失败: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    @staticmethod
    def check_script_directory(ssh_client: paramiko.SSHClient, script_path: str) -> Tuple[bool, str]:
        """
        检查脚本目录是否存在
        
        Returns:
            Tuple[bool, str]: (是否成功, 错误信息)
        """
        try:
            logger.info(f"检查脚本目录: {script_path}")
            
            stdin, stdout, stderr = ssh_client.exec_command(f'test -d {script_path} && echo "exists"')
            exit_status = stdout.channel.recv_exit_status()
            output = stdout.read().decode().strip()
            
            if exit_status == 0 and output == "exists":
                logger.info(f"脚本目录存在: {script_path}")
                return True, ""
            else:
                error_msg = f"脚本目录不存在: {script_path}"
                logger.error(error_msg)
                return False, error_msg
                
        except Exception as e:
            error_msg = f"检查脚本目录失败: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    @staticmethod
    def check_model_path(ssh_client: paramiko.SSHClient, model_path: str) -> Tuple[bool, str]:
        """
        检查模型路径是否存在
        
        Returns:
            Tuple[bool, str]: (是否成功, 错误信息)
        """
        try:
            logger.info(f"检查模型路径: {model_path}")
            
            # 如果路径包含通配符，只检查目录部分
            if '*' in model_path:
                base_path = model_path.split('*')[0]
                check_path = base_path if base_path.endswith('/') else base_path.rsplit('/', 1)[0]
            else:
                check_path = model_path
            
            stdin, stdout, stderr = ssh_client.exec_command(f'test -e {check_path} && echo "exists"')
            exit_status = stdout.channel.recv_exit_status()
            output = stdout.read().decode().strip()
            
            if exit_status == 0 and output == "exists":
                logger.info(f"模型路径存在: {check_path}")
                return True, ""
            else:
                error_msg = f"模型路径不存在: {check_path}"
                logger.warning(error_msg)
                # 模型路径不存在是警告，不是致命错误
                return True, error_msg
                
        except Exception as e:
            error_msg = f"检查模型路径失败: {str(e)}"
            logger.error(error_msg)
            return True, error_msg  # 不阻塞执行
    
    @staticmethod
    def check_npu_resources(ssh_client: paramiko.SSHClient, required_npus: int) -> Tuple[bool, str, int]:
        """
        检查NPU资源
        
        Returns:
            Tuple[bool, str, int]: (是否成功, 错误信息, 可用NPU数量)
        """
        try:
            logger.info(f"检查NPU资源，需要: {required_npus}")
            
            # 尝试不同的命令检查NPU
            commands = [
                'npu-smi info -l | grep "NPU ID" | wc -l',
                'cat /proc/driver/npu/info 2>/dev/null | grep "Device ID" | wc -l',
                'ls /dev/davinci* 2>/dev/null | wc -l',
            ]
            
            available_npus = 0
            for cmd in commands:
                try:
                    stdin, stdout, stderr = ssh_client.exec_command(cmd, timeout=5)
                    exit_status = stdout.channel.recv_exit_status()
                    output = stdout.read().decode().strip()
                    
                    if exit_status == 0 and output.isdigit():
                        available_npus = int(output)
                        if available_npus > 0:
                            break
                except:
                    continue
            
            logger.info(f"可用NPU数量: {available_npus}")
            
            if available_npus >= required_npus:
                return True, "", available_npus
            else:
                error_msg = f"NPU资源不足，需要 {required_npus} 个，可用 {available_npus} 个"
                logger.warning(error_msg)
                return True, error_msg, available_npus  # 警告但不阻塞
                
        except Exception as e:
            error_msg = f"检查NPU资源失败: {str(e)}"
            logger.error(error_msg)
            return True, error_msg, 0  # 不阻塞执行
    
    @staticmethod
    def preflight_check(task: Dict[str, Any], device_info: Dict[str, Any]) -> Tuple[bool, str]:
        """
        执行所有预检
        
        Returns:
            Tuple[bool, str]: (是否通过, 错误信息)
        """
        logger.info(f"开始任务预检: {task.get('task_name', 'Unknown')}")
        
        # 1. 检查设备连接
        success, error = TaskExecutionChecker.check_device_connection(device_info)
        if not success:
            return False, f"设备连接检查失败: {error}"
        
        # 2. 检查必要字段
        required_fields = ['model_path', 'inference_framework']
        for field in required_fields:
            if not task.get(field):
                return False, f"缺少必要字段: {field}"
        
        logger.info("任务预检通过")
        return True, ""


# 预检快捷函数
def check_task_executable(task: Dict[str, Any], device_info: Dict[str, Any]) -> Tuple[bool, str]:
    """
    检查任务是否可以执行
    
    Args:
        task: 任务数据
        device_info: 设备信息
        
    Returns:
        Tuple[bool, str]: (是否可以执行, 错误信息)
    """
    checker = TaskExecutionChecker()
    return checker.preflight_check(task, device_info)
