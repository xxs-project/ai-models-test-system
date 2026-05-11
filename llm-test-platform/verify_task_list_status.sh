#!/bin/bash
# 验证任务列表状态列修复

echo "=========================================="
echo "验证任务列表状态列修复"
echo "=========================================="
echo ""

cd /home/models-test-system_v1.0/llm-test-platform

# 检查修复是否生效
echo "1. 检查任务列表表格..."

if grep -q "<TableHead>状态</TableHead>" src/pages/TaskList.tsx; then
    echo "   ✓ 状态表头已添加"
else
    echo "   ✗ 状态表头未找到"
fi

if grep -q "statusConfig\[task.status\]" src/pages/TaskList.tsx; then
    echo "   ✓ 状态显示逻辑已添加"
else
    echo "   ✗ 状态显示逻辑未找到"
fi

if grep -q "colSpan={10}" src/pages/TaskList.tsx; then
    echo "   ✓ 表格列数已更新为10列"
else
    echo "   ✗ 表格列数未正确更新"
fi

if grep -q "columns={10}" src/pages/TaskList.tsx; then
    echo "   ✓ 骨架屏列数已更新为10列"
else
    echo "   ✗ 骨架屏列数未正确更新"
fi

echo ""
echo "2. 检查测试文件..."

if [ -f "backend/tests/test_task_list_status.py" ]; then
    echo "   ✓ 任务列表状态测试文件存在"
else
    echo "   ✗ 测试文件不存在"
fi

echo ""
echo "=========================================="
echo "修复内容总结"
echo "=========================================="
echo ""
echo "问题:"
echo "  - 任务列表表格缺少状态列"
echo ""
echo "修复内容:"
echo "  1. 在TableHeader中添加<TableHead>状态</TableHead>"
echo "  2. 在TableRow中添加状态显示单元格"
echo "     - 使用Badge组件显示状态"
echo "     - 根据statusConfig配置显示不同颜色和标签"
echo "  3. 更新表格列数:"
echo "     - 表头: 9列 → 10列"
echo "     - 空数据提示: colSpan={9} → colSpan={10}"
echo "     - 骨架屏: columns={9} → columns={10}"
echo ""
echo "状态配置:"
echo "  - 0: 待执行 (bg-gray-100 text-gray-800)"
echo "  - 1: 队列中 (bg-blue-100 text-blue-800)"
echo "  - 2: 准备中 (bg-yellow-100 text-yellow-800)"
echo "  - 3: 执行中 (bg-orange-100 text-orange-800)"
echo "  - 4: 已完成 (bg-green-100 text-green-800)"
echo "  - 5: 失败 (bg-red-100 text-red-800)"
echo "  - 6: 已取消 (bg-gray-100 text-gray-800)"
echo "  - 7: 超时 (bg-red-100 text-red-800)"
echo ""
echo "测试用例:"
echo "  - test_task_list_with_status_column: 状态列存在性"
echo "  - test_task_status_values: 不同状态值"
echo "  - test_task_status_filter: 状态筛选"
echo "  - test_task_status_update: 状态更新"
echo "  - test_task_status_transition: 状态流转"
echo "  - test_status_config_complete: 配置完整性"
echo ""
echo "=========================================="
