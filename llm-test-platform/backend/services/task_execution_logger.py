"""
任务执行日志记录器

提供详细的任务执行日志记录功能
"""

import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class TaskExecutionLogger:
    """任务执行日志记录器"""
    
    def __init__(self, task_id: int):
        self.task_id = task_id
        self.logs: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
    
    def log(self, level: str, message: str, details: Dict[str, Any] = None):
        """记录日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message,
            'details': details or {}
        }
        self.logs.append(log_entry)
        
        # 同时记录到标准日志
        log_message = f"[Task {self.task_id}] {message}"
        if details:
            log_message += f" - Details: {details}"
        
        if level == 'ERROR':
            logger.error(log_message)
        elif level == 'WARNING':
            logger.warning(log_message)
        elif level == 'INFO':
            logger.info(log_message)
        else:
            logger.debug(log_message)
    
    def log_step_start(self, step_name: str, details: Dict[str, Any] = None):
        """记录步骤开始"""
        self.log('INFO', f'开始步骤: {step_name}', details)
    
    def log_step_end(self, step_name: str, success: bool, details: Dict[str, Any] = None):
        """记录步骤结束"""
        status = '成功' if success else '失败'
        self.log('INFO' if success else 'ERROR', f'步骤结束: {step_name} - {status}', details)
    
    def log_command(self, command: str):
        """记录执行的命令"""
        self.log('INFO', f'执行命令: {command[:200]}...' if len(command) > 200 else f'执行命令: {command}')
    
    def log_ssh_connection(self, host: str, port: int, username: str, success: bool, error: str = None):
        """记录SSH连接信息"""
        details = {
            'host': host,
            'port': port,
            'username': username,
            'success': success
        }
        if error:
            details['error'] = error
        
        self.log('INFO' if success else 'ERROR', 
                f'SSH连接{"成功" if success else "失败"}: {host}:{port}', 
                details)
    
    def log_command_output(self, exit_status: int, stdout: str, stderr: str):
        """记录命令输出"""
        self.log('INFO', f'命令执行完成，退出码: {exit_status}', {
            'exit_status': exit_status,
            'stdout_length': len(stdout),
            'stderr_length': len(stderr),
            'stdout_preview': stdout[:500] if stdout else '',
            'stderr_preview': stderr[:500] if stderr else ''
        })
    
    def get_logs(self) -> List[Dict[str, Any]]:
        """获取所有日志"""
        return self.logs
    
    def get_summary(self) -> str:
        """获取日志摘要"""
        error_count = sum(1 for log in self.logs if log['level'] == 'ERROR')
        warning_count = sum(1 for log in self.logs if log['level'] == 'WARNING')
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        return f"""
任务执行日志摘要:
- 任务ID: {self.task_id}
- 执行时间: {elapsed:.2f}秒
- 日志条目: {len(self.logs)}
- 错误数: {error_count}
- 警告数: {warning_count}
"""
    
    def save_to_task(self, task):
        """保存日志到任务对象"""
        # 将日志转换为字符串保存
        log_text = []
        for log in self.logs:
            timestamp = log['timestamp']
            level = log['level']
            message = log['message']
            log_text.append(f"[{timestamp}] [{level}] {message}")
        
        # 保存到任务的某个字段，或者可以创建单独的日志表
        full_log = '\n'.join(log_text)
        
        # 如果任务有execution_logs字段，保存到该字段
        if hasattr(task, 'execution_logs'):
            task.execution_logs = full_log
        
        # 同时保存摘要到error_message（如果执行失败）
        return full_log
