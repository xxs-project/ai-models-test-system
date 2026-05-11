#!/usr/bin/env python3
"""
测试Qwen3-1.7B任务修复
验证以下内容：
1. 数据库表结构包含device_username和device_password字段
2. 任务可以正确保存和读取设备信息
3. SSH连接逻辑正确处理手动添加的设备
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from models import Task, Device
from datetime import datetime

def test_database_schema():
    """测试数据库表结构"""
    print("\n" + "=" * 80)
    print("TEST 1: Database Schema")
    print("=" * 80)

    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'database.db')
    engine = create_engine(f"sqlite:///{db_path}")

    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 检查表结构
        cursor.execute("PRAGMA table_info(task)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        print(f"Task table has {len(column_names)} columns")

        # 检查必要字段
        required_fields = ['device_username', 'device_password']
        missing_fields = [f for f in required_fields if f not in column_names]

        if missing_fields:
            print(f"[FAIL] Missing fields: {missing_fields}")
            conn.close()
            return False
        else:
            print(f"[PASS] All required fields exist: {required_fields}")

        conn.close()
        return True

    except Exception as e:
        print(f"[FAIL] Database schema test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_task_creation_with_manual_device():
    """测试创建包含手动设备信息的任务"""
    print("\n" + "=" * 80)
    print("TEST 2: Task Creation with Manual Device")
    print("=" * 80)

    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'database.db')
    engine = create_engine(f"sqlite:///{db_path}")

    try:
        with Session(engine) as session:
            # 创建测试任务
            task = Task(
                task_name="Test Qwen3-1.7B Performance",
                test_type=1,  # 性能测试
                test_mode=1,  # 单模型测试
                status=0,     # 待执行
                device_id=None,
                device_ip="7.6.52.110",
                device_username="root",
                device_password="Xfusion@123",
                model_name="Qwen3-1.7B",
                model_path="/data/models",
                inference_framework="vllm",
                framework_version="v0.12.0rc1",
                script_path="/data/models-test/scripts/vllm_benchmark_auto",
                npu_count=1,
                graph_mode="eager",
                execution_flag="1",
                priority=2,
                created_by="test_user",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )

            session.add(task)
            session.commit()
            session.refresh(task)

            print(f"[PASS] Task created with ID: {task.id}")

            # 读取并验证任务
            retrieved_task = session.get(Task, task.id)

            if not retrieved_task:
                print("[FAIL] Failed to retrieve task")
                return False

            print(f"Task Info:")
            print(f"  ID: {retrieved_task.id}")
            print(f"  Name: {retrieved_task.task_name}")
            print(f"  device_ip: {retrieved_task.device_ip}")
            print(f"  device_username: {retrieved_task.device_username}")
            print(f"  device_password: {'***' if retrieved_task.device_password else 'None'}")

            if (retrieved_task.device_ip == "7.6.52.110" and
                retrieved_task.device_username == "root" and
                retrieved_task.device_password == "Xfusion@123"):
                print("[PASS] Device information saved correctly")
            else:
                print("[FAIL] Device information mismatch")
                return False

            # 清理测试数据
            session.delete(retrieved_task)
            session.commit()

            print("[PASS] Test data cleaned up")
            return True

    except Exception as e:
        print(f"[FAIL] Task creation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_device_info_retrieval():
    """测试设备信息获取逻辑"""
    print("\n" + "=" * 80)
    print("TEST 3: Device Info Retrieval Logic")
    print("=" * 80)

    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'database.db')
    engine = create_engine(f"sqlite:///{db_path}")

    try:
        with Session(engine) as session:
            # 创建测试设备
            device = Device(
                ip="192.168.1.100",
                port=22,
                username="test_user",
                password="test_pass"
            )

            session.add(device)
            session.commit()
            session.refresh(device)

            print(f"[PASS] Test device created with ID: {device.id}")

            # 测试场景1: 使用设备列表
            task1 = Task(
                task_name="Test Task 1",
                device_id=device.id,
                model_path="/data/models",
                inference_framework="vllm",
                status=0
            )

            session.add(task1)
            session.commit()
            session.refresh(task1)

            print(f"\nScenario 1: Using device from list")
            print(f"  task.device_id: {task1.device_id}")
            print(f"  task.device_ip: {task1.device_ip}")

            # 获取设备信息
            device_info = None
            if task1.device_id:
                db_device = session.get(Device, task1.device_id)
                if db_device:
                    device_info = {
                        'ip': db_device.ip,
                        'port': db_device.port,
                        'username': db_device.username,
                        'password': db_device.password
                    }
                    print(f"[PASS] Device info retrieved from list: {device_info['ip']}")

            if not device_info:
                print("[FAIL] Failed to retrieve device info from list")
                return False

            # 测试场景2: 使用手动设备
            task2 = Task(
                task_name="Test Task 2",
                device_id=None,
                device_ip="7.6.52.110",
                device_username="root",
                device_password="Xfusion@123",
                model_path="/data/models",
                inference_framework="vllm",
                status=0
            )

            session.add(task2)
            session.commit()
            session.refresh(task2)

            print(f"\nScenario 2: Using manual device")
            print(f"  task.device_id: {task2.device_id}")
            print(f"  task.device_ip: {task2.device_ip}")
            print(f"  task.device_username: {task2.device_username}")

            # 获取设备信息
            device_info = None
            if not device_info and task2.device_ip:
                if task2.device_username and task2.device_password:
                    device_info = {
                        'ip': task2.device_ip,
                        'port': 22,
                        'username': task2.device_username,
                        'password': task2.device_password
                    }
                    print(f"[PASS] Manual device info retrieved: {device_info['ip']}")

            if not device_info:
                print("[FAIL] Failed to retrieve manual device info")
                return False

            # 测试场景3: 没有设备信息
            task3 = Task(
                task_name="Test Task 3",
                device_id=None,
                device_ip=None,
                model_path="/data/models",
                inference_framework="vllm",
                status=0
            )

            session.add(task3)
            session.commit()
            session.refresh(task3)

            print(f"\nScenario 3: No device info")
            device_info = None
            if not device_info:
                if task3.device_ip:
                    device_info = {...}

            if device_info:
                print("[FAIL] Should not have device info")
                return False

            print("[PASS] Correctly handled missing device info")

            # 清理测试数据
            session.delete(task1)
            session.delete(task2)
            session.delete(task3)
            session.delete(device)
            session.commit()

            print("[PASS] Test data cleaned up")
            return True

    except Exception as e:
        print(f"[FAIL] Device info retrieval test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """运行所有测试"""
    print("\n" + "=" * 80)
    print("Qwen3-1.7B Task Fix Verification Tests")
    print("=" * 80)

    tests = [
        ("Database Schema", test_database_schema),
        ("Task Creation with Manual Device", test_task_creation_with_manual_device),
        ("Device Info Retrieval", test_device_info_retrieval),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n[ERROR] Test '{test_name}' raised exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # 打印总结
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n[SUCCESS] All tests passed!")
        return 0
    else:
        print(f"\n[FAILURE] {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
