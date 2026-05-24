import subprocess
import sys

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"],
    cwd="backend",
    stdout=open("backend/backend.log", "a"),
    stderr=subprocess.STDOUT,
    start_new_session=True
)
print("Started server with PID:", proc.pid)
