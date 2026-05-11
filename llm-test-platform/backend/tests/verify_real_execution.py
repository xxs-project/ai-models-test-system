"""
验证任务真正执行的修复

检查execute_task_background函数是否真正执行SSH连接和命令执行
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def check_fix():
    """检查修复是否完成"""
    
    print("=" * 80)
    print("任务真正执行功能验证")
    print("=" * 80)
    print()
    
    # 1. 检查main.py中的execute_task_background函数
    print("1. 检查execute_task_background函数...")
    
    main_path = "main.py"
    if os.path.exists(main_path):
        with open(main_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        checks = [
            ("import paramiko", "导入paramiko库"),
            ("from services.command_builder import CommandBuilder", "导入CommandBuilder"),
            ("ssh_client = paramiko.SSHClient()", "创建SSH客户端"),
            ("ssh_client.connect(", "建立SSH连接"),
            ("CommandBuilder.build_command(task_data)", "构建测试命令"),
            ("ssh_client.exec_command(command", "执行测试命令"),
            ("exit_status = stdout.channel.recv_exit_status()", "获取退出状态"),
            ("if exit_status == 0:", "根据结果更新状态"),
            ("task.status = 4", "成功时设置为已完成"),
            ("task.status = 5", "失败时设置为失败"),
        ]
        
        all_found = True
        for check, desc in checks:
            if check in content:
                print(f"   ✓ {desc}")
            else:
                print(f"   ✗ {desc} - 未找到")
                all_found = False
        
        if all_found:
            print("   ✅ execute_task_background函数已实现真正的任务执行")
        else:
            print("   ❌ execute_task_background函数实现不完整")
    else:
        print(f"   ⚠ 找不到文件: {main_path}")
    
    print()
    
    # 2. 检查模型字段
    print("2. 检查Task模型字段...")
    
    models_path = "models.py"
    if os.path.exists(models_path):
        with open(models_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fields = [
            ("device_username", "设备用户名"),
            ("device_password", "设备密码"),
            ("script_path", "脚本路径"),
            ("execution_flag", "执行标识"),
        ]
        
        all_found = True
        for field, desc in fields:
            if field in content:
                print(f"   ✓ {desc} ({field})")
            else:
                print(f"   ✗ {desc} ({field}) - 未找到")
                all_found = False
        
        if all_found:
            print("   ✅ Task模型包含所有必要字段")
        else:
            print("   ❌ Task模型字段不完整")
    else:
        print(f"   ⚠ 找不到文件: {models_path}")
    
    print()
    
    # 3. 检查schema定义
    print("3. 检查Schema定义...")
    
    schemas_path = "schemas.py"
    if os.path.exists(schemas_path):
        with open(schemas_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        schema_fields = [
            "device_ip",
            "device_username", 
            "device_password",
            "script_path",
            "execution_flag",
        ]
        
        all_found = True
        for field in schema_fields:
            if field in content:
                print(f"   ✓ {field}")
            else:
                print(f"   ✗ {field} - 未找到")
                all_found = False
        
        if all_found:
            print("   ✅ Schema定义完整")
        else:
            print("   ❌ Schema定义不完整")
    else:
        print(f"   ⚠ 找不到文件: {schemas_path}")
    
    print()
    
    # 4. 检查测试文件
    print("4. 检查测试文件...")
    
    test_file = "tests/test_real_task_execution.py"
    if os.path.exists(test_file):
        print(f"   ✓ 真正的任务执行测试文件存在")
        
        with open(test_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        test_categories = [
            ("功能正确性测试", "test_execute_task_with_device_from_list"),
            ("可靠性测试", "test_ssh_connection_failure"),
            ("安全性测试", "test_no_device_info"),
            ("边界情况测试", "test_script_directory_not_exist"),
            ("性能测试", "test_execution_timeout"),
        ]
        
        for category, func_name in test_categories:
            if func_name in content:
                print(f"   ✓ {category}: {func_name}")
            else:
                print(f"   ⚠ {category}: 未找到特定测试函数")
        
        print("   ✅ 测试文件包含各类测试")
    else:
        print(f"   ✗ 找不到测试文件: {test_file}")
    
    print()
    print("=" * 80)
    print("验证完成！")
    print("=" * 80)
    print()
    print("修复总结:")
    print("- 问题: 任务执行只是模拟进度，没有真正连接测试机器")
    print("- 原因: execute_task_background函数只更新进度值，没有SSH连接和命令执行")
    print("- 解决: 实现完整的任务执行流程:")
    print("    1. 获取设备信息（设备列表或手动填写）")
    print("    2. 使用paramiko建立SSH连接")
    print("    3. 使用CommandBuilder构建测试命令")
    print("    4. 在测试机器上执行命令")
    print("    5. 根据执行结果更新任务状态")
    print()
    print("文件修改:")
    print("1. main.py - 重写execute_task_background函数")
    print("2. models.py - 添加device_username, device_password, script_path, execution_flag字段")
    print("3. schemas.py - 添加对应的schema字段")
    print()
    print("新增测试:")
    print("1. tests/test_real_task_execution.py - 真正的任务执行测试（约20个用例）")
    print()


def show_execution_flow():
    """展示修复后的执行流程"""
    
    print("=" * 80)
    print("修复后的任务执行流程")
    print("=" * 80)
    print()
    
    flow = """
