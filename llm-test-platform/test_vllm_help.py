import subprocess
try:
    res = subprocess.run(["vllm", "bench", "serve", "--help"], capture_output=True, text=True)
    print(res.stdout)
except Exception as e:
    print(e)
