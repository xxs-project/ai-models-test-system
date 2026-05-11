#!/bin/bash
# 修复数据库表结构

echo "=========================================="
echo "修复任务管理模块数据库表结构"
echo "=========================================="
echo ""

cd /home/models-test-system_v1.0/llm-test-platform/backend

# 备份旧数据库
if [ -f "database.db" ]; then
    echo "备份旧数据库..."
    mv database.db database.db.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ 已备份旧数据库"
fi

echo ""
echo "数据库将在下次启动时自动重新创建"
echo "新表结构将包含所有字段："
echo "  - npu_count (NPU数量)"
echo "  - graph_mode (图模式)"
echo "  - device_username (设备用户名)"
echo "  - device_password (设备密码)"
echo "  - script_path (脚本路径)"
echo "  - execution_flag (执行标识)"
echo ""
echo "=========================================="
echo "修复完成！请重新启动后端服务"
echo "=========================================="
