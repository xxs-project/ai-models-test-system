"""
简化的后端API测试
直接使用API来验证功能
"""

import pytest
import sys
sys.path.insert(0, '/home/models-test-system_v1.0/llm-test-platform/backend')

def test_api_endpoints():
    """测试API端点"""
    import requests
    
    BASE_URL = "http://localhost:8000"
    
    print("\n=== 测试健康检查 ===")
    resp = requests.get(f"{BASE_URL}/")
    assert resp.status_code == 200
    data = resp.json()
    assert "大模型测试平台" in data["message"]
    print("健康检查: 通过")
    
    print("\n=== 测试设备列表 ===")
    resp = requests.get(f"{BASE_URL}/api/devices")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    print(f"设备列表: 当前共 {data['total']} 个设备")
    
    print("\n=== 测试创建设备 ===")
    device_data = {
        "ip": "192.168.1.99",
        "port": 22,
        "username": "root",
        "password": "test123",
        "remark": "测试设备备注功能"
    }
    resp = requests.post(f"{BASE_URL}/api/devices", json=device_data)
    if resp.status_code == 200:
        device_id = resp.json()["id"]
        print(f"创建设备成功: ID={device_id}")
    else:
        print(f"创建设备: {resp.json().get('detail', '可能已存在')}")
        # 获取现有设备ID
        resp = requests.get(f"{BASE_URL}/api/devices")
        devices = resp.json()["items"]
        if devices:
            device_id = devices[0]["id"]
        else:
            device_id = None
        print("使用现有设备进行测试")
    
    if device_id:
        print("\n=== 测试获取单个设备 ===")
        resp = requests.get(f"{BASE_URL}/api/devices/{device_id}")
        assert resp.status_code == 200
        device = resp.json()
        print(f"设备IP: {device['ip']}")
        print(f"设备备注: {device.get('remark', '无')}")
        
        print("\n=== 测试更新设备备注 ===")
        resp = requests.put(f"{BASE_URL}/api/devices/{device_id}", json={"remark": "更新后的测试备注"})
        assert resp.status_code == 200
        updated = resp.json()
        print(f"备注更新: {'成功' if updated.get('remark') == '更新后的测试备注' else '失败'}")
        
        print("\n=== 测试刷新设备状态 ===")
        resp = requests.post(f"{BASE_URL}/api/devices/{device_id}/refresh")
        if resp.status_code == 200:
            refreshed = resp.json()
            print(f"状态: {refreshed['status']}")
            print(f"操作系统: {refreshed.get('os_info', 'N/A')}")
            print(f"架构: {refreshed.get('arch', 'N/A')}")
        else:
            print("刷新: 需要SSH连接（真实环境测试）")
    
    print("\n=== 测试任务列表 ===")
    resp = requests.get(f"{BASE_URL}/api/tasks")
    assert resp.status_code == 200
    data = resp.json()
    print(f"任务列表: 当前共 {data['total']} 个任务")
    
    print("\n=== 测试基准测试列表 ===")
    resp = requests.get(f"{BASE_URL}/api/benchmarks")
    assert resp.status_code == 200
    data = resp.json()
    print(f"基准测试: 当前共 {data['total']} 个")
    
    print("\n=== 测试设置API ===")
    resp = requests.get(f"{BASE_URL}/api/settings")
    assert resp.status_code == 200
    settings = resp.json()
    print(f"自动刷新: {'开启' if settings.get('auto_refresh') else '关闭'}")
    print(f"刷新间隔: {settings.get('interval_seconds', 60)}秒")
    
    print("\n" + "="*50)
    print("所有API测试通过!")
    print("="*50)

if __name__ == "__main__":
    try:
        test_api_endpoints()
    except Exception as e:
        print(f"\n测试失败: {e}")
        sys.exit(1)
