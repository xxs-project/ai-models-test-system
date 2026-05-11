from fastapi.testclient import TestClient
import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))
from main import app

client = TestClient(app)

response = client.get("/api/eval/results")
print("STATUS CODE:", response.status_code)
try:
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print("Failed to decode JSON:", e)
    print("RAW CONTENT:", response.content.decode('utf-8'))
