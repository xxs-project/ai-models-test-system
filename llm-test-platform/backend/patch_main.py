import sys

def modify_main():
    with open("backend/main.py", "r") as f:
        content = f.read()

    new_endpoint = """
@app.get("/api/eval/logs")
async def get_eval_logs():
    import os
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_runner.log")
    if not os.path.exists(log_file):
        return {"logs": []}
    with open(log_file, "r") as f:
        lines = f.readlines()
    return {"logs": [line.strip() for line in lines]}

@app.get("/api/eval/status")
async def get_eval_status(pid: int):
    import os
    try:
        os.kill(pid, 0)
        return {"status": "running"}
    except OSError:
        return {"status": "completed"}
"""
    
    # Insert new endpoints before @app.post("/api/eval/start")
    content = content.replace('@app.post("/api/eval/start")', new_endpoint + '\n@app.post("/api/eval/start")')
    
    # Modify start_eval function
    old_start = """    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=bench_dir,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )"""
    
    new_start = """    try:
        log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_runner.log")
        with open(log_file, "w") as f:
            f.write(f"Starting evaluation with command: {' '.join(cmd)}\\n")
            
        out_file = open(log_file, "a")
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=bench_dir,
            stdout=out_file,
            stderr=out_file,
        )"""
    
    content = content.replace(old_start, new_start)
    
    with open("backend/main.py", "w") as f:
        f.write(content)

modify_main()
