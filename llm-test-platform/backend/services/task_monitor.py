"""
任务执行监控服务

提供任务执行状态的实时监控功能：
1. 远程执行测试脚本
2. 监控进程状态
3. 定期更新任务进度
4. 收集执行日志
"""

import paramiko
import time
import threading
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from enum import IntEnum

logger = logging.getLogger(__name__)


class TaskMonitorStatus(IntEnum):
    """任务监控状态"""
    IDLE = 0           # 空闲
    STARTING = 1       # 正在启动
    RUNNING = 2        # 运行中
    COMPLETED = 3      # 已完成
    FAILED = 4         # 失败
    NOT_FOUND = 5      # 进程未找到


@dataclass
class ProcessStatus:
    """进程状态信息"""
    exists: bool
    pid: Optional[int]
    cpu_percent: float
    memory_percent: float
    status: str
    runtime_seconds: int


@dataclass
class ExecutionLog:
    """执行日志条目"""
    timestamp: str
    level: str  # INFO, ERROR, WARNING
    message: str


class TaskExecutionMonitor:
    """
    任务执行监控器
    
    功能：
    1. 在远程设备上启动测试脚本（后台运行）
    2. 定期检查进程状态
    3. 读取执行日志
    4. 更新任务进度和状态
    """
    
    # 默认检查间隔（秒）
    DEFAULT_CHECK_INTERVAL = 60
    
    def __init__(self, check_interval: int = DEFAULT_CHECK_INTERVAL):
        """
        初始化监控器
        
        Args:
            check_interval: 检查间隔（秒）
        """
        self.check_interval = check_interval
        self._monitored_tasks: Dict[int, Dict[str, Any]] = {}
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
    
    def start_monitoring(self, 
                        task_id: int,
                        ssh_client: paramiko.SSHClient,
                        script_path: str,
                        command: str,
                        log_file: str,
                        pid_file: str,
                        status_callback: Optional[Callable[[int, int, str], None]] = None,
                        progress_callback: Optional[Callable[[int, int], None]] = None):
        """
        开始监控任务执行
        
        Args:
            task_id: 任务ID
            ssh_client: SSH客户端
            script_path: 脚本目录
            command: 测试命令
            log_file: 日志文件路径
            pid_file: PID文件路径
            status_callback: 状态回调函数(task_id, status, message)
            progress_callback: 进度回调函数(task_id, progress)
        """
        with self._lock:
            if task_id in self._monitored_tasks:
                logger.warning(f"任务 {task_id} 已经在监控中")
                return
            
            self._monitored_tasks[task_id] = {
                'ssh_client': ssh_client,
                'script_path': script_path,
                'command': command,
                'log_file': log_file,
                'pid_file': pid_file,
                'start_time': datetime.now(),
                'last_check_time': None,
                'status_callback': status_callback,
                'progress_callback': progress_callback,
                'status': TaskMonitorStatus.STARTING,
            }
        
        logger.info(f"开始监控任务 {task_id}")
        
        # 启动后台监控线程
        if self._monitor_thread is None or not self._monitor_thread.is_alive():
            self._stop_event.clear()
            self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self._monitor_thread.start()
    
    def _monitor_loop(self):
        """监控循环"""
        logger.info("任务监控循环启动")
        
        while not self._stop_event.is_set():
            try:
                with self._lock:
                    tasks = list(self._monitored_tasks.items())
                
                for task_id, task_info in tasks:
                    try:
                        self._check_task_status(task_id, task_info)
                    except Exception as e:
                        logger.error(f"检查任务 {task_id} 状态时出错: {e}")
                
                # 等待下一次检查
                self._stop_event.wait(self.check_interval)
                
            except Exception as e:
                logger.error(f"监控循环出错: {e}")
                time.sleep(5)  # 出错后等待5秒再重试
        
        logger.info("任务监控循环停止")
    
    def _check_task_status(self, task_id: int, task_info: Dict[str, Any]):
        """
        检查单个任务状态
        
        Args:
            task_id: 任务ID
            task_info: 任务信息字典
        """
        ssh_client = task_info['ssh_client']
        pid_file = task_info['pid_file']
        log_file = task_info['log_file']
        
        try:
            # 1. 检查PID文件是否存在
            pid = self._read_pid_file(ssh_client, pid_file)
            
            if pid is None:
                # PID文件不存在，可能还未启动或已结束
                if task_info['status'] == TaskMonitorStatus.STARTING:
                    # 还在启动中，检查是否超时
                    elapsed = (datetime.now() - task_info['start_time']).total_seconds()
                    if elapsed > 30:  # 30秒启动超时
                        task_info['status'] = TaskMonitorStatus.FAILED
                        self._notify_status(task_id, 5, "启动超时")  # FAILED
                        self._remove_task(task_id)
                    return
                else:
                    # 检查日志文件看是否完成
                    result = self._check_completion_from_log(ssh_client, log_file)
                    if result == 'success':
                        task_info['status'] = TaskMonitorStatus.COMPLETED
                        self._notify_status(task_id, 4, "测试完成")  # COMPLETED
                        self._notify_progress(task_id, 100)
                    else:
                        task_info['status'] = TaskMonitorStatus.FAILED
                        self._notify_status(task_id, 5, "测试失败")  # FAILED
                    
                    self._remove_task(task_id)
                    return
            
            # 2. 检查进程是否存在
            process_status = self._get_process_status(ssh_client, pid)
            
            if not process_status.exists:
                # 进程不存在，检查是否完成
                result = self._check_completion_from_log(ssh_client, log_file)
                if result == 'success':
                    task_info['status'] = TaskMonitorStatus.COMPLETED
                    self._notify_status(task_id, 4, "测试完成")  # COMPLETED
                    self._notify_progress(task_id, 100)
                else:
                    task_info['status'] = TaskMonitorStatus.FAILED
                    self._notify_status(task_id, 5, "进程异常退出")  # FAILED
                
                self._remove_task(task_id)
                return
            
            # 3. 进程正在运行，更新状态为TESTING
            if task_info['status'] != TaskMonitorStatus.RUNNING:
                task_info['status'] = TaskMonitorStatus.RUNNING
                self._notify_status(task_id, 3, "正在测试中")  # TESTING
            
            # 4. 读取日志更新进度
            progress = self._parse_progress_from_log(ssh_client, log_file)
            if progress > 0:
                self._notify_progress(task_id, progress)
            
            # 5. 记录检查时间
            task_info['last_check_time'] = datetime.now()
            
        except Exception as e:
            logger.error(f"检查任务 {task_id} 状态时出错: {e}")
    
    def _read_pid_file(self, ssh_client: paramiko.SSHClient, pid_file: str) -> Optional[int]:
        """读取PID文件"""
        try:
            stdin, stdout, stderr = ssh_client.exec_command(f'cat {pid_file} 2>/dev/null')
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status == 0:
                pid_str = stdout.read().decode().strip()
                if pid_str.isdigit():
                    return int(pid_str)
            return None
        except Exception as e:
            logger.debug(f"读取PID文件失败: {e}")
            return None
    
    def _get_process_status(self, ssh_client: paramiko.SSHClient, pid: int) -> ProcessStatus:
        """获取进程状态"""
        try:
            # 检查进程是否存在
            stdin, stdout, stderr = ssh_client.exec_command(f'ps -p {pid} -o pid,pcpu,pmem,stat,etime 2>/dev/null | tail -1')
            output = stdout.read().decode().strip()
            
            if not output or not output[0].isdigit():
                return ProcessStatus(exists=False, pid=None, cpu_percent=0, memory_percent=0, status='', runtime_seconds=0)
            
            parts = output.split()
            if len(parts) >= 5:
                return ProcessStatus(
                    exists=True,
                    pid=int(parts[0]),
                    cpu_percent=float(parts[1]) if parts[1].replace('.', '').isdigit() else 0,
                    memory_percent=float(parts[2]) if parts[2].replace('.', '').isdigit() else 0,
                    status=parts[3],
                    runtime_seconds=self._parse_etime(parts[4])
                )
            
            return ProcessStatus(exists=True, pid=pid, cpu_percent=0, memory_percent=0, status='R', runtime_seconds=0)
            
        except Exception as e:
            logger.debug(f"获取进程状态失败: {e}")
            return ProcessStatus(exists=False, pid=None, cpu_percent=0, memory_percent=0, status='', runtime_seconds=0)
    
    def _parse_etime(self, etime: str) -> int:
        """解析进程运行时间（秒）"""
        try:
            # etime格式: [[dd-]hh:]mm:ss
            total_seconds = 0
            
            if '-' in etime:
                days, time_str = etime.split('-')
                total_seconds += int(days) * 86400
            else:
                time_str = etime
            
            parts = time_str.split(':')
            if len(parts) == 3:  # hh:mm:ss
                total_seconds += int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:  # mm:ss
                total_seconds += int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 1:  # ss
                total_seconds += int(parts[0])
            
            return total_seconds
        except:
            return 0
    
    def _check_completion_from_log(self, ssh_client: paramiko.SSHClient, log_file: str) -> str:
        """从日志文件检查是否完成"""
        try:
            # 检查日志文件中是否有完成标记
            stdin, stdout, stderr = ssh_client.exec_command(f'tail -20 {log_file} 2>/dev/null')
            log_content = stdout.read().decode()
            
            if 'SUCCESS' in log_content or 'completed successfully' in log_content.lower():
                return 'success'
            elif 'ERROR' in log_content or 'FAILED' in log_content:
                return 'failed'
            elif log_content.strip():
                return 'running'
            else:
                return 'unknown'
                
        except Exception as e:
            logger.debug(f"检查日志文件失败: {e}")
            return 'unknown'
    
    def _parse_progress_from_log(self, ssh_client: paramiko.SSHClient, log_file: str) -> int:
        """从日志文件解析进度"""
        try:
            # 读取日志最后几行，查找进度信息
            stdin, stdout, stderr = ssh_client.exec_command(f'tail -50 {log_file} 2>/dev/null')
            log_content = stdout.read().decode()
            
            # 查找进度标记，例如: Progress: 45% 或 [45/100]
            import re
            
            # 尝试匹配各种进度格式
            patterns = [
                r'Progress:\s*(\d+)%',
                r'\[(\d+)\s*/\s*\d+\]',
                r'(\d+)%\s*completed',
                r'完成度[:\s]*(\d+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, log_content, re.IGNORECASE)
                if matches:
                    # 取最后一个匹配值
                    progress = int(matches[-1])
                    return min(max(progress, 0), 100)
            
            # 如果没有明确的进度标记，根据日志行数估算
            lines = log_content.strip().split('\n')
            if len(lines) > 5:
                # 假设最多1000行日志表示完成
                return min(len(lines) / 10, 95)
            
            return 0
            
        except Exception as e:
            logger.debug(f"解析进度失败: {e}")
            return 0
    
    def _notify_status(self, task_id: int, status: int, message: str):
        """通知状态变更"""
        with self._lock:
            if task_id in self._monitored_tasks:
                callback = self._monitored_tasks[task_id].get('status_callback')
                if callback:
                    try:
                        callback(task_id, status, message)
                    except Exception as e:
                        logger.error(f"状态回调出错: {e}")
    
    def _notify_progress(self, task_id: int, progress: int):
        """通知进度更新"""
        with self._lock:
            if task_id in self._monitored_tasks:
                callback = self._monitored_tasks[task_id].get('progress_callback')
                if callback:
                    try:
                        callback(task_id, progress)
                    except Exception as e:
                        logger.error(f"进度回调出错: {e}")
    
    def _remove_task(self, task_id: int):
        """移除任务监控"""
        with self._lock:
            if task_id in self._monitored_tasks:
                # 关闭SSH连接
                try:
                    ssh_client = self._monitored_tasks[task_id]['ssh_client']
                    ssh_client.close()
                except:
                    pass
                
                del self._monitored_tasks[task_id]
                logger.info(f"停止监控任务 {task_id}")
    
    def stop_monitoring(self, task_id: int):
        """停止监控指定任务"""
        self._remove_task(task_id)
    
    def stop_all(self):
        """停止所有监控"""
        self._stop_event.set()
        
        with self._lock:
            for task_id in list(self._monitored_tasks.keys()):
                self._remove_task(task_id)
        
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
    
    def get_monitored_tasks(self) -> Dict[int, Dict[str, Any]]:
        """获取正在监控的任务列表"""
        with self._lock:
            return self._monitored_tasks.copy()


class RemoteScriptExecutor:
    """
    远程脚本执行器
    
    在远程设备上启动测试脚本并在后台运行
    """
    
    @staticmethod
    def execute_in_background(ssh_client: paramiko.SSHClient,
                             script_path: str,
                             command: str,
                             log_file: str = None,
                             pid_file: str = None) -> tuple:
        """
        在远程设备上后台执行命令
        
        Args:
            ssh_client: SSH客户端
            script_path: 脚本目录
            command: 要执行的命令
            log_file: 日志文件路径（可选）
            pid_file: PID文件路径（可选）
            
        Returns:
            tuple: (success: bool, pid: int, message: str)
        """
        try:
            # 生成默认日志和PID文件路径
            if log_file is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                log_file = f"/tmp/task_log_{timestamp}.log"
            
            if pid_file is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                pid_file = f"/tmp/task_pid_{timestamp}.pid"
            
            # 构建后台执行命令
            # 使用 nohup 确保进程在SSH断开后继续运行
            full_command = f"""
cd {script_path}
nohup bash -c '
echo $$ > {pid_file}
{command} 2>&1
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE" >> {log_file}
if [ $EXIT_CODE -eq 0 ]; then
    echo "SUCCESS: Task completed successfully" >> {log_file}
else
    echo "ERROR: Task failed with exit code $EXIT_CODE" >> {log_file}
fi
rm -f {pid_file}
' > {log_file} 2>&1 &
echo $!
"""
            
            logger.info(f"在远程设备上启动后台任务")
            logger.debug(f"执行命令: {full_command[:200]}...")
            
            # 执行命令
            stdin, stdout, stderr = ssh_client.exec_command(full_command)
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error_msg = stderr.read().decode()
                return False, None, f"启动任务失败: {error_msg}"
            
            # 获取启动的进程PID
            output = stdout.read().decode().strip()
            try:
                parent_pid = int(output.split('\n')[-1])
            except:
                parent_pid = None
            
            # 等待PID文件写入
            time.sleep(1)
            
            # 读取实际的测试进程PID
            stdin, stdout, stderr = ssh_client.exec_command(f'cat {pid_file} 2>/dev/null')
            pid_content = stdout.read().decode().strip()
            
            if pid_content.isdigit():
                actual_pid = int(pid_content)
                logger.info(f"任务启动成功，PID: {actual_pid}, 日志文件: {log_file}")
                return True, actual_pid, f"任务已启动，PID: {actual_pid}"
            else:
                # PID文件不存在，可能是启动失败
                # 检查日志文件
                stdin, stdout, stderr = ssh_client.exec_command(f'cat {log_file} 2>/dev/null')
                log_content = stdout.read().decode()
                
                if log_content:
                    return False, None, f"启动失败: {log_content[:200]}"
                else:
                    return False, None, "启动失败，无法获取PID"
            
        except Exception as e:
            logger.error(f"后台执行任务时出错: {e}")
            return False, None, str(e)
    
    @staticmethod
    def kill_process(ssh_client: paramiko.SSHClient, pid: int) -> bool:
        """
        杀死远程进程
        
        Args:
            ssh_client: SSH客户端
            pid: 进程ID
            
        Returns:
            bool: 是否成功
        """
        try:
            stdin, stdout, stderr = ssh_client.exec_command(f'kill -TERM {pid} 2>/dev/null; sleep 2; kill -KILL {pid} 2>/dev/null; echo "done"')
            return True
        except Exception as e:
            logger.error(f"杀死进程 {pid} 失败: {e}")
            return False


# 全局监控器实例
task_monitor = TaskExecutionMonitor()


def get_task_monitor() -> TaskExecutionMonitor:
    """获取全局任务监控器实例"""
    return task_monitor
