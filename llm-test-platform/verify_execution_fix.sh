#!/bin/bash
# 验证任务执行改进修复

echo "=========================================="
echo "验证任务执行改进修复"
echo "=========================================="
echo ""

cd /home/models-test-system_v1.0/llm-test-platform

echo "1. 检查预检查API..."

if grep -q "/api/tasks/{task_id}/check" backend/main.py; then
    echo "   ✓ 预检查API端点已添加"
else
    echo "   ✗ 预检查API端点未找到"
fi

if grep -q "task_checker" backend/main.py; then
    echo "   ✓ TaskChecker集成已添加"
else
    echo "   ✗ TaskChecker集成未找到"
fi

echo ""
echo "2. 检查TaskChecker模块..."

if [ -f "backend/services/task_checker.py" ]; then
    echo "   ✓ TaskChecker模块已创建"
    
    # 检查关键方法
    if grep -q "check_device_connection" backend/services/task_checker.py; then
        echo "   ✓ check_device_connection方法存在"
    fi
    
    if grep -q "check_script_directory" backend/services/task_checker.py; then
        echo "   ✓ check_script_directory方法存在"
    fi
    
    if grep -q "check_model_path" backend/services/task_checker.py; then
        echo "   ✓ check_model_path方法存在"
    fi
    
    if grep -q "check_npu_resources" backend/services/task_checker.py; then
        echo "   ✓ check_npu_resources方法存在"
    fi
else
    echo "   ✗ TaskChecker模块不存在"
fi

echo ""
echo "3. 检查测试文件..."

if [ -f "backend/tests/test_task_execution_check.py" ]; then
    echo "   ✓ 执行检查测试文件存在"
else
    echo "   ✗ 测试文件不存在"
fi

echo ""
echo "=========================================="
echo "修复内容总结"
echo "=========================================="
echo ""
echo "问题: 任务执行阶段失败，原因不明"
echo ""
echo "改进内容:"
echo ""
echo "1. 新增预检查API (/api/tasks/{task_id}/check)"
echo "   - 在真正执行前检查设备连接"
echo "   - 检查脚本目录是否存在"
echo "   - 检查模型路径是否存在"
echo "   - 检查NPU资源是否充足"
echo "   - 返回详细的检查结果和警告信息"
echo ""
echo "2. 新增TaskChecker模块 (services/task_checker.py)"
echo "   - TaskExecutionChecker类提供各种检查方法"
echo "   - check_device_connection: 检查SSH连接"
echo "   - check_script_directory: 检查脚本目录"
echo "   - check_model_path: 检查模型路径"
echo "   - check_npu_resources: 检查NPU资源"
echo "   - preflight_check: 综合预检"
echo ""
echo "3. 改进执行API (/api/tasks/{task_id}/execute)"
echo "   - 执行前自动进行预检查"
echo "   - 预检查失败则直接返回错误，不启动后台线程"
echo "   - 将错误信息保存到任务error_message字段"
echo "   - 提高错误处理的详细程度"
echo ""
echo "4. 改进日志记录"
echo "   - 在执行流程的关键步骤添加详细日志"
echo "   - 记录设备信息、连接状态、命令构建等"
echo "   - 便于问题排查"
echo ""
echo "测试用例:"
echo "  - test_check_task_executable_success: 预检查成功"
echo "  - test_check_task_executable_ssh_failure: SSH失败"
echo "  - test_check_task_no_device: 无设备信息"
echo "  - test_execute_with_preflight_check: 执行带预检"
echo "  - test_execute_fail_preflight: 预检失败阻止执行"
echo "  - test_check_device_connection: 设备连接检查"
echo "  - test_check_script_directory: 脚本目录检查"
echo "  - test_check_model_path: 模型路径检查"
echo "  - test_execute_nonexistent_task: 执行不存在任务"
echo "  - test_execute_task_wrong_status: 执行状态错误任务"
echo ""
echo "使用方法:"
echo "  1. 创建任务后，可以调用 /api/tasks/{id}/check 预检查"
echo "  2. 预检查通过后再调用 /api/tasks/{id}/execute 执行"
echo "  3. 如果预检查失败，会返回具体的错误原因"
echo ""
echo "=========================================="
