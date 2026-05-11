import sqlite3
import os

db_path = 'backend/database.db'

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"--- Task Analysis for IDs 12 and 13 ---")
    
    # Get Tasks
    query = "SELECT id, task_name, status, error_message, created_at, updated_at, script_path, model_path, inference_framework, framework_version, device_id FROM task WHERE id IN (12, 13)"
    cursor.execute(query)
    
    tasks = cursor.fetchall()
    
    device_id = None
    if tasks:
        device_id = tasks[0][10]
    
    if not tasks:
        print("No tasks found with ID 12 or 13.")
    else:
        for task in tasks:
            print(f"\nTask ID: {task[0]}")
            print(f"Name: {task[1]}")
            print(f"Status: {task[2]} (0:Pending, 1:Running, 2:Completed, 3:Failed)")
            print(f"Error Message: {task[3]}")
            print(f"Created At: {task[4]}")
            print(f"Updated At: {task[5]}")
            print(f"Script Path: {task[6]}")
            print(f"Model Path: {task[7]}")
            print(f"Framework: {task[8]}")
            print(f"Version: {task[9]}")
            print(f"Device ID: {task[10]}")

    # Get Device Info
    if device_id:
        print(f"\n--- Device Info for ID {device_id} ---")
        cursor.execute("SELECT id, ip, port, username, password FROM device WHERE id = ?", (device_id,))
        device = cursor.fetchone()
        if device:
            print(f"IP: {device[1]}")
            print(f"Port: {device[2]}")
            print(f"Username: {device[3]}")
            print(f"Password: {device[4]}")
        else:
            print("Device not found.")
            
    conn.close()

except Exception as e:
    print(f"An error occurred: {e}")
