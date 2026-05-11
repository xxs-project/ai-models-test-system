#!/usr/bin/env python3
"""
快速验证Qwen3-1.7B任务修复
"""

import sqlite3
import os

def verify_fix():
    """验证修复是否成功"""
    print("\n" + "=" * 80)
    print("QWEN3-1.7B TASK FIX VERIFICATION")
    print("=" * 80 + "\n")

    db_path = os.path.join(os.path.dirname(__file__), 'database.db')

    if not os.path.exists(db_path):
        print("[ERROR] Database file not found:", db_path)
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 检查1: 表结构
        print("CHECK 1: Database schema")
        print("-" * 80)
        cursor.execute("PRAGMA table_info(task)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        required_fields = ['device_username', 'device_password']
        missing = [f for f in required_fields if f not in column_names]

        if missing:
            print(f"[FAIL] Missing fields: {missing}")
            print("\nTo fix, run:")
            print("  python backend/fix_device_fields.py")
            return False
        else:
            print(f"[PASS] All required fields exist:")
            for f in required_fields:
                print(f"  - {f}")

        # 检查2: 任务统计
        print("\nCHECK 2: Task statistics")
        print("-" * 80)
        cursor.execute("SELECT COUNT(*) FROM task")
        total = cursor.fetchone()[0]
        print(f"Total tasks in database: {total}")

        cursor.execute("SELECT status, COUNT(*) FROM task GROUP BY status")
        status_count = cursor.fetchall()
        print("\nTasks by status:")
        status_map = {
            0: "PENDING",
            1: "QUEUED",
            2: "RUNNING",
            3: "TESTING",
            4: "COMPLETED",
            5: "FAILED"
        }
        for status, count in status_count:
            print(f"  {status_map.get(status, status)}: {count}")

        # 检查3: 手动添加设备的任务
        print("\nCHECK 3: Tasks with manual device")
        print("-" * 80)
        cursor.execute("SELECT id, task_name, device_ip, device_username FROM task WHERE device_ip IS NOT NULL AND device_id IS NULL")
        manual_tasks = cursor.fetchall()

        if manual_tasks:
            print(f"Found {len(manual_tasks)} task(s) with manual device:")
            for task in manual_tasks:
                print(f"\n  Task ID: {task[0]}")
                print(f"  Name: {task[1]}")
                print(f"  IP: {task[2]}")
                print(f"  Username: {task[3]}")
        else:
            print("[INFO] No tasks with manual device found")
            print("\nTo create a test task:")
            print("  1. Open the web interface")
            print("  2. Create a new task")
            print("  3. Select 'Manual' device mode")
            print("  4. Enter: IP=7.6.52.110, Username=root, Password=Xfusion@123")

        # 检查4: 失败任务诊断
        print("\nCHECK 4: Failed tasks analysis")
        print("-" * 80)
        cursor.execute("SELECT id, task_name, error_message FROM task WHERE status=5 ORDER BY created_at DESC LIMIT 5")
        failed_tasks = cursor.fetchall()

        if failed_tasks:
            print(f"Found {len(failed_tasks)} failed task(s):")
            for task in failed_tasks:
                print(f"\n  Task ID: {task[0]}")
                print(f"  Name: {task[1]}")
                error = task[2] or "No error message"
                print(f"  Error: {error[:100]}...")
        else:
            print("[INFO] No failed tasks found")

        conn.close()

        print("\n" + "=" * 80)
        print("VERIFICATION SUMMARY")
        print("=" * 80)
        print("[PASS] Database schema is correct")
        print(f"[INFO] Total tasks: {total}")
        print(f"[INFO] Tasks with manual device: {len(manual_tasks)}")
        print(f"[INFO] Failed tasks: {len(failed_tasks)}")

        print("\nNext steps:")
        print("1. Test SSH connection: python backend/utils/ssh_test.py")
        print("2. Create a new task from the web interface")
        print("3. Monitor execution: tail -f backend.log")

        return True

    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    success = verify_fix()
    sys.exit(0 if success else 1)
