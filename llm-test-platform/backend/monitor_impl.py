import paramiko
import time
import json
import re
import logging
from models import Device
from datetime import datetime
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

def create_ssh_client(ip: str, port: int, username: str, password: str) -> Optional[paramiko.SSHClient]:
    """Create SSH client with proper error handling and security checks."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(ip, port=port, username=username, password=password, timeout=5)
        logger.info(f"SSH connection established to {ip}:{port}")
        return client
    except paramiko.AuthenticationException as e:
        logger.error(f"Authentication failed for {ip}: {e}")
        return None
    except paramiko.SSHException as e:
        logger.error(f"SSH connection failed for {ip}: {e}")
        return None
    except Exception as e:
        logger.error(f"Connection failed to {ip}: {e}")
        return None

def execute_command(client: paramiko.SSHClient, command: str) -> Tuple[str, str]:
    """Execute command on remote host with timeout and error handling."""
    try:
        logger.debug(f"Executing command: {command}")
        stdin, stdout, stderr = client.exec_command(command, timeout=5)
        out = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()
        if err:
            logger.warning(f"Command stderr: {err}")
        return out, err
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return "", str(e)

def check_device(device: Device) -> Device:
    """Check device status and accelerator information via SSH.
    
    Args:
        device: Device model to check
        
    Returns:
        Updated device with status and accelerator information
    """
    logger.info(f"Checking device: {device.ip}")
    client = create_ssh_client(device.ip, device.port, device.username, device.password)
    
    if not client:
        device.status = "Offline"
        device.error_message = "Connection failed"
        device.last_updated = datetime.now().isoformat()
        logger.warning(f"Device {device.ip} is offline")
        return device

    try:
        # 1. Check Arch
        arch, _ = execute_command(client, "uname -m")
        device.arch = arch

        # 2. Check OS
        # Try to get pretty name
        os_info, _ = execute_command(client, "grep PRETTY_NAME /etc/os-release | cut -d'=' -f2 | tr -d '\"'")
        if not os_info:
             os_info, _ = execute_command(client, "uname -sr")
        device.os_info = os_info

        # 3. Check Accelerators
        # Try NVIDIA
        nvidia_out, _ = execute_command(client, "nvidia-smi --query-gpu=name,memory.total,memory.used,temperature.gpu --format=csv,noheader")
        
        if nvidia_out:
            gpus = [line for line in nvidia_out.split('\n') if line.strip()]
            device.accelerator_count = len(gpus)
            device.idle_count = 0
            device.busy_count = 0
            device.warning_count = 0
            # Format: Name, Total, Used, Temp
            details = []
            acc_names = set()
            for gpu in gpus:
                parts = gpu.split(',')
                if len(parts) >= 4:
                    name = parts[0].strip()
                    short_name = name.replace("NVIDIA ", "").replace("GeForce ", "").replace("Tesla ", "")
                    acc_names.add(short_name)
                    
                    used_mem_str = parts[2].strip().split()[0]
                    total_mem_str = parts[1].strip().split()[0]
                    try:
                        used_mem = float(used_mem_str)
                        total_mem = float(total_mem_str)
                        # Calculate memory usage percentage
                        mem_usage_percent = (used_mem / total_mem) * 100 if total_mem > 0 else 0
                    except:
                        used_mem = 0
                        total_mem = 0
                        mem_usage_percent = 0
                    
                    temp_str = parts[3].strip().split()[0]
                    try:
                        temp = float(temp_str)
                    except:
                        temp = 0
                        
                    # 1. Determine Health/Warning
                    is_warning = False
                    status = "idle"
                    if temp > 85:
                        is_warning = True
                        device.warning_count += 1
                        status = "warning"

                    # 2. Determine Busy/Idle based on memory usage percentage
                    # 仅当不是警告/异常卡时才计入 busy/idle
                    if not is_warning:
                        if mem_usage_percent < 10: # < 10% memory usage is idle
                            device.idle_count += 1
                            status = "idle"
                        else:
                            device.busy_count += 1
                            status = "busy"
                    # 警告卡不计入 idle/busy

                    details.append({
                        "name": name,
                        "memory_total": parts[1].strip(),
                        "memory_used": parts[2].strip(),
                        "temp": parts[3].strip(),
                        "mem_usage_percent": round(mem_usage_percent, 2),
                        "status": status
                    })
            
            device.accelerator_type = ", ".join(sorted(list(acc_names)))
            # device.accelerator_status is JSON (Dict in Python)
            device.accelerator_status = {"gpus": details}
        else:
            # Try Huawei NPU - 修复解析逻辑
            npu_out, _ = execute_command(client, "npu-smi info")
            if npu_out and "command not found" not in npu_out:
                
                # 1. 尝试从整体文本中提取型号（用于类型描述）
                model_match = re.search(r'(910B2C|910B|310[A-Z0-9]*)', npu_out)
                if model_match:
                    device.accelerator_type = f"Ascend {model_match.group(1)}"
                else:
                    device.accelerator_type = "Huawei Ascend"

                # 逐行解析每个 NPU 条目，第一行包含 id/model/health/power/temp，后续行可能包含 HBM 使用率
                lines = npu_out.splitlines()
                entries = []  # list of (npu_id, model, health, temp, hbm_used, hbm_total)

                for idx, line in enumerate(lines):
                    # 匹配类似：| 0     910B2C              | OK            | 89.5        44                0    / 0             |
                    m = re.match(r"\|\s*(\d+)\s+([A-Z0-9-]+)\s*\|\s*([A-Za-z]+)\s*\|\s*([\d.]+)\s+(\d+)\b", line)
                    if m:
                        npu_id_str, model, health, power_str, temp_str = m.groups()
                        try:
                            npu_id = int(npu_id_str)
                            temp = int(temp_str)
                        except:
                            npu_id = int(npu_id_str) if npu_id_str.isdigit() else 0
                            temp = 0

                        # 在接下来的几行中查找 HBM 使用（形如 3632 / 65536 或 57356/ 65536）
                        hbm_used = 0
                        hbm_total = 0
                        candidates = []
                        # 扫描接下来的若干行，直到遇到分隔行或超过范围
                        for j in range(idx + 1, min(idx + 8, len(lines))):
                            nxt = lines[j]
                            if nxt.strip().startswith('+'):
                                break
                            matches = re.findall(r"(\d{1,6})\s*/\s*(\d{1,6})", nxt)
                            for used_s, total_s in matches:
                                try:
                                    used_i = int(used_s)
                                    total_i = int(total_s)
                                except:
                                    continue
                                # 忽略完全无效的 0/0
                                if total_i == 0:
                                    continue
                                candidates.append((used_i, total_i))

                        # 优先选择 total >= 1000 的第一个匹配，否则选择 total 最大的匹配
                        chosen = None
                        for u, t in candidates:
                            if t >= 1000:
                                chosen = (u, t)
                                break
                        if not chosen and candidates:
                            # 选 total 最大的
                            chosen = max(candidates, key=lambda x: x[1])

                        if chosen:
                            hbm_used, hbm_total = chosen

                        entries.append((npu_id, model.strip(), health.strip(), temp, hbm_used, hbm_total))

                # 统计数量
                device.accelerator_count = len(entries)

                # 先统计 warning
                device.idle_count = 0
                device.busy_count = 0
                device.warning_count = 0
                for _, _, health, _, _, _ in entries:
                    if health.lower() == 'warning' or health == 'Warning':
                        device.warning_count += 1

                # 解析进程表，判断哪些 NPU 有运行进程
                has_process_map = {}
                proc_section = False
                for line in lines:
                    # 进程表开始行通常包含 'Process id' 或 '| NPU     Chip' 等
                    if ('Process id' in line and 'Process name' in line) or (line.strip().startswith('| NPU') and 'Process' in line):
                        proc_section = True
                        continue
                    if not proc_section:
                        continue

                    # 跳过类似 "No running processes found in NPU 1" 的行
                    m_no = re.search(r'No running processes found in NPU\s*(\d+)', line)
                    if m_no:
                        # 明确标记该 NPU 无进程（可选）
                        continue

                    # 匹配进程行，例如：| 0       0                 | 1840146       | python                   | 255                     |
                    mproc = re.match(r"\|\s*(\d+)\s+", line)
                    if mproc:
                        try:
                            proc_npu = int(mproc.group(1))
                        except:
                            continue

                        # 进一步检查后续列是否包含 Process id（数字）来确认确有进程
                        cols = [c.strip() for c in line.split('|') if c.strip()]
                        # cols 示例： ['0       0', '1840146', 'python', '255']
                        if len(cols) >= 2 and re.match(r"^\d+$", cols[1].split()[0]):
                            has_process_map[proc_npu] = True

                # 构建详情并判断忙/空
                details = []
                for (npu_id, model, health, temp, hbm_used, hbm_total) in entries:
                    try:
                        hbm_usage_percent = (hbm_used / hbm_total) * 100 if hbm_total > 0 else 0
                    except:
                        hbm_usage_percent = 0

                    # 如果 health 非 OK（例如 Warning），将其视为异常卡，不计入 busy/idle
                    status = "idle"
                    if str(health).strip().lower() != 'ok':
                        status = "warning"
                    else:
                        is_busy = hbm_usage_percent >= 10
                        has_process = has_process_map.get(npu_id, False)
                        if is_busy or has_process:
                            device.busy_count += 1
                            status = "busy"
                        else:
                            device.idle_count += 1
                            status = "idle"

                    details.append({
                        "id": npu_id,
                        "name": f"Ascend {model}",
                        "model": model,
                        "health": health,
                        "temp": temp,
                        "memory_total": f"{hbm_total}",
                        "memory_used": f"{hbm_used}",
                        "hbm_total": hbm_total,
                        "hbm_used": hbm_used,
                        "hbm_usage_percent": round(hbm_usage_percent, 2),
                        "status": status
                    })

                device.accelerator_status = {"npus": details}
            else:
                device.accelerator_type = "None"
                device.accelerator_count = 0
                device.accelerator_status = {"status": "No accelerators found"}

        device.status = "Online"
        device.error_message = None
        logger.info(f"Device {device.ip} is online with {device.accelerator_count} accelerators")
        
    except Exception as e:
        device.status = "Error"
        device.error_message = str(e)
        logger.error(f"Error checking device {device.ip}: {e}")
    finally:
        try:
            client.close()
        except Exception as e:
            logger.warning(f"Error closing SSH connection to {device.ip}: {e}")
        device.last_updated = datetime.now().isoformat()
    
    return device
