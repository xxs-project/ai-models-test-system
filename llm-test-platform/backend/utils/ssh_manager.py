"""
SSH连接管理模块

提供SSH连接池管理和连接复用功能
"""

import paramiko
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class SSHConnection:
    """SSH连接封装类"""
    
    def __init__(self, client: paramiko.SSHClient, host: str, port: int, 
                 username: str, password: str, created_at: datetime):
        self.client = client
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.created_at = created_at
        self.last_used = datetime.now()
        self.is_active = True
    
    def is_expired(self, timeout_seconds: int = 300) -> bool:
        """检查连接是否过期"""
        return (datetime.now() - self.last_used).total_seconds() > timeout_seconds
    
    def is_alive(self) -> bool:
        """检查连接是否仍然存活"""
        if not self.is_active or not self.client:
            return False
        try:
            # 通过发送一个简单的命令检查连接状态
            transport = self.client.get_transport()
            if transport and transport.is_active():
                return True
            return False
        except Exception:
            return False
    
    def close(self):
        """关闭连接"""
        try:
            if self.client:
                self.client.close()
        except Exception as e:
            logger.warning(f"关闭SSH连接时出错: {e}")
        finally:
            self.is_active = False
            self.client = None


class SSHManager:
    """SSH连接管理器
    
    提供SSH连接的创建、复用和清理功能
    """
    
    def __init__(self, max_connections: int = 10, connection_timeout: int = 300):
        """
        初始化SSH管理器
        
        Args:
            max_connections: 最大连接数
            connection_timeout: 连接超时时间（秒）
        """
        self.connections: Dict[str, SSHConnection] = {}
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        self._lock = None  # 线程锁，将在需要时初始化
    
    def _get_connection_key(self, host: str, port: int, username: str) -> str:
        """生成连接的唯一标识键"""
        return f"{username}@{host}:{port}"
    
    def connect(self, host: str, port: int = 22, username: str = '', 
                password: str = '', timeout: int = 30, 
                max_retries: int = 3) -> Optional[paramiko.SSHClient]:
        """
        建立SSH连接（带重试机制）
        
        Args:
            host: 主机IP
            port: SSH端口
            username: 用户名
            password: 密码
            timeout: 连接超时时间
            max_retries: 最大重试次数
            
        Returns:
            paramiko.SSHClient: SSH客户端对象，失败返回None
            
        Raises:
            ConnectionError: 连接失败时抛出
        """
        connection_key = self._get_connection_key(host, port, username)
        
        # 尝试复用现有连接
        if connection_key in self.connections:
            conn = self.connections[connection_key]
            if conn.is_alive() and not conn.is_expired(self.connection_timeout):
                conn.last_used = datetime.now()
                logger.info(f"复用现有SSH连接: {connection_key}")
                client = conn.client
                if client is not None:
                    return client
            else:
                # 连接已过期或失效，关闭并删除
                conn.close()
                del self.connections[connection_key]
        
        # 清理过期连接
        self._cleanup_expired_connections()
        
        # 检查连接数限制
        if len(self.connections) >= self.max_connections:
            self._cleanup_oldest_connections(1)
        
        # 创建新连接（带重试）
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(
                    hostname=host,
                    port=port,
                    username=username,
                    password=password,
                    timeout=timeout,
                    allow_agent=False,
                    look_for_keys=False
                )
                
                # 保存连接
                conn = SSHConnection(
                    client=client,
                    host=host,
                    port=port,
                    username=username,
                    password=password,
                    created_at=datetime.now()
                )
                self.connections[connection_key] = conn
                
                logger.info(f"成功创建SSH连接: {connection_key} (尝试 {attempt}/{max_retries})")
                return client
                
            except paramiko.AuthenticationException as e:
                last_error = e
                logger.error(f"SSH认证失败 [{connection_key}] (尝试 {attempt}/{max_retries}): {e}")
                raise ConnectionError(f"SSH认证失败: {e}")
            except Exception as e:
                last_error = e
                logger.warning(f"SSH连接失败 [{connection_key}] (尝试 {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    import time
                    time.sleep(1)  # 重试前等待1秒
                continue
        
        raise ConnectionError(f"SSH连接失败，已重试 {max_retries} 次: {last_error}")
    
    def execute_command(self, client: paramiko.SSHClient, command: str, 
                       timeout: int = 300) -> tuple:
        """
        在SSH连接上执行命令
        
        Args:
            client: SSH客户端
            command: 要执行的命令
            timeout: 命令执行超时时间
            
        Returns:
            tuple: (exit_status, stdout, stderr)
        """
        try:
            stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
            exit_status = stdout.channel.recv_exit_status()
            
            stdout_data = stdout.read().decode('utf-8', errors='replace')
            stderr_data = stderr.read().decode('utf-8', errors='replace')
            
            return exit_status, stdout_data, stderr_data
        except Exception as e:
            logger.error(f"执行命令失败: {e}")
            raise
    
    def _cleanup_expired_connections(self):
        """清理过期连接"""
        expired_keys = []
        for key, conn in self.connections.items():
            if conn.is_expired(self.connection_timeout) or not conn.is_alive():
                expired_keys.append(key)
        
        for key in expired_keys:
            self.connections[key].close()
            del self.connections[key]
            logger.debug(f"清理过期SSH连接: {key}")
    
    def _cleanup_oldest_connections(self, count: int = 1):
        """清理最老的连接"""
        if not self.connections:
            return
        
        # 按最后使用时间排序
        sorted_connections = sorted(
            self.connections.items(),
            key=lambda x: x[1].last_used
        )
        
        # 关闭最老的连接
        for i in range(min(count, len(sorted_connections))):
            key = sorted_connections[i][0]
            self.connections[key].close()
            del self.connections[key]
            logger.debug(f"清理最老SSH连接: {key}")
    
    def close_all(self):
        """关闭所有连接"""
        for key, conn in list(self.connections.items()):
            conn.close()
            logger.debug(f"关闭SSH连接: {key}")
        self.connections.clear()
    
    def get_connection_count(self) -> int:
        """获取当前连接数"""
        return len(self.connections)
    
    def __del__(self):
        """析构时关闭所有连接"""
        try:
            self.close_all()
        except:
            pass