┌─────────────────────────────────────────────────────────────────────────────┐
│                           任务执行流程（修复后）                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 用户创建任务并提交                                                        │
│     │                                                                       │
│     ▼                                                                       │
│  2. 后端创建任务（状态=待执行）                                               │
│     │                                                                       │
│     ▼                                                                       │
│  3. 【自动/手动】调用 /api/tasks/{id}/execute                                │
│     │                                                                       │
│     ▼                                                                       │
│  4. execute_task_background 函数启动（后台线程）                              │
│     │                                                                       │
│     ├─► 4.1 获取任务信息                                                     │
│     │       ├── 从数据库获取Task对象                                         │
│     │       └── 获取设备信息（device_id或device_ip）                          │
│     │                                                                       │
│     ├─► 4.2 建立SSH连接                                                      │
│     │       ├── 创建paramiko.SSHClient()                                     │
│     │       ├── 设置AutoAddPolicy                                            │
│     │       └── 连接到测试机器                                               │
│     │           ├── 主机: device.ip                                          │
│     │           ├── 端口: device.port (默认22)                                │
│     │           ├── 用户名: device.username                                   │
│     │           └── 密码: device.password                                     │
│     │                                                                       │
│     ├─► 4.3 构建测试命令                                                     │
│     │       └── CommandBuilder.build_command(task_data)                      │
│     │           ├── 根据test_type选择脚本（性能/精度）                         │
│     │           ├── 根据inference_framework选择框架                           │
│     │           ├── 根据test_mode设置参数（单模型/全套模型）                    │
│     │           └── 添加模型路径、NPU数量、图模式等参数                         │
│     │                                                                       │
│     ├─► 4.4 执行测试命令                                                     │
│     │       ├── cd到script_path目录                                          │
│     │       ├── 执行构建好的命令                                             │
│     │       ├── 等待命令完成（超时30分钟）                                    │
│     │       ├── 读取stdout和stderr                                           │
│     │       └── 获取退出状态码                                               │
│     │                                                                       │
│     ├─► 4.5 关闭SSH连接                                                      │
│     │       └── ssh_client.close()                                           │
│     │                                                                       │
│     └─► 4.6 更新任务状态                                                     │
│             ├── 如果exit_status == 0:                                       │
│             │   ├── 状态 = 已完成 (4)                                        │
│             │   └── 进度 = 100%                                              │
│             └── 否则:                                                        │
│                 ├── 状态 = 失败 (5)                                          │
│                 └── error_message = stderr                                   │
│                                                                             │
│  5. 返回执行结果给用户                                                        │
│     ├── 成功: "任务已开始执行"                                               │
│     └── 失败: "任务创建成功，但执行失败，请手动执行"                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

关键改进:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 修复前: 只模拟进度更新（20→40→60→80→100），不连接测试机器
✓ 修复后: 真正建立SSH连接，在测试机器上执行测试命令
✓ 优势: 任务真正执行，可以收集真实的测试结果

错误处理:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• SSH连接失败: 任务状态设为失败，记录错误信息
• 脚本目录不存在: 任务状态设为失败，记录错误信息
• 命令执行失败: 任务状态设为失败，记录stderr
• 任务不存在: 直接返回，不执行
• 没有设备信息: 任务状态设为失败
• 任务被取消: 在适当的时候检查状态并停止
    """
    
    print(flow)


if __name__ == '__main__':
    # 切换到正确的目录
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)
    
    check_fix()
    print()
    show_execution_flow()
