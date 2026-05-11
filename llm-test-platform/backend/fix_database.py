"""
修复数据库表结构

添加缺失的字段到task表
"""

import sqlite3
import sys
import os

def fix_database():
    """修复数据库表结构"""
    
    db_path = "database.db"
    
    if not os.path.exists(db_path):
        print(f"数据库文件 {db_path} 不存在，将在首次启动时自动创建")
        return
    
    print("=" * 60)
    print("修复数据库表结构")
    print("=" * 60)
    print()
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查task表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='task'")
    if not cursor.fetchone():
        print("✓ task表不存在，将在首次启动时自动创建")
        conn.close()
        return
    
    # 获取现有列
    cursor.execute("PRAGMA table_info(task)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    print("现有字段:")
    for col in sorted(existing_columns):
        print(f"  - {col}")
    print()
    
    # 需要添加的字段
    new_fields = {
        'npu_count': 'INTEGER DEFAULT 1',
        'graph_mode': 'VARCHAR',
        'device_username': 'VARCHAR',
        'device_password': 'VARCHAR',
        'script_path': 'VARCHAR DEFAULT "/home/user/scripts"',
        'execution_flag': 'VARCHAR DEFAULT "1"',
    }
    
    print("需要添加的字段:")
    fields_added = 0
    for field, field_type in new_fields.items():
        if field not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE task ADD COLUMN {field} {field_type}")
                print(f"  ✓ 添加字段: {field} ({field_type})")
                fields_added += 1
            except Exception as e:
                print(f"  ✗ 添加字段 {field} 失败: {e}")
        else:
            print(f"  ✓ 字段已存在: {field}")
    
    conn.commit()
    conn.close()
    
    print()
    print("=" * 60)
    if fields_added > 0:
        print(f"✓ 成功添加 {fields_added} 个新字段")
    else:
        print("✓ 所有字段已存在，无需修改")
    print("=" * 60)


if __name__ == '__main__':
    os.chdir('/home/models-test-system_v1.0/llm-test-platform/backend')
    fix_database()
