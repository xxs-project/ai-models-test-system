#!/usr/bin/env python3
"""
SSH连接测试工具
用于测试到指定设备的SSH连接是否正常
"""

import paramiko
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_ssh_connection(ip, port, username, password):
    """测试SSH连接"""
    logger.info(f"Testing SSH connection: {ip}:{port}, User: {username}")

    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        logger.info("Connecting...")
        ssh_client.connect(
            hostname=ip,
            port=port,
            username=username,
            password=password,
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        logger.info(f"[OK] SSH connection successful: {ip}:{port}")

        # Test command execution
        logger.info("Testing command: 'hostname'")
        stdin, stdout, stderr = ssh_client.exec_command('hostname')
        hostname = stdout.read().decode().strip()
        logger.info(f"[OK] Hostname: {hostname}")

        # Test script path
        script_path = "/data/models-test/scripts/vllm_benchmark_auto"
        logger.info(f"Testing script path: {script_path}")
        stdin, stdout, stderr = ssh_client.exec_command(f'test -d {script_path} && echo "exists" || echo "not_exists"')
        result = stdout.read().decode().strip()
        if result == "exists":
            logger.info(f"[OK] Script path exists")
        else:
            logger.error(f"[ERROR] Script path does not exist: {script_path}")

        # Test model path
        model_path = "/data/models"
        logger.info(f"Testing model path: {model_path}")
        stdin, stdout, stderr = ssh_client.exec_command(f'test -d {model_path} && echo "exists" || echo "not_exists"')
        result = stdout.read().decode().strip()
        if result == "exists":
            logger.info(f"[OK] Model path exists")
        else:
            logger.error(f"[ERROR] Model path does not exist: {model_path}")

        ssh_client.close()
        logger.info("All tests completed!")
        return True

    except paramiko.AuthenticationException as e:
        logger.error(f"[ERROR] SSH authentication failed: Username or password incorrect")
        logger.error(f"  Details: {e}")
        return False
    except paramiko.SSHException as e:
        logger.error(f"[ERROR] SSH connection exception: {e}")
        return False
    except Exception as e:
        logger.error(f"[ERROR] SSH connection failed: {e}")
        return False

if __name__ == "__main__":
    # Test device for Qwen3-1.7B task
    ip = "7.6.52.110"
    port = 22
    username = "root"
    password = "Xfusion@123"

    success = test_ssh_connection(ip, port, username, password)
    sys.exit(0 if success else 1)
