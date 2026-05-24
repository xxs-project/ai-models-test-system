import requests
import json

url = "http://localhost:8001/api/benchmarks"

# Case 1: Fetch with size=1000
params = {
    "page": 1,
    "size": 1000
}

try:
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    items = data.get("items", [])
    total = data.get("total", 0)
    
    print(f"Case 1 (size=1000):")
    print(f"  Total items reported: {total}")
    print(f"  Items returned: {len(items)}")
    
    # Check if there is a discrepancy
    if len(items) != total and total <= 1000:
        print("  DISCREPANCY DETECTED!")
    else:
        print("  Count matches request.")

except Exception as e:
    print(f"Error querying API: {e}")
