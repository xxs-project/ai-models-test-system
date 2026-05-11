import sys
import os
import requests
import time
from threading import Thread
import uvicorn
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Adjust path to import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app

def check_frontend_config():
    print("Checking frontend configuration...")
    api_ts_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src/lib/api.ts')
    with open(api_ts_path, 'r') as f:
        content = f.read()
    
    if "baseURL: '/api'" in content:
        print("FAIL: src/lib/api.ts still contains baseURL: '/api'")
        return False
    print("PASS: src/lib/api.ts configuration fixed")
    return True

def check_backend_routes():
    print("\nChecking backend routes...")
    client = TestClient(app)
    
    # Test 1: GET /api/devices (should be empty but 200 OK)
    response = client.get("/api/devices")
    if response.status_code != 200:
        print(f"FAIL: GET /api/devices returned {response.status_code}")
        return False
    print("PASS: GET /api/devices returned 200 OK")
    
    # Test 2: POST /api/devices
    new_device = {
        "ip": "10.0.0.1",
        "port": 22,
        "username": "test",
        "password": "password",
        "remark": "fix_verify"
    }
    response = client.post("/api/devices", json=new_device)
    if response.status_code != 200:
        print(f"FAIL: POST /api/devices returned {response.status_code}")
        print(response.json())
        return False
    print("PASS: POST /api/devices returned 200 OK")
    
    # Clean up
    device_id = response.json()['id']
    client.delete(f"/api/devices/{device_id}")
    
    return True

if __name__ == "__main__":
    success = True
    if not check_frontend_config():
        success = False
    if not check_backend_routes():
        success = False
        
    if success:
        print("\nAll verification checks PASSED")
        sys.exit(0)
    else:
        print("\nVerification FAILED")
        sys.exit(1)
