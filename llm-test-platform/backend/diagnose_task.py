#!/usr/bin/env python3
"""
诊断任务执行失败原因
"""

import sqlite3
import sys
import os

def diagnose_task(task_name_pattern=""):
    """诊断任务执行失败原因"""

    db_path = os.path.join(os.path.dirname(__file__), '..', 'database.db')

    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 查询所有任务
        if task_name_pattern:
            query = f"SELECT * FROM task WHERE task_name LIKE '%{task_name_pattern}%' ORDER BY created_at DESC"
        else:
            query = "SELECT * FROM task ORDER BY created_at DESC LIMIT 10"

        cursor.execute(query)
        rows = cursor.fetchall()

        # 获取列名
        cursor.execute("PRAGMA table_info(task)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        print("=" * 100)
        print(f"Found {len(rows)} task(s)")
        print("=" * 100)

        for row in rows:
            task_dict = dict(zip(column_names, row))

            print(f"\nTask ID: {task_dict.get('id')}")
            print(f"Task Name: {task_dict.get('task_name')}")
            print(f"Status: {task_dict.get('status')} (0=PENDING, 1=QUEUED, 2=RUNNING, 3=TESTING, 4=COMPLETED, 5=FAILED)")
            print(f"Progress: {task_dict.get('progress')}%")
            print(f"Error Message: {task_dict.get('error_message') or 'None'}")
            print(f"Start Time: {task_dict.get('start_time') or 'None'}")
            print(f"End Time: {task_dict.get('end_time') or 'None'}")
            print(f"\nDevice Info:")
            print(f"  device_id: {task_dict.get('device_id')}")
            print(f"  device_ip: {task_dict.get('device_ip') or 'None'}")
            print(f"  device_username: {task_dict.get('device_username') or 'None'}")
            print(f"  device_password: {'Exists' if task_dict.get('device_password') else 'None'}")
            print(f"\nConfiguration:")
            print(f"  model_name: {task_dict.get('model_name') or 'None'}")
            print(f"  model_path: {task_dict.get('model_path') or 'None'}")
            print(f"  inference_framework: {task_dict.get('inference_framework') or 'None'}")
            print(f"  framework_version: {task_dict.get('framework_version') or 'None'}")
            print(f"  script_path: {task_dict.get('script_path') or 'None'}")
            print(f"  npu_count: {task_dict.get('npu_count') or 1}")
            print(f"  graph_mode: {task_dict.get('graph_mode') or 'None'}")
            print(f"  execution_flag: {task_dict.get('execution_flag') or 'None'}")

            # 诊断结果
            print(f"\nDiagnostics:")

            # 检查设备信息
            if task_dict.get('device_id'):
                print(f"  [INFO] Using device from list: device_id={task_dict.get('device_id')}")
            elif task_dict.get('device_ip'):
                print(f"  [INFO] Using manual device: IP={task_dict.get('device_ip')}")
                if not task_dict.get('device_username'):
                    print(f"  [ERROR] Missing device_username")
                if not task_dict.get('device_password'):
                    print(f"  [ERROR] Missing device_password")
            else:
                print(f"  [ERROR] No device information available")

            # 检查错误信息
            error_msg = task_dict.get('error_message')
            if error_msg:
                if "SSH" in error_msg:
                    print(f"  [ERROR] SSH connection failure")
                    if "Authentication" in error_msg:
                        print(f"    Cause: Username or password incorrect")
                    elif "timeout" in error_msg.lower():
                        print(f"    Cause: Connection timeout, device unreachable")
                elif "没有可用的设备信息" in error_msg:
                    print(f"  [ERROR] No device information")
                    print(f"    Cause: Both device_id and device_ip are empty")
                elif "脚本目录" in error_msg or "script" in error_msg.lower():
                    print(f"  [ERROR] Script path issue")
                    print(f"    Cause: {error_msg}")
                else:
                    print(f"  [ERROR] Other error: {error_msg}")

    except Exception as e:
        print(f"[ERROR] Diagnostics failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    # Diagnose all tasks or specific task by name pattern
    task_pattern = sys.argv[1] if len(sys.argv) > 1 else ""
    diagnose_task(task_pattern)
