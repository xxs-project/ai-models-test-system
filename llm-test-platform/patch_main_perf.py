import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

patch_code = """
            logger.info(f"[OK] 脚本路径存在: {script_path}")

            # ----- ADDED CODE: 拷贝 perf_test 目录到远端 -----
            import os
            local_perf_test_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'perf_test')
            if os.path.exists(local_perf_test_dir):
                logger.info(f"打包本地 perf_test 目录: {local_perf_test_dir}")
                tar_cmd = f"cd {os.path.dirname(local_perf_test_dir)} && tar -czf /tmp/perf_test.tar.gz {os.path.basename(local_perf_test_dir)}"
                os.system(tar_cmd)
                
                logger.info("通过SFTP上传 perf_test.tar.gz 到目标机器")
                sftp = ssh_client.open_sftp()
                sftp.put("/tmp/perf_test.tar.gz", f"{script_path}/perf_test.tar.gz")
                sftp.close()
                
                logger.info("在目标机器上解压 perf_test.tar.gz")
                # Add --overwrite or just extract
                stdin, stdout, stderr = ssh_client.exec_command(f"cd {script_path} && tar -xzf perf_test.tar.gz")
                err = stderr.read().decode()
                if err and "Error" in err:
                    logger.warning(f"解压可能遇到问题: {err}")
                else:
                    logger.info("解压 perf_test 完成")
            else:
                logger.warning(f"本地未找到 perf_test 目录: {local_perf_test_dir}，跳过拷贝")
            # --------------------------------------------------

            # 验证模型路径存在
"""

# replace:
#             logger.info(f"[OK] 脚本路径存在: {script_path}")
#
#             # 验证模型路径存在
old_code = """            logger.info(f"[OK] 脚本路径存在: {script_path}")

            # 验证模型路径存在"""

if old_code in content:
    content = content.replace(old_code, patch_code)
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patch applied.")
else:
    print("Old code not found.")
