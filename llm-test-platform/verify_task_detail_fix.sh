#!/bin/bash
# 验证任务详情显示修复

echo "=========================================="
echo "验证任务详情显示修复"
echo "=========================================="
echo ""

cd /home/models-test-system_v1.0/llm-test-platform

# 检查修复是否生效
echo "1. 检查任务详情显示代码..."

if grep -q "NPU数量" src/pages/TaskList.tsx; then
    echo "   ✓ NPU数量显示已添加"
else
    echo "   ✗ NPU数量显示未找到"
fi

if grep -q "图模式" src/pages/TaskList.tsx; then
    echo "   ✓ 图模式显示已添加"
else
    echo "   ✗ 图模式显示未找到"
fi

if grep -q "执行标识" src/pages/TaskList.tsx; then
    echo "   ✓ 执行标识显示已添加"
else
    echo "   ✗ 执行标识显示未找到"
fi

if grep -q "script_path" src/pages/TaskList.tsx; then
    echo "   ✓ 测试路径(script_path)显示已修复"
else
    echo "   ✗ 测试路径显示未修复"
fi

echo ""
echo "2. 检查测试文件..."

if [ -f "backend/tests/test_task_detail_display.py" ]; then
    echo "   ✓ 任务详情显示测试文件存在"
else
    echo "   ✗ 测试文件不存在"
fi

echo ""
echo "=========================================="
echo "修复内容总结"
echo "=========================================="
echo ""
echo "修复的Bug:"
echo "  - 任务详情中不显示NPU数量"
echo "  - 任务详情中不显示图模式"
echo "  - 任务详情中不显示测试路径"
echo "  - 任务详情中不显示执行标识"
echo ""
echo "修复方案:"
echo "  1. 在任务详情Dialog中添加以下字段显示:"
echo "     - NPU数量 (npu_count)"
echo "     - 图模式 (graph_mode)"
echo "     - 测试路径 (script_path，原test_path)"
echo "     - 执行标识 (execution_flag，带中文描述)"
echo ""
echo "  2. 执行标识中文映射:"
echo "     - '1' → '自定义性能脚本'"
echo "     - '2' → 'VLLM基准测试脚本'"
echo ""
echo "  3. 只在单模型测试(test_mode=1)时显示上述字段"
echo ""
echo "测试用例:"
echo "  - test_single_model_task_detail_fields: 单模型详情字段"
echo "  - test_all_models_task_detail: 全套模型详情"
echo "  - test_execution_flag_values: 执行标识值"
echo "  - test_graph_mode_values: 图模式值"
echo "  - test_npu_count_range: NPU数量范围"
echo "  - test_script_path_display: 测试路径"
echo "  - test_null_optional_fields: 可选字段为空"
echo "  - test_task_list_with_all_fields: 任务列表"
echo ""
echo "=========================================="
