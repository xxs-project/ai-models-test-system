import paramiko
import sys

hostname = "7.6.52.110"
username = "root"
password = "Xfusion@123"
log_files = [
    "/data/models-test/scripts/vllm_benchmark_auto/results_vllm_single_12/vllm_v0.12.0rc1/log/x86_64_start_vllm_Qwen3-1.7B_1772836273_1_npu_aclgraph.log",
    "/data/models-test/scripts/vllm_benchmark_auto/results_vllm_single_13/vllm_v0.12.0rc1/log/x86_64_start_vllm_Qwen3-32B_1772836327_4_npu_eager.log"
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password)
    
    for log_file in log_files:
        print(f"\n--- Reading log file: {log_file} (tail 100) ---")
        stdin, stdout, stderr = client.exec_command(f"tail -n 100 {log_file}")
        content = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if error:
            print(f"Error reading file: {error}")
        else:
            print(content)
            
except Exception as e:
    print(f"Connection failed: {e}")
finally:
    client.close()
