"""
大模型测试平台 - 工具模块
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.ssh_manager import SSHManager

__all__ = ['SSHManager']
